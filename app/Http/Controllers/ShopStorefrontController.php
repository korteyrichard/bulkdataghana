<?php

namespace App\Http\Controllers;

use App\Models\CommissionLog;
use App\Models\ResultCheckerPurchase;
use App\Models\ResultCheckerVoucher;
use App\Models\Shop;
use App\Models\ShopOrder;
use App\Models\ShopOrderItem;
use App\Models\ShopProduct;
use App\Models\ShopResultCheckerProduct;
use App\Models\Transaction;
use App\Services\MoolreSmsService;
use App\Services\ShopPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ShopStorefrontController extends Controller
{
    public function __construct(private ShopPaymentService $paymentService) {}

    public function show(string $slug)
    {
        $shop = Shop::where('slug', $slug)
            ->where('is_active', true)
            ->with(['shopProducts' => function ($q) {
                $q->where('is_active', true)->with('variant.product');
            }])
            ->firstOrFail();

        $products = $shop->shopProducts->map(fn($sp) => [
            'id'            => $sp->id,
            'name'          => $sp->variant->full_name,
            'network'       => $sp->variant->product->network,
            'selling_price' => (float) $sp->selling_price,
            'in_stock'      => $sp->variant->status === 'IN STOCK' && $sp->variant->quantity > 0,
        ]);

        $agentResultCheckers = $shop->activeResultCheckerProducts()
            ->with('resultCheckerProduct')
            ->get()
            ->filter(fn($arc) => $arc->resultCheckerProduct && $arc->resultCheckerProduct->status === 'active')
            ->map(fn($arc) => [
                'id'                        => $arc->id,
                'result_checker_product_id' => $arc->result_checker_product_id,
                'name'                      => $arc->resultCheckerProduct->display_name ?? $arc->resultCheckerProduct->name,
                'checker_type'              => $arc->resultCheckerProduct->checker_type,
                'agent_price'               => (float) $arc->agent_price,
                'in_stock'                  => $arc->resultCheckerProduct->availableVouchersCount() > 0,
            ])->values();

        return Inertia::render('Storefront/Shop', [
            'shop'             => [
                'name'            => $shop->name,
                'slug'            => $shop->slug,
                'description'     => $shop->description,
                'logo'            => $shop->logo ? asset('storage/' . $shop->logo) : null,
                'whatsapp'        => $shop->whatsapp,
                'primary_color'   => $shop->primary_color ?? '#0891b2',
                'secondary_color' => $shop->secondary_color ?? '#1d4ed8',
            ],
            'products'         => $products,
            'resultCheckers'   => $agentResultCheckers,
        ]);
    }

    public function purchaseResultCheckerFromShop(Request $request, string $slug)
    {
        $shop = Shop::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $request->validate([
            'agent_result_checker_id' => 'required|exists:shop_result_checker_products,id',
            'recipient'               => 'required|digits:10',
            'quantity'                => 'required|integer|min:1|max:30',
            'email'                   => 'required|email',
        ]);

        $arc = ShopResultCheckerProduct::where('id', $request->agent_result_checker_id)
            ->where('shop_id', $shop->id)
            ->where('is_active', true)
            ->with('resultCheckerProduct')
            ->firstOrFail();

        $product  = $arc->resultCheckerProduct;
        $quantity = (int) $request->quantity;
        $amount   = (float) $arc->agent_price * $quantity;

        $available = ResultCheckerVoucher::where('result_checker_product_id', $product->id)
            ->where('status', 'available')
            ->count();

        if ($available < $quantity) {
            return back()->withErrors(['stock' => 'Not enough vouchers in stock.']);
        }

        $reference = 'shop_rc_' . Str::random(14);

        $transaction = Transaction::create([
            'user_id'     => $shop->user_id,
            'amount'      => $amount,
            'status'      => 'pending',
            'type'        => 'order',
            'description' => 'Shop result checker: ' . ($product->display_name ?? $product->name) . ' x' . $quantity,
            'reference'   => $reference,
        ]);

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('paystack.secret_key'),
            'Content-Type'  => 'application/json',
        ])->post('https://api.paystack.co/transaction/initialize', [
            'email'        => $request->email,
            'amount'       => (int) round($amount * 100),
            'reference'    => $reference,
            'callback_url' => route('shop.storefront.callback', $slug),
            'metadata'     => [
                'type'                      => 'shop_result_checker',
                'shop_id'                   => $shop->id,
                'agent_result_checker_id'   => $arc->id,
                'result_checker_product_id' => $product->id,
                'recipient'                 => $request->recipient,
                'quantity'                  => $quantity,
                'amount'                    => $amount,
                'transaction_id'            => $transaction->id,
            ],
        ]);

        if (!$response->successful() || !$response->json('status')) {
            $transaction->update(['status' => 'failed']);
            return back()->withErrors(['message' => 'Payment initialization failed. Please try again.']);
        }

        return Inertia::location($response->json('data.authorization_url'));
    }

    public function initializePayment(Request $request, string $slug)
    {
        $shop = Shop::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $validated = $request->validate([
            'customer_email' => 'required|email|max:150',
            'items'          => 'required|array|min:1|max:10',
            'items.*.shop_product_id'   => 'required|integer|exists:shop_products,id',
            'items.*.beneficiary_number' => 'required|string|max:20',
        ]);

        try {
            $result = $this->paymentService->initializePayment(
                $shop,
                $validated['items'],
                ['email' => $validated['customer_email']]
            );

            return Inertia::location($result['authorization_url']);
        } catch (\Exception $e) {
            return back()->withErrors(['message' => $e->getMessage()]);
        }
    }

    public function handleCallback(Request $request, string $slug)
    {
        $reference = $request->query('reference');

        if (!$reference) {
            return redirect()->route('shop.storefront', $slug)->with('error', 'Invalid payment reference.');
        }

        // Handle shop result checker payment
        if (str_starts_with($reference, 'shop_rc_')) {
            try {
                $paystackResponse = Http::withHeaders([
                    'Authorization' => 'Bearer ' . config('paystack.secret_key'),
                ])->get("https://api.paystack.co/transaction/verify/{$reference}");

                if (!$paystackResponse->successful() || $paystackResponse->json('data.status') !== 'success') {
                    return redirect()->route('shop.storefront', $slug)->with('error', 'Payment verification failed.');
                }

                $meta     = $paystackResponse->json('data.metadata');
                $arc      = ShopResultCheckerProduct::with('resultCheckerProduct')->findOrFail($meta['agent_result_checker_id']);
                $product  = $arc->resultCheckerProduct;
                $quantity = (int) $meta['quantity'];
                $amount   = (float) $meta['amount'];
                $recipient = $meta['recipient'];

                DB::transaction(function () use ($arc, $product, $quantity, $amount, $recipient, $reference, $meta, $slug) {
                    $vouchers = ResultCheckerVoucher::where('result_checker_product_id', $product->id)
                        ->where('status', 'available')
                        ->lockForUpdate()
                        ->limit($quantity)
                        ->get();

                    if ($vouchers->count() < $quantity) {
                        throw new \Exception('Not enough vouchers available.');
                    }

                    $checkers = $vouchers->map(fn($v) => [
                        'serial' => $v->serial,
                        'pin'    => $v->pin,
                        'code'   => $v->code ?? ($v->serial . '-' . $v->pin),
                    ])->toArray();

                    $purchase = ResultCheckerPurchase::create([
                        'user_id'                    => $arc->shop->user_id,
                        'result_checker_product_id'  => $product->id,
                        'checker_type'               => $product->checker_type,
                        'display_name'               => $product->display_name,
                        'recipient'                  => $recipient,
                        'quantity'                   => $quantity,
                        'unit_price'                 => $arc->agent_price,
                        'total_amount'               => $amount,
                        'transaction_id'             => null,
                        'client_reference'           => $reference,
                        'status'                     => 'COMPLETED',
                        'checkers'                   => $checkers,
                        'raw_response'               => null,
                    ]);

                    ResultCheckerVoucher::whereIn('id', $vouchers->pluck('id'))
                        ->update(['status' => 'purchased', 'purchase_id' => $purchase->id]);

                    Transaction::where('id', $meta['transaction_id'])->update(['status' => 'completed']);

                    $cardLines = collect($checkers)->map(fn($c, $i) =>
                        'Card ' . ($i + 1) . ': Serial: ' . $c['serial'] . ', PIN: ' . $c['pin']
                    )->implode("\n");

                    $name = $product->display_name ?? $product->name;
                    $message = "Your {$name} Result Checker Card(s):\n{$cardLines}\nThank you for your purchase!";
                    (new MoolreSmsService())->sendSms($recipient, $message);
                });

                $name = $product->display_name ?? $product->name;
                session(['shop_rc_purchase' => [
                    'name'      => $name,
                    'quantity'  => $quantity,
                    'recipient' => $recipient,
                    'amount'    => $amount,
                ]]);

                return redirect()->route('shop.storefront.callback.success', $slug);
            } catch (\Exception $e) {
                Log::error('Shop RC purchase failed', ['error' => $e->getMessage(), 'reference' => $reference]);
                return redirect()->route('shop.storefront', $slug)->with('error', 'Purchase failed. Please contact support.');
            }
        }

        if (!str_starts_with($reference, 'store_')) {
            return redirect()->route('shop.storefront', $slug)->with('error', 'Invalid payment reference.');
        }

        try {
            $order = $this->paymentService->verifyAndFulfill($reference);

            return Inertia::render('Storefront/OrderSuccess', [
                'order' => [
                    'reference'      => $order->reference,
                    'total_amount'   => (float) $order->total_amount,
                    'items_count'    => $order->items()->count(),
                ],
                'shop_slug' => $slug,
            ]);
        } catch (\Exception $e) {
            return redirect()->route('shop.storefront', $slug)
                ->with('error', $e->getMessage());
        }
    }

    public function orderSuccess(Request $request, string $slug)
    {
        if (session()->has('shop_rc_purchase')) {
            $data = session()->pull('shop_rc_purchase');
            return Inertia::render('Storefront/OrderSuccess', [
                'order' => [
                    'id'                 => null,
                    'total'              => $data['amount'],
                    'beneficiary_number' => $data['recipient'],
                    'network'            => null,
                    'product_name'       => $data['name'],
                    'size'               => 'x' . $data['quantity'],
                    'is_result_checker'  => true,
                ],
                'shop_slug' => $slug,
            ]);
        }

        return Inertia::render('Storefront/OrderSuccess', [
            'order'     => null,
            'shop_slug' => $slug,
        ]);
    }

    public function showTrackPage(string $slug)
    {
        $shop = Shop::where('slug', $slug)->where('is_active', true)->firstOrFail();

        return Inertia::render('Storefront/TrackOrder', [
            'shop' => [
                'name'            => $shop->name,
                'slug'            => $shop->slug,
                'logo'            => $shop->logo ? asset('storage/' . $shop->logo) : null,
                'primary_color'   => $shop->primary_color ?? '#0891b2',
                'secondary_color' => $shop->secondary_color ?? '#1d4ed8',
            ],
        ]);
    }

    public function trackOrder(Request $request, string $slug)
    {
        $shop = Shop::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $validated = $request->validate([
            'beneficiary_number' => 'required|string|max:20',
            'reference'          => ['required', 'string', 'max:100', 'regex:/^store_/'],
        ], [
            'reference.regex' => 'Invalid reference. Only shop order references are accepted.',
        ]);

        $beneficiary = $validated['beneficiary_number'];
        $reference   = $validated['reference'];

        $shopData = [
            'name'            => $shop->name,
            'slug'            => $shop->slug,
            'logo'            => $shop->logo ? asset('storage/' . $shop->logo) : null,
            'primary_color'   => $shop->primary_color ?? '#0891b2',
            'secondary_color' => $shop->secondary_color ?? '#1d4ed8',
        ];

        // 1. Check if this reference exists in any order for this shop
        $orderWithRef = ShopOrder::where('shop_id', $shop->id)
            ->where('reference', $reference)
            ->with('items.shopProduct.variant.product')
            ->first();

        if ($orderWithRef) {
            // Pending = payment was initialized but never completed — treat as no order
            if ($orderWithRef->payment_status === 'pending') {
                $orderWithRef->items()->delete();
                $orderWithRef->delete();
                // Fall through to Paystack check below
            } else {
                $matchingItem = $orderWithRef->items->first(fn($i) => $i->beneficiary_number === $beneficiary);

                if ($matchingItem) {
                    return Inertia::render('Storefront/TrackOrder', [
                        'shop'         => $shopData,
                        'track_result' => [
                            'status' => 'found',
                            'order'  => [
                                'reference'          => $orderWithRef->reference,
                                'payment_status'     => $orderWithRef->payment_status,
                                'fulfillment_status' => $orderWithRef->fulfillment_status,
                                'total_amount'       => (float) $orderWithRef->total_amount,
                                'created_at'         => $orderWithRef->created_at->toDateTimeString(),
                                'items'              => $orderWithRef->items->map(fn($i) => [
                                    'product_name'       => $i->shopProduct?->variant?->full_name ?? 'N/A',
                                    'network'            => $i->shopProduct?->variant?->product?->network ?? 'N/A',
                                    'beneficiary_number' => $i->beneficiary_number,
                                    'unit_price'         => (float) $i->unit_price,
                                ])->values(),
                            ],
                        ],
                    ]);
                }

                return Inertia::render('Storefront/TrackOrder', [
                    'shop'         => $shopData,
                    'track_result' => [
                        'status'  => 'reference_used',
                        'message' => 'This reference has already been used for a different order.',
                    ],
                ]);
            }
        }

        // 2. Reference not in our DB — check Paystack
        $paystackResponse = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('paystack.secret_key'),
        ])->get("https://api.paystack.co/transaction/verify/{$reference}");

        if (!$paystackResponse->successful() || $paystackResponse->json('data.status') !== 'success') {
            return Inertia::render('Storefront/TrackOrder', [
                'shop'         => $shopData,
                'track_result' => [
                    'status'  => 'not_found',
                    'message' => 'No order found with the provided details.',
                ],
            ]);
        }

        $paidAmount = $paystackResponse->json('data.amount') / 100;

        $affordableProducts = ShopProduct::where('shop_id', $shop->id)
            ->where('is_active', true)
            ->where('selling_price', '<=', $paidAmount)
            ->with('variant.product')
            ->get()
            ->filter(fn($sp) => $sp->variant->status === 'IN STOCK' && $sp->variant->quantity > 0)
            ->map(fn($sp) => [
                'id'            => $sp->id,
                'name'          => $sp->variant->full_name,
                'network'       => $sp->variant->product->network,
                'selling_price' => (float) $sp->selling_price,
            ])->values();

        return Inertia::render('Storefront/TrackOrder', [
            'shop'         => $shopData,
            'track_result' => [
                'status'      => 'payment_exists_no_order',
                'paid_amount' => $paidAmount,
                'reference'   => $reference,
                'products'    => $affordableProducts,
            ],
        ]);
    }

    public function createOrderFromPayment(Request $request, string $slug)
    {
        $shop = Shop::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $validated = $request->validate([
            'reference'          => 'required|string|max:100',
            'beneficiary_number' => 'required|string|max:20',
            'shop_product_id'    => 'required|integer|exists:shop_products,id',
            'customer_email'     => 'required|email|max:150',
        ]);

        // Delete any stale pending order for this reference before creating a new one
        $stale = ShopOrder::where('reference', $validated['reference'])->where('payment_status', 'pending')->first();
        if ($stale) {
            $stale->items()->delete();
            $stale->delete();
        }

        // Ensure reference not already used by a completed order
        if (ShopOrder::where('reference', $validated['reference'])->exists()) {
            return back()->withErrors(['message' => 'This reference has already been used.']);
        }

        // Re-verify payment on Paystack
        $paystackResponse = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('paystack.secret_key'),
        ])->get("https://api.paystack.co/transaction/verify/{$validated['reference']}");

        if (!$paystackResponse->successful() || $paystackResponse->json('data.status') !== 'success') {
            return back()->withErrors(['message' => 'Payment verification failed.']);
        }

        $paidAmount = $paystackResponse->json('data.amount') / 100;

        $shopProduct = ShopProduct::where('id', $validated['shop_product_id'])
            ->where('shop_id', $shop->id)
            ->where('is_active', true)
            ->with('variant')
            ->firstOrFail();

        if ((float) $shopProduct->selling_price > $paidAmount) {
            return back()->withErrors(['message' => 'Selected product price exceeds the paid amount.']);
        }

        if ($shopProduct->variant->status !== 'IN STOCK' || $shopProduct->variant->quantity < 1) {
            return back()->withErrors(['message' => 'Selected product is out of stock.']);
        }

        $order = DB::transaction(function () use ($shop, $validated, $shopProduct, $paidAmount) {
            $commission = (float) $shopProduct->selling_price - (float) $shopProduct->variant->price;

            $order = ShopOrder::create([
                'shop_id'           => $shop->id,
                'reference'         => $validated['reference'],
                'customer_email'    => $validated['customer_email'],
                'total_amount'      => $shopProduct->selling_price,
                'commission_amount' => $commission,
                'payment_status'    => 'paid',
                'fulfillment_status' => 'pending',
            ]);

            ShopOrderItem::create([
                'shop_order_id'      => $order->id,
                'shop_product_id'    => $shopProduct->id,
                'beneficiary_number' => $validated['beneficiary_number'],
                'unit_price'         => $shopProduct->selling_price,
                'cost_price'         => $shopProduct->variant->price,
            ]);

            $owner = $shop->user()->lockForUpdate()->first();
            $owner->increment('commission_balance', $commission);

            CommissionLog::create([
                'user_id'     => $owner->id,
                'amount'      => $commission,
                'type'        => 'shop_order',
                'description' => 'Commission from shop order #' . $order->id . ' (existing payment)',
                'source_type' => ShopOrder::class,
                'source_id'   => $order->id,
            ]);

            return $order;
        });

        return Inertia::render('Storefront/OrderSuccess', [
            'order' => [
                'reference'    => $order->reference,
                'total_amount' => (float) $order->total_amount,
                'items_count'  => 1,
            ],
            'shop_slug' => $slug,
        ]);
    }
}
