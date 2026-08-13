<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class UniBundleGHService
{
    private string $baseUrl;
    private string $signatureBase;
    private string $apiKey;
    private string $apiSecret;

    public function __construct()
    {
        $this->baseUrl       = config('services.unibundlegh.base_url');
        $this->signatureBase = config('services.unibundlegh.signature_base');
        $this->apiKey        = config('services.unibundlegh.api_key', '');
        $this->apiSecret     = config('services.unibundlegh.api_secret', '');
    }

    /**
     * Pre-check a single MTN beneficiary number (GET, no signature required).
     */
    public function checkBeneficiary(string $phone): array
    {
        $normalized = $this->formatPhone($phone);

        $response = Http::withHeaders([
            'X-API-Key' => $this->apiKey,
            'Accept'    => 'application/json',
        ])->timeout(15)->get($this->baseUrl . '/beneficiaries/check', [
            'number' => $normalized,
        ]);

        Log::info('UniBundleGH beneficiary check', [
            'phone'       => $normalized,
            'status_code' => $response->status(),
            'response'    => $response->json(),
        ]);

        return [
            'status'   => $response->status(),
            'body'     => $response->json(),
            'ok'       => $response->successful(),
        ];
    }

    /**
     * Submit a bulk data order (POST, HMAC-signed).
     *
     * @param  array  $orders  Each item: ['_beneficiary_number', 'network', '_data_size']
     */
    public function createBulkOrder(array $orders): array
    {
        $payload  = ['orders' => $orders];
        $response = $this->makeSignedPost('/orders/create', $payload);
        $body     = $response->json();

        Log::info('UniBundleGH bulk order', [
            'status_code' => $response->status(),
            'response'    => $body,
        ]);

        return [
            'status' => $response->status(),
            'body'   => $body,
            'ok'     => $response->successful() && ($body['success'] ?? false) === true,
        ];
    }

    /**
     * Push a shop order to UniBundleGH.
     */
    public function pushShopOrderToApi(\App\Models\ShopOrder $shopOrder): void
    {
        $items = $shopOrder->items()->with('shopProduct.variant.product')->get();

        foreach ($items as $item) {
            $network = $item->shopProduct?->variant?->product?->network;
            if (!$network || strtolower($network) !== 'mtn') {
                continue;
            }

            $variant  = $item->shopProduct?->variant;
            $sizeInGB = $variant && isset($variant->variant_attributes['size'])
                ? (int) filter_var($variant->variant_attributes['size'], FILTER_SANITIZE_NUMBER_INT)
                : 0;

            if (!$sizeInGB || !$item->beneficiary_number) {
                Log::warning('UniBundleGH: missing data for shop order item', ['shop_order_id' => $shopOrder->id]);
                continue;
            }

            $this->createBulkOrder([[
                '_beneficiary_number' => $this->formatPhone($item->beneficiary_number),
                'network'             => 'mtn',
                '_data_size'          => $sizeInGB,
            ]]);

            Log::info('Shop order item pushed to UniBundleGH', ['shop_order_id' => $shopOrder->id]);
        }
    }

    private function makeSignedPost(string $endpoint, array $body)
    {
        $timestamp       = (string) time();
        $jsonBody        = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $signatureString = $timestamp . 'POST' . $this->signatureBase . $endpoint . $jsonBody;
        $signature       = hash_hmac('sha256', $signatureString, $this->apiSecret);

        Log::debug('UniBundleGH signature debug', [
            'secret_length'    => strlen($this->apiSecret),
            'secret_first_5'   => substr($this->apiSecret, 0, 5),
            'signature_string' => $signatureString,
            'signature'        => $signature,
        ]);

        return Http::withHeaders([
            'X-API-Key'       => $this->apiKey,
            'X-Timestamp'     => $timestamp,
            'X-API-Signature' => $signature,
            'Accept'          => 'application/json',
            'Content-Type'    => 'application/json',
        ])->timeout(30)->withBody($jsonBody, 'application/json')->post($this->baseUrl . $endpoint);
    }

    private function formatPhone(string $phone): string
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);

        // 233XXXXXXXXX → 0XXXXXXXXX
        if (strlen($phone) === 12 && str_starts_with($phone, '233')) {
            return '0' . substr($phone, 3);
        }

        // 9-digit → prepend 0
        if (strlen($phone) === 9) {
            return '0' . $phone;
        }

        return $phone;
    }
}
