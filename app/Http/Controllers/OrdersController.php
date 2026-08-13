<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Cart;
use App\Models\ShopOrder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Services\OrderPusherService;
use App\Services\CodeCraftOrderPusherService;
use App\Services\EtopupOrderPusherService;
use App\Models\Setting;
use App\Models\Transaction;

class OrdersController extends Controller
{
    // Display a listing of the user's orders
    public function index()
    {
        $user = Auth::user();
        
        $orders = Order::with(['products' => function($query) {
            $query->withPivot('quantity', 'price', 'beneficiary_number', 'product_variant_id');
        }])->where('user_id', $user->id)->latest()->get();
        
        // Transform orders to include variant information
        $orders = $orders->map(function($order) {
            $order->products = $order->products->map(function($product) {
                if ($product->pivot->product_variant_id) {
                    $variant = \App\Models\ProductVariant::find($product->pivot->product_variant_id);
                    if ($variant && isset($variant->variant_attributes['size'])) {
                        $product->size = strtoupper($variant->variant_attributes['size']);
                    }
                }
                return $product;
            });
            return $order;
        });
        
        // Calculate dashboard stats
        $totalSales = \App\Models\Transaction::where('user_id', $user->id)
            ->where('status', 'completed')
            ->where('type', 'order')
            ->sum('amount');
            
        $todaySales = \App\Models\Transaction::where('user_id', $user->id)
            ->where('status', 'completed')
            ->where('type', 'order')
            ->whereDate('created_at', today())
            ->sum('amount');
            
        $pendingOrdersCount = Order::where('user_id', $user->id)
            ->whereIn('status', ['pending', 'PENDING'])
            ->count();
            
        $processingOrdersCount = Order::where('user_id', $user->id)
            ->whereIn('status', ['processing', 'PROCESSING'])
            ->count();

        // Fetch shop orders for this user's shop (if any)
        $shop = $user->shop;
        $shopOrders = collect();
        if ($shop) {
            $shopOrdersQuery = ShopOrder::where('shop_id', $shop->id)->where('payment_status', 'paid');
            $totalSales += (float) $shopOrdersQuery->sum('total_amount');
            $todaySales += (float) (clone $shopOrdersQuery)->whereDate('created_at', today())->sum('total_amount');
            $pendingOrdersCount += (clone $shopOrdersQuery)->where('fulfillment_status', 'pending')->count();
            $processingOrdersCount += (clone $shopOrdersQuery)->where('fulfillment_status', 'processing')->count();

            $shopOrders = $shopOrdersQuery
                ->with('items.shopProduct.variant.product')
                ->latest()
                ->get()
                ->map(fn($so) => [
                    'id'                  => $so->id,
                    'source'              => 'shop',
                    'reference'           => $so->reference,
                    'total'               => (float) $so->total_amount,
                    'status'              => $so->fulfillment_status ?? 'pending',
                    'network'             => optional($so->items->first()?->shopProduct?->variant?->product)->network,
                    'beneficiary_number'  => $so->items->first()?->beneficiary_number,
                    'customer_email'      => $so->customer_email,
                    'created_at'          => $so->created_at,
                    'products'            => $so->items->map(fn($item) => [
                        'id'    => $item->id,
                        'name'  => $item->shopProduct?->variant?->full_name ?? 'Data Bundle',
                        'price' => (float) $item->unit_price,
                        'size'  => null,
                        'pivot' => [
                            'quantity'           => 1,
                            'price'              => (float) $item->unit_price,
                            'beneficiary_number' => $item->beneficiary_number,
                        ],
                    ])->values()->all(),
                ]);
        }

        // Normalize regular orders
        $regularOrders = $orders->map(fn($o) => array_merge($o->toArray(), [
            'source'         => 'direct',
            'customer_email' => null,
            'reference'      => null,
        ]));

        $merged = collect($regularOrders)->concat($shopOrders)
            ->sortByDesc('created_at')
            ->values();

        return Inertia::render('Dashboard/orders', [
            'orders'           => $merged,
            'totalSales'       => $totalSales ?? 0,
            'todaySales'       => $todaySales ?? 0,
            'pendingOrders'    => $pendingOrdersCount ?? 0,
            'processingOrders' => $processingOrdersCount ?? 0,
        ]);
    }

    // Handle checkout and create separate orders for each network
    public function checkout(Request $request)
    {
        Log::info('Checkout process started.');
        $user = Auth::user();

        $cartItems = Cart::where('user_id', $user->id)->with(['product', 'productVariant'])->get();
        Log::info('Cart items fetched.', ['cartItemsCount' => $cartItems->count()]);

        if ($cartItems->isEmpty()) {
            Log::warning('Cart is empty for user.', ['userId' => $user->id]);
            return redirect()->back()->with('error', 'Cart is empty');
        }

        // Calculate total by summing the price of each cart item
        $total = $cartItems->sum(function ($item) {
            return (float) ($item->price ?? ($item->productVariant->price ?? 0));
        });
        Log::info('Total calculated.', ['total' => $total, 'walletBalance' => $user->wallet_balance]);

        // Pre-check MTN beneficiary numbers if UniBundleGH is the active pusher
        $unibundleghEnabled = (bool) Setting::get('unibundlegh_order_pusher_enabled', 0);
        if ($unibundleghEnabled) {
            $unibundleghService = new \App\Services\UniBundleGHService();
            foreach ($cartItems as $item) {
                if (strtolower($item->product->network) !== 'mtn') {
                    continue;
                }
                Log::info('UniBundleGH pre-check started.', [
                    'beneficiary_number' => $item->beneficiary_number,
                    'network'            => $item->product->network,
                ]);
                $check = $unibundleghService->checkBeneficiary($item->beneficiary_number);
                Log::info('UniBundleGH pre-check result.', [
                    'beneficiary_number' => $item->beneficiary_number,
                    'status_code'        => $check['status'],
                    'response'           => $check['body'],
                    'passed'             => $check['ok'],
                ]);
                if (!$check['ok']) {
                    $reason = $check['body']['message'] ?? 'Beneficiary number not accepted.';
                    Log::warning('UniBundleGH pre-check failed. Checkout blocked.', [
                        'beneficiary_number' => $item->beneficiary_number,
                        'reason'             => $reason,
                    ]);
                    return redirect()->back()->with('error', "Number {$item->beneficiary_number} failed validation: {$reason}");
                }
            }
            Log::info('UniBundleGH pre-check passed for all MTN numbers.');
        }

        Log::info('Creating separate orders for each cart item.', ['cartItemsCount' => $cartItems->count()]);

        DB::beginTransaction();
        Log::info('Database transaction started.');
        try {
            // Lock the user row to prevent concurrent checkouts from reading the same balance
            $user = \App\Models\User::where('id', $user->id)->lockForUpdate()->first();

            // Re-check balance inside the lock
            if ($user->wallet_balance < $total) {
                DB::rollBack();
                Log::warning('Insufficient wallet balance (inside lock).', ['userId' => $user->id, 'walletBalance' => $user->wallet_balance, 'total' => $total]);
                return redirect()->back()->with('error', 'Insufficient wallet balance. Top up to proceed with the purchase.');
            }

            // Atomic decrement — prevents double-spend
            $balanceBefore = $user->wallet_balance;
            \App\Models\User::where('id', $user->id)->decrement('wallet_balance', $total);
            Log::info('Wallet balance deducted.', ['userId' => $user->id, 'deducted' => $total]);

            $createdOrders = [];

            // Create separate order for each cart item
            foreach ($cartItems as $item) {
                $itemTotal = (float) ($item->price ?? ($item->productVariant->price ?? 0));
                $network = $item->product->network;

                // Create the order for this item
                $order = Order::create([
                    'user_id' => $user->id,
                    'status' => strtolower($network) === 'ishare' ? 'completed' : 'pending',
                    'total' => $itemTotal,
                    'beneficiary_number' => $item->beneficiary_number,
                    'network' => $network,
                ]);
                Log::info('Order created for cart item.', ['orderId' => $order->id, 'network' => $network, 'total' => $itemTotal, 'beneficiaryNumber' => $item->beneficiary_number]);

                // Attach the product to the order
                $order->products()->attach($item->product_id, [
                    'quantity' => (int) ($item->quantity ?? 1),
                    'price' => $itemTotal,
                    'beneficiary_number' => $item->beneficiary_number,
                    'product_variant_id' => $item->product_variant_id,
                ]);
                Log::info('Product attached to order.', ['orderId' => $order->id, 'productId' => $item->product_id, 'beneficiaryNumber' => $item->beneficiary_number]);

                // Create a transaction record for this order
                \App\Models\Transaction::create([
                    'user_id'        => $user->id,
                    'order_id'       => $order->id,
                    'amount'         => $itemTotal,
                    'status'         => 'completed',
                    'type'           => 'order',
                    'description'    => 'Order placed for ' . $network . ' data/airtime.',
                    'balance_before' => $balanceBefore,
                    'balance_after'  => $balanceBefore - $itemTotal,
                ]);
                $balanceBefore -= $itemTotal;
                Log::info('Transaction created for order.', ['orderId' => $order->id, 'network' => $network]);

                $createdOrders[] = $order;
            }

            // Clear user's cart
            Cart::where('user_id', $user->id)->delete();
            Log::info('Cart cleared.', ['userId' => $user->id]);

            DB::commit();
            Log::info('Database transaction committed.');

            // Push orders to external APIs based on network and individual service settings
            $jaybartEnabled      = (bool) Setting::get('jaybart_order_pusher_enabled', 1);
            $codecraftEnabled    = (bool) Setting::get('codecraft_order_pusher_enabled', 1);
            $etopupEnabled       = (bool) Setting::get('etopup_order_pusher_enabled', 1);
            $unibundleghEnabled  = (bool) Setting::get('unibundlegh_order_pusher_enabled', 0);

            foreach ($createdOrders as $order) {
                try {
                    if (strtolower($order->network) === 'mtn') {
                        if ($unibundleghEnabled) {
                            $unibundleghService = new \App\Services\UniBundleGHService();
                            $variant = \App\Models\ProductVariant::find(
                                $order->products()->withPivot('product_variant_id')->first()?->pivot?->product_variant_id
                            );
                            $sizeInGB = $variant && isset($variant->variant_attributes['size'])
                                ? (int) filter_var($variant->variant_attributes['size'], FILTER_SANITIZE_NUMBER_INT)
                                : 0;
                            $check = $unibundleghService->checkBeneficiary($order->beneficiary_number);
                            Log::info('UniBundleGH pre-check before push.', [
                                'orderId'            => $order->id,
                                'beneficiary_number' => $order->beneficiary_number,
                                'status_code'        => $check['status'],
                                'response'           => $check['body'],
                                'passed'             => $check['ok'],
                            ]);
                            if (!$check['ok']) {
                                $order->update(['api_status' => 'failed']);
                                Log::warning('UniBundleGH pre-check failed. Push skipped.', [
                                    'orderId' => $order->id,
                                    'reason'  => $check['body']['message'] ?? 'Beneficiary check failed',
                                ]);
                            } else {
                                $result = $unibundleghService->createBulkOrder([[
                                    '_beneficiary_number' => $order->beneficiary_number,
                                    'network'             => 'mtn',
                                    '_data_size'          => $sizeInGB,
                                ]]);
                                $order->update(['api_status' => $result['ok'] ? 'success' : 'failed']);
                                Log::info('Order pushed to UniBundleGH API.', [
                                    'orderId'    => $order->id,
                                    'network'    => $order->network,
                                    'api_status' => $result['ok'] ? 'success' : 'failed',
                                ]);
                            }
                        } elseif ($etopupEnabled) {
                            $etopupPusher = new EtopupOrderPusherService();
                            $etopupPusher->pushOrderToApi($order);
                            Log::info('Order pushed to Etopup API', ['orderId' => $order->id, 'network' => $order->network]);
                        } elseif ($jaybartEnabled) {
                            $mtnOrderPusher = new OrderPusherService();
                            $mtnOrderPusher->pushOrderToApi($order);
                            Log::info('Order pushed to Jaybart API', ['orderId' => $order->id, 'network' => $order->network]);
                        } else {
                            Log::info('All MTN order pushers disabled', ['orderId' => $order->id]);
                        }
                    } elseif (in_array(strtolower($order->network), ['telecel', 'ishare', 'bigtime']) && $codecraftEnabled) {
                        $codeCraftOrderPusher = new CodeCraftOrderPusherService();
                        $codeCraftOrderPusher->pushOrderToApi($order);
                        Log::info('Order pushed to CodeCraft API', ['orderId' => $order->id, 'network' => $order->network]);
                    } else {
                        Log::info('Order pusher disabled for network', ['orderId' => $order->id, 'network' => $order->network]);
                    }
                } catch (\Exception $e) {
                    Log::error('Failed to push order to external API', ['orderId' => $order->id, 'network' => $order->network, 'error' => $e->getMessage()]);
                }
            }

            $orderCount = count($createdOrders);
            $successMessage = $orderCount === 1 
                ? 'Order placed successfully!' 
                : "$orderCount orders placed successfully!";

            return redirect()->route('dashboard.orders')->with('success', $successMessage);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Checkout failed during transaction.', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return redirect()->back()->with('error', 'Checkout failed: ' . $e->getMessage());
        }
    }
}