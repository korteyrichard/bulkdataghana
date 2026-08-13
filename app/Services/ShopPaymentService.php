<?php

namespace App\Services;

use App\Models\CommissionLog;
use App\Models\Shop;
use App\Models\ShopOrder;
use App\Models\ShopOrderItem;
use App\Models\ShopProduct;
use App\Models\Setting;
use App\Services\EtopupOrderPusherService;
use App\Services\CodeCraftOrderPusherService;
use App\Services\UniBundleGHService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ShopPaymentService
{
    public function initializePayment(Shop $shop, array $items, array $customer): array
    {
        // Validate and compute total server-side — never trust client amount
        $total = 0;
        $lineItems = [];

        foreach ($items as $item) {
            /** @var ShopProduct $shopProduct */
            $shopProduct = ShopProduct::where('id', $item['shop_product_id'])
                ->where('shop_id', $shop->id)
                ->where('is_active', true)
                ->with('variant')
                ->first();

            if (!$shopProduct) {
                throw new \Exception("Product not found or unavailable.");
            }

            if ($shopProduct->variant->status !== 'IN STOCK' || $shopProduct->variant->quantity < 1) {
                throw new \Exception("Product '{$shopProduct->variant->full_name}' is out of stock.");
            }

            $lineItems[] = [
                'shop_product' => $shopProduct,
                'beneficiary_number' => $item['beneficiary_number'],
                'unit_price' => $shopProduct->selling_price,   // always use DB price
                'cost_price' => $shopProduct->variant->price,
            ];

            $total += $shopProduct->selling_price;
        }

        $reference = 'store_' . Str::uuid()->toString();

        // Create a pending order BEFORE redirecting to Paystack
        // The total is computed server-side so it cannot be tampered with
        DB::transaction(function () use ($shop, $reference, $customer, $total, $lineItems, &$order) {
            $commission = collect($lineItems)->sum(fn($i) => $i['unit_price'] - $i['cost_price']);

            $order = ShopOrder::create([
                'shop_id'           => $shop->id,
                'reference'         => $reference,
                'customer_email'    => $customer['email'],
                'total_amount'      => $total,
                'commission_amount' => $commission,
                'payment_status'    => 'pending',
            ]);

            foreach ($lineItems as $line) {
                ShopOrderItem::create([
                    'shop_order_id'    => $order->id,
                    'shop_product_id'  => $line['shop_product']->id,
                    'beneficiary_number' => $line['beneficiary_number'],
                    'unit_price'       => $line['unit_price'],
                    'cost_price'       => $line['cost_price'],
                ]);
            }
        });

        // Initialize Paystack with the server-computed total
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('paystack.secret_key'),
            'Content-Type'  => 'application/json',
        ])->post('https://api.paystack.co/transaction/initialize', [
            'email'        => $customer['email'],
            'amount'       => (int) round($total * 100),
            'reference'    => $reference,
            'callback_url' => route('shop.storefront.callback', $shop->slug),
            'metadata'     => ['shop_id' => $shop->id],
        ]);

        if (!$response->successful() || !$response->json('status')) {
            // Clean up the pending order if Paystack init fails
            ShopOrder::where('reference', $reference)->delete();
            throw new \Exception('Payment initialization failed. Please try again.');
        }

        return [
            'authorization_url' => $response->json('data.authorization_url'),
            'reference'         => $reference,
        ];
    }

    public function verifyAndFulfill(string $reference): ShopOrder
    {
        $order = DB::transaction(function () use ($reference) {
            /** @var ShopOrder $order */
            $order = ShopOrder::where('reference', $reference)
                ->lockForUpdate()
                ->firstOrFail();

            if ($order->payment_status === 'paid') {
                return $order;
            }

            if ($order->payment_status === 'failed') {
                throw new \Exception('This order payment has already failed.');
            }

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . config('paystack.secret_key'),
            ])->get("https://api.paystack.co/transaction/verify/{$reference}");

            if (!$response->successful() || $response->json('data.status') !== 'success') {
                $order->update(['payment_status' => 'failed']);
                throw new \Exception('Payment verification failed.');
            }

            // Use requested_amount (pre-fee) for comparison; fall back to amount if not present
            $requestedKobo = $response->json('data.requested_amount') ?? $response->json('data.amount');
            $expectedKobo = (int) round((float) $order->total_amount * 100);

            if ($requestedKobo !== $expectedKobo) {
                Log::warning('Shop order amount mismatch on verify', [
                    'expected_kobo'  => $expectedKobo,
                    'requested_kobo' => $requestedKobo,
                    'reference'      => $reference,
                ]);
                $order->update(['payment_status' => 'failed']);
                throw new \Exception('Payment amount mismatch. Order rejected.');
            }

            $order->update([
                'payment_status'      => 'paid',
                'fulfillment_status'  => 'pending',
            ]);

            $owner = $order->shop->user()->lockForUpdate()->first();
            $owner->increment('commission_balance', $order->commission_amount);

            CommissionLog::create([
                'user_id'     => $owner->id,
                'amount'      => $order->commission_amount,
                'type'        => 'shop_order',
                'description' => 'Commission from shop order #' . $order->id,
                'source_type' => ShopOrder::class,
                'source_id'   => $order->id,
            ]);

            return $order->fresh();
        });

        // Push to order pushers outside the transaction
        $unibundleghEnabled = (bool) Setting::get('unibundlegh_order_pusher_enabled', 0);
        $etopupEnabled      = (bool) Setting::get('etopup_order_pusher_enabled', 1);
        $codecraftEnabled   = (bool) Setting::get('codecraft_order_pusher_enabled', 1);

        $freshOrder = $order->load('items.shopProduct.variant.product');
        $network    = $freshOrder->items->first()?->shopProduct?->variant?->product?->network;

        try {
            if ($network && strtolower($network) === 'mtn') {
                if ($unibundleghEnabled) {
                    (new UniBundleGHService())->pushShopOrderToApi($freshOrder);
                    Log::info('Shop order pushed to UniBundleGH', ['shop_order_id' => $freshOrder->id]);
                } elseif ($etopupEnabled) {
                    (new EtopupOrderPusherService())->pushShopOrderToApi($freshOrder);
                    Log::info('Shop order pushed to Etopup', ['shop_order_id' => $freshOrder->id]);
                } else {
                    Log::info('All MTN shop order pushers disabled', ['shop_order_id' => $freshOrder->id]);
                }
            } elseif ($network && in_array(strtolower($network), ['telecel', 'ishare', 'bigtime']) && $codecraftEnabled) {
                (new CodeCraftOrderPusherService())->pushShopOrderToApi($freshOrder);
                Log::info('Shop order pushed to CodeCraft', ['shop_order_id' => $freshOrder->id]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to push shop order to external API', ['shop_order_id' => $freshOrder->id, 'error' => $e->getMessage()]);
        }

        return $freshOrder;
    }
}
