<?php

namespace App\Services;

use App\Models\Order;
use App\Services\MoolreSmsService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OrderStatusSyncService
{
    private $codeCraftAgentEmail = 'obengcollins3034@gmail.com';
    private $mtnApiKey = '8c65e6a8156bcf6993a1f6f3ceef9433af8708fb';
    private $smsService;

    public function __construct(MoolreSmsService $smsService)
    {
        $this->smsService = $smsService;
    }

    public function syncOrderStatuses()
    {
        $processingOrders = Order::whereIn('status', ['pending', 'processing'])->get();
        
        foreach ($processingOrders as $order) {
            try {
                if (strtolower($order->network) === 'mtn') {
                    $this->syncMtnOrderStatus($order);
                } elseif (in_array(strtolower($order->network), ['telecel', 'ishare', 'bigtime'])) {
                    $this->syncCodeCraftOrderStatus($order);
                }
            } catch (\Exception $e) {
                Log::error('Failed to sync order status', ['orderId' => $order->id, 'error' => $e->getMessage()]);
            }
        }
    }

    private function syncMtnOrderStatus($order)
    {
        $referenceId = $this->extractReferenceId($order);
        
        Log::info('MTN sync attempt', [
            'order_id' => $order->id,
            'reference_id' => $referenceId,
            'order_network' => $order->network,
            'order_status' => $order->status
        ]);
        
        if (!$referenceId) {
            Log::warning('No reference ID found for MTN order', ['orderId' => $order->id]);
            return;
        }

        try {
            Log::info('Making MTN API call', [
                'order_id' => $order->id,
                'transaction_id' => $referenceId,
                'api_endpoint' => 'https://agent.jaybartservices.com/api/v1/fetch-other-network-transaction'
            ]);
            
            $response = Http::withHeaders([
                'x-api-key' => $this->mtnApiKey,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json'
            ])->timeout(20)->post('https://agent.jaybartservices.com/api/v1/fetch-other-network-transaction', [
                'transaction_id' => $referenceId
            ]);

            Log::info('MTN API response received', [
                'order_id' => $order->id,
                'status_code' => $response->status(),
                'response_body' => $response->body(),
                'is_successful' => $response->successful()
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $externalStatus = '';
                if (isset($data['order_items']) && is_array($data['order_items']) && count($data['order_items']) > 0) {
                    $externalStatus = $data['order_items'][0]['status'] ?? '';
                }
                $newStatus = $this->mapMtnStatus($externalStatus);
                
                Log::info('MTN status mapping', [
                    'order_id' => $order->id,
                    'external_status' => $externalStatus,
                    'mapped_status' => $newStatus,
                    'current_order_status' => $order->status
                ]);
                
                if ($newStatus && $newStatus !== $order->status) {
                    $updateResult = $order->update(['status' => $newStatus]);
                    Log::info('MTN order status updated', [
                        'orderId' => $order->id, 
                        'oldStatus' => $order->status, 
                        'newStatus' => $newStatus,
                        'update_successful' => $updateResult
                    ]);
                    
                    if ($newStatus === 'completed') {
                        // Load products with pivot data for SMS
                        $order->load(['products' => function($query) {
                            $query->withPivot('quantity', 'price', 'beneficiary_number', 'product_variant_id');
                        }]);
                        $this->sendCompletionSms($order);
                    }
                } else {
                    Log::info('MTN order status unchanged', [
                        'order_id' => $order->id,
                        'current_status' => $order->status,
                        'external_status' => $externalStatus,
                        'mapped_status' => $newStatus
                    ]);
                }
            } else {
                Log::warning('MTN API call unsuccessful', [
                    'order_id' => $order->id,
                    'status_code' => $response->status(),
                    'response' => $response->body()
                ]);
            }
        } catch (\Exception $e) {
            Log::error('MTN status check failed', ['orderId' => $order->id, 'error' => $e->getMessage()]);
        }
    }

    private function syncCodeCraftOrderStatus($order)
    {
        $referenceId = $this->extractReferenceId($order);
        
        Log::info('CodeCraft sync attempt', [
            'order_id' => $order->id,
            'reference_id' => $referenceId,
            'order_network' => $order->network,
            'order_status' => $order->status
        ]);
        
        if (!$referenceId) {
            Log::warning('No reference ID found for CodeCraft order', ['order_id' => $order->id]);
            return;
        }

        $endpoint = 'https://api.codecraftnetwork.com/api/response_agent.php';
        
        try {
            Log::info('Making CodeCraft API call', [
                'order_id' => $order->id,
                'reference_id' => $referenceId,
                'api_endpoint' => $endpoint
            ]);
            
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json'
            ])->timeout(20)->get($endpoint, [
                'client_email' => $this->codeCraftAgentEmail,
                'reference_id' => $referenceId
            ]);

            Log::info('CodeCraft API response received', [
                'order_id' => $order->id,
                'status_code' => $response->status(),
                'response_body' => $response->body(),
                'is_successful' => $response->successful()
            ]);

            if ($response->successful()) {
                $body = $response->body();
                
                // Check for PHP errors or HTML content
                if (str_contains($body, 'Fatal error') || str_contains($body, '<br />')) {
                    Log::error('CodeCraft API Database Error', [
                        'order_id' => $order->id,
                        'client_email' => $this->codeCraftAgentEmail,
                        'reference_id' => $referenceId,
                        'error_type' => 'Database Connection',
                        'api_endpoint' => $endpoint,
                        'response_body' => $body,
                        'support_message' => 'Please contact CodeCraft support and provide them this error log. Their database query is failing.'
                    ]);
                    return;
                }
                
                try {
                    $data = $response->json();
                    if (!isset($data['order_status'])) {
                        Log::error('CodeCraft API response missing order_status', [
                            'order_id' => $order->id,
                            'response_data' => $data
                        ]);
                        return;
                    }
                    $externalStatus = $data['order_status'];
                    $newStatus = $this->mapCodeCraftStatus($externalStatus);
                } catch (\Exception $e) {
                    Log::error('Failed to parse CodeCraft API response', [
                        'order_id' => $order->id,
                        'response_body' => $body,
                        'error' => $e->getMessage()
                    ]);
                    return;
                }
                
                Log::info('CodeCraft status mapping', [
                    'order_id' => $order->id,
                    'external_status' => $externalStatus,
                    'mapped_status' => $newStatus,
                    'current_order_status' => $order->status
                ]);
                
                if ($newStatus && $newStatus !== $order->status) {
                    $updateResult = $order->update(['status' => $newStatus]);
                    Log::info('CodeCraft order status updated', [
                        'orderId' => $order->id, 
                        'oldStatus' => $order->status, 
                        'newStatus' => $newStatus,
                        'update_successful' => $updateResult
                    ]);
                    
                    if ($newStatus === 'completed') {
                        // Load products with pivot data for SMS
                        $order->load(['products' => function($query) {
                            $query->withPivot('quantity', 'price', 'beneficiary_number', 'product_variant_id');
                        }]);
                        $this->sendCompletionSms($order);
                    }
                } else {
                    Log::info('CodeCraft order status unchanged', [
                        'order_id' => $order->id,
                        'current_status' => $order->status,
                        'external_status' => $externalStatus,
                        'mapped_status' => $newStatus
                    ]);
                }
            } else {
                Log::warning('CodeCraft API call unsuccessful', [
                    'order_id' => $order->id,
                    'status_code' => $response->status(),
                    'response' => $response->body()
                ]);
            }
        } catch (\Exception $e) {
            Log::error('CodeCraft status check failed', [
                'orderId' => $order->id, 
                'error' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString()
            ]);
        }
    }

    private function extractReferenceId($order)
    {
        return $order->reference_id;
    }

    private function mapCodeCraftStatus($externalStatus)
    {
        $statusMap = [
            'Crediting successful' => 'completed',
            'completed' => 'completed',
            'delivered' => 'completed',
            'processing' => 'processing',
            'placed' => 'processing',
            'cancelled' => 'cancelled',
            'failed' => 'cancelled'
        ];

        return $statusMap[strtolower($externalStatus)] ?? null;
    }

    private function mapMtnStatus($externalStatus)
    {
        Log::info('MTN Status mapping debug', [
            'input_status' => $externalStatus,
            'input_type' => gettype($externalStatus),
            'input_lowercased' => strtolower($externalStatus)
        ]);
        
        $statusMap = [
            'successful' => 'completed',
            'completed' => 'completed',
            'delivered' => 'completed',
            'processing' => 'processing',
            'pending' => 'processing',
            'failed' => 'cancelled',
            'cancelled' => 'cancelled'
        ];

        $lowercaseStatus = strtolower($externalStatus);
        $mappedStatus = $statusMap[$lowercaseStatus] ?? null;
        
        Log::info('MTN Status mapping result', [
            'original_status' => $externalStatus,
            'lowercase_status' => $lowercaseStatus,
            'mapped_status' => $mappedStatus,
            'available_mappings' => array_keys($statusMap)
        ]);

        return $mappedStatus;
    }

    private function sendCompletionSms($order)
    {
        try {
            $user = $order->user;
            
            foreach ($order->products as $product) {
                $size = 'N/A';
                if ($product->pivot->product_variant_id) {
                    $variant = \App\Models\ProductVariant::find($product->pivot->product_variant_id);
                    if ($variant && isset($variant->variant_attributes['size'])) {
                        $size = strtoupper($variant->variant_attributes['size']);
                    }
                }
                
                $beneficiaryNumber = $product->pivot->beneficiary_number;
                
                // Send SMS to beneficiary
                if ($beneficiaryNumber) {
                    $beneficiaryMessage = "Your Account has been credited with {$size}";
                    $this->smsService->sendSms($beneficiaryNumber, $beneficiaryMessage);
                    Log::info('Beneficiary completion SMS sent', ['order_id' => $order->id, 'phone' => $beneficiaryNumber]);
                }
                
                // Send SMS to user
                if ($user && $user->phone) {
                    $userMessage = "{$size} has been sent to {$beneficiaryNumber}";
                    $this->smsService->sendSms($user->phone, $userMessage);
                    Log::info('User completion SMS sent', ['order_id' => $order->id, 'phone' => $user->phone]);
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to send completion SMS', ['order_id' => $order->id, 'error' => $e->getMessage()]);
        }
    }
}