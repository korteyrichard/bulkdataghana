<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Services\MoolreSmsService;

class CodeCraftOrderPusherService
{
    private $apiKey = '250923062657-5W7SsC-n|SvyE-Gmsh8d-hzUFGr-ljgwAi';
    private $clientEmail = 'obengcollins3034@gmail.com';

    public function pushOrderToApi(Order $order)
    {
        Log::info('Processing order for CodeCraft API push', ['order_id' => $order->id]);

        $isEnabled = \App\Models\Setting::get('codecraft_order_pusher_enabled', 1);
        if (!$isEnabled) {
            $order->update(['api_status' => 'disabled']);
            Log::info('CodeCraft order pusher is disabled', ['order_id' => $order->id]);
            return;
        }

        $items = $order->products()->withPivot('quantity', 'price', 'beneficiary_number', 'product_variant_id')->get();
        $userName  = $order->user->name ?? 'Customer';
        $userPhone = $order->user->phone ?? null;

        $this->processItems($order->id, $items->map(fn($item) => [
            'beneficiary_number' => $item->pivot->beneficiary_number,
            'variant_id'         => $item->pivot->product_variant_id,
            'product_name'       => $item->name,
        ])->all(), $userName, $userPhone, fn($status, $refId) => $order->update(array_filter(['api_status' => $status, 'reference_id' => $refId])));
    }

    public function pushShopOrderToApi(\App\Models\ShopOrder $shopOrder): void
    {
        Log::info('Processing shop order for CodeCraft API push', ['shop_order_id' => $shopOrder->id]);

        $isEnabled = \App\Models\Setting::get('codecraft_order_pusher_enabled', 1);
        if (!$isEnabled) {
            Log::info('CodeCraft order pusher is disabled', ['shop_order_id' => $shopOrder->id]);
            return;
        }

        $items = $shopOrder->items()->with('shopProduct.variant.product')->get();

        $this->processItems($shopOrder->id, $items->map(fn($item) => [
            'beneficiary_number' => $item->beneficiary_number,
            'variant_id'         => $item->shopProduct?->variant?->id,
            'product_name'       => $item->shopProduct?->variant?->product?->name ?? '',
        ])->all(), $shopOrder->customer_name ?? 'Customer', null,
        fn($status) => $shopOrder->update(['fulfillment_status' => $status === 'success' ? 'completed' : 'pending']));
    }

    private function processItems(int $orderId, array $items, string $userName, ?string $userPhone, callable $updateStatus): void
    {
        $hasSuccessfulPush = false;
        $lastRefId = null;

        foreach ($items as $item) {
            $beneficiaryPhone = $item['beneficiary_number'];
            $variant  = \App\Models\ProductVariant::find($item['variant_id']);
            $gig      = $variant && isset($variant->variant_attributes['size'])
                ? (int) filter_var($variant->variant_attributes['size'], FILTER_SANITIZE_NUMBER_INT)
                : 0;
            $network  = $this->getNetworkFromProduct($item['product_name']);

            if (empty($beneficiaryPhone) || !$network || !$gig) {
                Log::warning('Missing required order data', ['order_id' => $orderId, 'beneficiary' => $beneficiaryPhone, 'network' => $network, 'gig' => $gig]);
                continue;
            }

            $referenceId = $this->generateReferenceId();
            $endpoint    = $this->getEndpoint($network);

            $payload = [
                'agent_api'        => $this->apiKey,
                'recipient_number' => $this->formatPhone($beneficiaryPhone),
                'gig'              => (string) $gig,
                'reference_id'     => $referenceId,
                'client_email'     => $this->clientEmail,
            ];

            if (in_array($network, ['MTN_BIGTIME', 'AT_BIGTIME'])) {
                $payload['network'] = str_replace('_BIGTIME', '', $network);
            } else {
                $payload['network']        = $network;
                $payload['customer_name']  = $userName;
                $payload['customer_tel']   = $userPhone ?? $beneficiaryPhone;
            }

            Log::info('Sending to CodeCraft API', ['endpoint' => $endpoint, 'payload' => $payload]);

            try {
                $response     = Http::timeout(30)->post($endpoint, $payload);
                $statusCode   = $response->status();
                $responseData = $response->json();

                Log::info('CodeCraft API Response', ['order_id' => $orderId, 'status_code' => $statusCode, 'response' => $responseData, 'reference_id' => $referenceId]);

                if ($statusCode == 200) {
                    $hasSuccessfulPush = true;
                    $lastRefId = $referenceId;
                    Log::info('Order sent successfully to CodeCraft', ['reference_id' => $referenceId]);
                } else {
                    Log::error('CodeCraft API Error', ['order_id' => $orderId, 'status_code' => $statusCode, 'message' => $responseData['message'] ?? 'Unknown error']);
                }
            } catch (\Exception $e) {
                Log::error('CodeCraft API Exception', ['order_id' => $orderId, 'message' => $e->getMessage()]);
            }
        }

        $updateStatus($hasSuccessfulPush ? 'success' : 'failed', $lastRefId);
    }
    
    private function formatPhone($phone)
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        if (strlen($phone) == 10 && substr($phone, 0, 1) == '0') {
            return $phone;
        }
        
        if (strlen($phone) == 9) {
            return '0' . $phone;
        }
        
        return $phone;
    }
    
    private function getNetworkFromProduct($productName)
    {
        $productName = strtolower($productName);
        
        if (stripos($productName, 'mtn') !== false) {
            return stripos($productName, 'big') !== false ? 'MTN_BIGTIME' : 'MTN';
        } elseif (stripos($productName, 'telecel') !== false) {
            return 'TELECEL';
        } elseif (stripos($productName, 'ishare') !== false) {
            return 'AT';
        } elseif (stripos($productName, 'bigtime') !== false) {
            return 'AT_BIGTIME';
        }
        
        return null;
    }
    
    private function getEndpoint($network)
    {
        if (in_array($network, ['MTN_BIGTIME', 'AT_BIGTIME'])) {
            return 'https://api.codecraftnetwork.com/api/special.php';
        }
        
        return 'https://api.codecraftnetwork.com/api/initiate.php';
    }
    
    private function generateReferenceId()
    {
        return strtoupper(Str::random(5) . '-' . Str::random(5) . '-' . Str::random(6) . '-' . Str::random(5) . '-' . rand(10000, 99999));
    }
}