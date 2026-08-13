<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EtopupOrderPusherService
{
    private string $baseUrl = 'https://reseller.etopupgh.com/api/v1';
    private string $signatureBase = '/topupgh-api/v1';
    private string $apiKey;
    private string $apiSecret;

    public function __construct()
    {
        $this->apiKey = config('services.etopup.api_key', '');
        $this->apiSecret = config('services.etopup.api_secret', '');
    }

    public function pushOrderToApi(Order $order)
    {
        Log::info('Processing order for Etopup API push', ['order_id' => $order->id]);

        $isEnabled = \App\Models\Setting::get('etopup_order_pusher_enabled', 1);
        if (!$isEnabled) {
            $order->update(['api_status' => 'disabled']);
            Log::info('Etopup order pusher is disabled', ['order_id' => $order->id]);
            return;
        }

        $items = $order->products()->withPivot('quantity', 'price', 'beneficiary_number', 'product_variant_id')->get();
        $this->processItems($order->id, $items->map(fn($item) => [
            'beneficiary_number' => $item->pivot->beneficiary_number,
            'variant_id'         => $item->pivot->product_variant_id,
            'product_name'       => $item->name,
            'quantity'           => $item->pivot->quantity,
        ])->all(), fn($status) => $order->update(['api_status' => $status]));
    }

    public function pushShopOrderToApi(\App\Models\ShopOrder $shopOrder): void
    {
        Log::info('Processing shop order for Etopup API push', ['shop_order_id' => $shopOrder->id]);

        $isEnabled = \App\Models\Setting::get('etopup_order_pusher_enabled', 1);
        if (!$isEnabled) {
            Log::info('Etopup order pusher is disabled', ['shop_order_id' => $shopOrder->id]);
            return;
        }

        $items = $shopOrder->items()->with('shopProduct.variant')->get();
        $this->processItems($shopOrder->id, $items->map(fn($item) => [
            'beneficiary_number' => $item->beneficiary_number,
            'variant_id'         => $item->shopProduct?->variant?->id,
            'product_name'       => $item->shopProduct?->variant?->product?->name ?? '',
            'quantity'           => 1,
        ])->all(), fn($status) => $shopOrder->update(['fulfillment_status' => $status === 'success' ? 'completed' : 'pending']));
    }

    private function processItems(int $orderId, array $items, callable $updateStatus): void
    {
        $hasSuccessfulPush = false;

        foreach ($items as $item) {
            $beneficiaryPhone = $item['beneficiary_number'];
            $variant = \App\Models\ProductVariant::find($item['variant_id']);
            $network = $this->getNetworkFromProduct($item['product_name']);

            if ($network !== 'MTN') {
                Log::info('Skipping non-MTN product', ['product' => $item['product_name']]);
                continue;
            }

            $sizeInGB = $variant && isset($variant->variant_attributes['size'])
                ? (int) filter_var($variant->variant_attributes['size'], FILTER_SANITIZE_NUMBER_INT)
                : 0;

            if (empty($beneficiaryPhone) || !$sizeInGB) {
                Log::warning('Missing required data for Etopup push', [
                    'order_id'    => $orderId,
                    'beneficiary' => $beneficiaryPhone,
                    'size'        => $sizeInGB,
                ]);
                continue;
            }

            $orderPayload = [
                'orders' => [[
                    'network'              => 'MTN',
                    '_beneficiary_number'  => $this->formatPhone($beneficiaryPhone),
                    '_data_size'           => $sizeInGB,
                    'quantity'             => (int) $item['quantity'],
                ]]
            ];

            try {
                $response     = $this->makeSignedPost('/orders/create', $orderPayload);
                $responseData = $response->json();

                Log::info('Etopup API Response', ['order_id' => $orderId, 'status_code' => $response->status(), 'response' => $responseData]);

                if ($response->successful() && isset($responseData['success']) && $responseData['success'] === true) {
                    $hasSuccessfulPush = true;
                    Log::info('Etopup order pushed successfully', ['order_id' => $orderId]);
                } else {
                    Log::error('Etopup API returned failure', ['order_id' => $orderId, 'response' => $responseData]);
                }
            } catch (\Exception $e) {
                Log::error('Etopup API Exception', ['order_id' => $orderId, 'message' => $e->getMessage()]);
            }
        }

        $updateStatus($hasSuccessfulPush ? 'success' : 'failed');
    }

    private function makeSignedPost(string $endpoint, array $body)
    {
        $timestamp = (string) time();
        $method = 'POST';
        $signatureEndpoint = $this->signatureBase . $endpoint;
        $jsonBody = json_encode($body);

        $signatureString = $timestamp . $method . $signatureEndpoint . $jsonBody;
        $signature = hash_hmac('sha256', $signatureString, $this->apiSecret);

        return Http::withHeaders([
            'X-API-Key' => $this->apiKey,
            'X-Timestamp' => $timestamp,
            'X-API-Signature' => $signature,
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
            'User-Agent' => 'BulkData/1.0',
        ])->timeout(30)->post($this->baseUrl . $endpoint, $body);
    }

    private function formatPhone(string $phone): string
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);

        if (strlen($phone) == 9) {
            return '0' . $phone;
        }

        return $phone;
    }

    private function getNetworkFromProduct(string $productName): ?string
    {
        return stripos($productName, 'mtn') !== false ? 'MTN' : null;
    }
}
