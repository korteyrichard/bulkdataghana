<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Order;
use App\Models\Shop;
use App\Models\ShopOrder;
use App\Models\Transaction;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Services\MoolreSmsService;

class AdminDashboardController extends Controller
{
    /**
     * Display the admin dashboard.
     */
    public function index()
    {
        $today = today();

        return Inertia::render('Admin/Dashboard', [
            'users' => User::count(),
            'products' => Product::count(),
            'orders' => Order::count() + ShopOrder::where('payment_status', 'paid')->count(),
            'transactions' => Transaction::count(),
            'todayUsers' => User::whereDate('created_at', $today)->count(),
            'todayOrders' => Order::whereDate('created_at', $today)->count()
                + ShopOrder::where('payment_status', 'paid')->whereDate('created_at', $today)->count(),
            'todayTransactions' => Transaction::whereDate('created_at', $today)->count(),
            'jaybartOrderPusherEnabled' => (bool) Setting::get('jaybart_order_pusher_enabled', 1),
            'codecraftOrderPusherEnabled' => (bool) Setting::get('codecraft_order_pusher_enabled', 1),
            'etopupOrderPusherEnabled' => (bool) Setting::get('etopup_order_pusher_enabled', 1),
            'unibundleghOrderPusherEnabled' => (bool) Setting::get('unibundlegh_order_pusher_enabled', 0),
        ]);
    }

    /**
     * Display the admin users page.
     */
    public function users(Request $request)
    {
        $users = User::query();

        // Search by email
        if ($request->has('email') && $request->input('email') !== '') {
            $users->where('email', 'like', '%' . $request->input('email') . '%');
        }

        // Search by phone
        if ($request->has('phone') && $request->input('phone') !== '') {
            $users->where('phone', 'like', '%' . $request->input('phone') . '%');
        }

        // Filter by role
        if ($request->has('role') && $request->input('role') !== '') {
            $users->where('role', $request->input('role'));
        }

        // Get user statistics
        $totalUsers = User::count();
        $customerCount = User::where('role', 'customer')->count();
        $agentCount = User::where('role', 'agent')->count();
        $adminCount = User::where('role', 'admin')->count();
        $totalWalletBalance = User::sum('wallet_balance');

        return Inertia::render('Admin/Users', [
            'users' => $users->select('id', 'name', 'email', 'phone', 'role', 'wallet_balance', 'created_at', 'updated_at')->paginate(15),
            'filterEmail' => $request->input('email', ''),
            'filterPhone' => $request->input('phone', ''),
            'filterRole' => $request->input('role', ''),
            'userStats' => [
                'total' => $totalUsers,
                'customers' => $customerCount,
                'agents' => $agentCount,
                'admins' => $adminCount,
                'totalWalletBalance' => $totalWalletBalance,
            ],
        ]);
    }

    /**
     * Display the admin products page.
     */
    public function products(Request $request)
    {
        $products = Product::with('variants');

        if ($request->has('network') && $request->input('network') !== '') {
            $products->where('network', 'like', '%' . $request->input('network') . '%');
        }

        $productsData = $products->get()->map(function ($product) {
            return [
                'id' => $product->id,
                'name' => $product->name,
                'description' => $product->description,
                'network' => $product->network,
                'product_type' => $product->product_type,
                'expiry' => $product->expiry,
                'has_variants' => $product->has_variants,
                'variants' => $product->variants,
                'price_range' => $product->getPriceRange(),
            ];
        });

        return Inertia::render('Admin/Products', [
            'products' => $productsData,
            'filterNetwork' => $request->input('network', ''),
        ]);
    }

    /**
     * Display the admin orders page.
     */
    public function orders(Request $request)
    {
        $perPage = 50;
        $page    = (int) $request->input('page', 1);

        // --- Direct orders ---
        $ordersQuery = Order::with([
            'user:id,name,email',
            'products' => fn($q) => $q->withPivot('quantity', 'price', 'beneficiary_number', 'product_variant_id')
                                      ->with(['variants' => fn($vq) => $vq->select('id', 'product_id', 'variant_attributes')]),
        ])->latest();

        if ($request->filled('network'))            $ordersQuery->where('network', 'like', '%'.$request->network.'%');
        if ($request->filled('status'))             $ordersQuery->where('status', $request->status);
        if ($request->filled('order_id'))           $ordersQuery->where('id', $request->order_id);
        if ($request->filled('beneficiary_number')) $ordersQuery->where('beneficiary_number', 'like', '%'.$request->beneficiary_number.'%');
        if ($request->filled('email'))              $ordersQuery->whereHas('user', fn($q) => $q->where('email', 'like', '%'.$request->email.'%'));
        if ($request->filled('username'))           $ordersQuery->whereHas('user', fn($q) => $q->where('name', 'like', '%'.$request->username.'%'));
        if ($request->filled('date'))               $ordersQuery->whereDate('created_at', $request->date);

        // --- Shop orders ---
        $shopOrdersQuery = ShopOrder::with(['items.shopProduct.variant.product', 'shop.user'])
            ->where('payment_status', 'paid')
            ->latest();

        if ($request->filled('network'))            $shopOrdersQuery->whereHas('items.shopProduct.variant.product', fn($q) => $q->where('network', 'like', '%'.$request->network.'%'));
        if ($request->filled('status'))             $shopOrdersQuery->where('fulfillment_status', $request->status);
        if ($request->filled('order_id'))           $shopOrdersQuery->where('id', $request->order_id);
        if ($request->filled('beneficiary_number')) $shopOrdersQuery->whereHas('items', fn($q) => $q->where('beneficiary_number', 'like', '%'.$request->beneficiary_number.'%'));
        if ($request->filled('email'))              $shopOrdersQuery->where('customer_email', 'like', '%'.$request->email.'%');
        if ($request->filled('username'))           $shopOrdersQuery->whereHas('shop.user', fn($q) => $q->where('name', 'like', '%'.$request->username.'%'));
        if ($request->filled('date'))               $shopOrdersQuery->whereDate('created_at', $request->date);

        // Count totals for pagination
        $directTotal = $ordersQuery->count();
        $shopTotal   = $shopOrdersQuery->count();
        $total       = $directTotal + $shopTotal;

        // Fetch only the IDs needed for this page from a merged, sorted ID list.
        // We do this by fetching both sets with only id+created_at, merging, sorting, slicing.
        $directIds = (clone $ordersQuery)->select('id', 'created_at', DB::raw("'direct' as source"))->get();
        $shopIds   = (clone $shopOrdersQuery)->select('id', 'created_at', DB::raw("'shop' as source"))->get();

        $pageIds = $directIds->concat($shopIds)
            ->sortByDesc('created_at')
            ->values()
            ->slice(($page - 1) * $perPage, $perPage);

        $directPageIds = $pageIds->where('source', 'direct')->pluck('id')->all();
        $shopPageIds   = $pageIds->where('source', 'shop')->pluck('id')->all();

        // Fetch full records only for this page's IDs
        $directOrders = !empty($directPageIds)
            ? Order::with([
                'user:id,name,email',
                'products' => fn($q) => $q->withPivot('quantity', 'price', 'beneficiary_number', 'product_variant_id')
                                          ->with(['variants' => fn($vq) => $vq->select('id', 'product_id', 'variant_attributes')]),
            ])->whereIn('id', $directPageIds)->get()->keyBy('id')
            : collect();

        $shopOrders = !empty($shopPageIds)
            ? ShopOrder::with(['items.shopProduct.variant.product', 'shop.user'])
                ->whereIn('id', $shopPageIds)->get()->keyBy('id')
            : collect();

        $pageItems = $pageIds->map(function ($row) use ($directOrders, $shopOrders) {
            if ($row->source === 'shop') {
                $so = $shopOrders->get($row->id);
                if (!$so) return null;
                return [
                    'id'                 => $so->id,
                    'source'             => 'shop',
                    'reference'          => $so->reference,
                    'customer_email'     => $so->customer_email,
                    'total'              => (float) $so->total_amount,
                    'status'             => $so->fulfillment_status ?? 'pending',
                    'network'            => optional($so->items->first()?->shopProduct?->variant?->product)->network,
                    'beneficiary_number' => $so->items->first()?->beneficiary_number,
                    'api_status'         => null,
                    'created_at'         => $so->created_at,
                    'user'               => $so->shop?->user
                        ? ['id' => $so->shop->user->id, 'name' => $so->shop->name, 'email' => $so->customer_email]
                        : null,
                    'products'           => $so->items->map(fn($item) => [
                        'id'    => $item->id,
                        'name'  => $item->shopProduct?->variant?->full_name ?? 'Data Bundle',
                        'price' => (float) $item->unit_price,
                        'size'  => null,
                        'pivot' => ['quantity' => 1, 'price' => (float) $item->unit_price, 'beneficiary_number' => $item->beneficiary_number],
                    ])->values()->all(),
                ];
            }

            $order = $directOrders->get($row->id);
            if (!$order) return null;
            $order->products->transform(function ($product) {
                $variantId = $product->pivot->product_variant_id;
                if ($variantId) {
                    $variant = $product->variants->firstWhere('id', $variantId);
                    if ($variant && isset($variant->variant_attributes['size'])) {
                        $product->size = strtoupper($variant->variant_attributes['size']);
                    }
                }
                return $product;
            });
            return [
                'id'                 => $order->id,
                'source'             => 'direct',
                'reference'          => null,
                'customer_email'     => null,
                'total'              => $order->total,
                'status'             => $order->status,
                'network'            => $order->network,
                'beneficiary_number' => $order->beneficiary_number,
                'api_status'         => $order->api_status ?? null,
                'created_at'         => $order->created_at,
                'user'               => $order->user
                    ? ['id' => $order->user->id, 'name' => $order->user->name, 'email' => $order->user->email]
                    : null,
                'products'           => $order->products->map(fn($p) => [
                    'id'    => $p->id,
                    'name'  => $p->name,
                    'price' => $p->price,
                    'size'  => $p->size ?? null,
                    'pivot' => [
                        'quantity'           => $p->pivot->quantity,
                        'price'              => $p->pivot->price,
                        'beneficiary_number' => $p->pivot->beneficiary_number,
                    ],
                ])->values()->all(),
            ];
        })->filter()->values();

        $paginated = new \Illuminate\Pagination\LengthAwarePaginator(
            $pageItems,
            $total,
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        $dailyTotalSales = Order::whereDate('created_at', today())->sum('total')
            + ShopOrder::where('payment_status', 'paid')->whereDate('created_at', today())->sum('total_amount');

        return Inertia::render('Admin/Orders', [
            'orders'                  => $paginated,
            'filterNetwork'           => $request->input('network', ''),
            'filterStatus'            => $request->input('status', ''),
            'searchOrderId'           => $request->input('order_id', ''),
            'searchBeneficiaryNumber' => $request->input('beneficiary_number', ''),
            'filterEmail'             => $request->input('email', ''),
            'filterUsername'          => $request->input('username', ''),
            'filterDate'              => $request->input('date', ''),
            'dailyTotalSales'         => $dailyTotalSales,
        ]);
    }

    public function shops()
    {
        $shops = Shop::with('user')
            ->withCount('shopProducts')
            ->withCount(['orders as paid_orders_count' => fn($q) => $q->where('payment_status', 'paid')])
            ->withSum(['orders as total_revenue' => fn($q) => $q->where('payment_status', 'paid')], 'total_amount')
            ->latest()
            ->get()
            ->map(function($shop) {
                $withdrawn = $shop->user
                    ? \App\Models\ShopWithdrawal::where('user_id', $shop->user->id)
                        ->where('status', 'approved')
                        ->sum('amount')
                    : 0;

                return [
                    'id'               => $shop->id,
                    'name'             => $shop->name,
                    'slug'             => $shop->slug,
                    'is_active'        => $shop->is_active,
                    'primary_color'    => $shop->primary_color,
                    'products_count'   => $shop->shop_products_count,
                    'orders_count'     => $shop->paid_orders_count,
                    'total_revenue'    => (float) ($shop->total_revenue ?? 0),
                    'available_balance'=> (float) ($shop->user?->commission_balance ?? 0),
                    'total_withdrawn'  => (float) $withdrawn,
                    'created_at'       => $shop->created_at,
                    'owner'            => $shop->user ? ['id' => $shop->user->id, 'name' => $shop->user->name, 'email' => $shop->user->email] : null,
                ];
            });

        return Inertia::render('Admin/Shops', ['shops' => $shops]);
    }

    public function toggleShop(Shop $shop)
    {
        $shop->update(['is_active' => !$shop->is_active]);
        return redirect()->back()->with('success', 'Shop status updated.');
    }

    public function updateShopOrderStatus(Request $request, ShopOrder $shopOrder)
    {
        $request->validate([
            'status' => 'required|string|in:pending,processing,completed,cancelled',
        ]);

        $oldStatus = $shopOrder->fulfillment_status;
        $shopOrder->load('shop.user');

        DB::transaction(function () use ($shopOrder, $request, $oldStatus) {
            $shopOrder->update(['fulfillment_status' => $request->status]);

            if ($request->status === 'cancelled' && $oldStatus !== 'cancelled') {
                $commissionLog = \App\Models\CommissionLog::where('source_type', ShopOrder::class)
                    ->where('source_id', $shopOrder->id)
                    ->first();

                $shopOwner = $shopOrder->shop?->user
                    ? \App\Models\User::where('id', $shopOrder->shop->user->id)->lockForUpdate()->first()
                    : null;

                if ($shopOwner) {
                    // Refund the full total amount back to shop owner's wallet
                    $refund = (float) $shopOrder->total_amount;

                    if ($refund > 0) {
                        $shopOwner->increment('wallet_balance', $refund);
                    }

                    // Reverse commission balance
                    if ($commissionLog) {
                        $shopOwner->decrement('commission_balance', $commissionLog->amount);
                        $commissionLog->delete();
                    }
                }
            }
        });

        return redirect()->back()->with('success', 'Shop order status updated successfully.');
    }

    /**
     * Delete an order.
     */
    public function deleteOrder(Order $order)
    {
        $order->delete();
        return redirect()->back()->with('success', 'Order deleted successfully.');
    }

    /**
     * Update an order's status.
     */
    public function updateOrderStatus(Request $request, Order $order)
    {
        $request->validate([
            'status' => 'required|string|in:pending,processing,completed,cancelled',
        ]);

        $oldStatus = $order->status;
        $order->update(['status' => $request->status]);

        // Handle automatic refund when order is cancelled
        if ($request->status === 'cancelled' && $oldStatus !== 'cancelled') {
            $user = $order->user;
            $refundAmount = $order->total;
            $balanceBefore = $user->wallet_balance;
            $user->increment('wallet_balance', $refundAmount);
            
            Transaction::create([
                'user_id'        => $user->id,
                'order_id'       => $order->id,
                'amount'         => $refundAmount,
                'status'         => 'completed',
                'type'           => 'refund',
                'description'    => "Refund for cancelled order #{$order->id}",
                'balance_before' => $balanceBefore,
                'balance_after'  => $balanceBefore + $refundAmount,
            ]);

            // Reverse shop commission if this order was placed via a shop
            $commissionLog = \App\Models\CommissionLog::where('source_type', Order::class)
                ->where('source_id', $order->id)
                ->first();

            if ($commissionLog) {
                $shopOwner = \App\Models\User::where('id', $commissionLog->user_id)->lockForUpdate()->first();
                if ($shopOwner) {
                    $shopOwner->decrement('commission_balance', $commissionLog->amount);
                }
                $commissionLog->delete();
            }
            
            if ($user->phone) {
                $smsService = new MoolreSmsService();
                $message = "Your order #{$order->id} has been cancelled and GHS " . number_format($refundAmount, 2) . " has been refunded to your wallet.";
                $smsService->sendSms($user->phone, $message);
            }
        }

        // Send SMS if status changed to completed
        if ($request->status === 'completed' && $oldStatus !== 'completed') {
            $smsService = new MoolreSmsService();
            
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
                    $smsService->sendSms($beneficiaryNumber, $beneficiaryMessage);
                }
                
                // Send SMS to user
                if ($order->user->phone) {
                    $userMessage = "{$size} has been sent to {$beneficiaryNumber}";
                    $smsService->sendSms($order->user->phone, $userMessage);
                }
            }
        }

        return redirect()->back()->with('success', 'Order status updated successfully.');
    }

    /**
     * Bulk update order statuses.
     */
    public function bulkUpdateOrderStatus(Request $request)
    {
        $request->validate([
            'orders'         => 'required|array|min:1',
            'orders.*.id'    => 'required|integer',
            'orders.*.source'=> 'required|string|in:direct,shop',
            'status'         => 'required|string|in:pending,processing,completed,cancelled',
        ]);

        $directIds = [];
        $shopIds   = [];
        foreach ($request->orders as $entry) {
            if ($entry['source'] === 'shop') {
                $shopIds[] = $entry['id'];
            } else {
                $directIds[] = $entry['id'];
            }
        }

        // --- Direct orders ---
        $orders = Order::with('user', 'products')->whereIn('id', $directIds)->get();
        $previouslyNonCancelled = $orders->where('status', '!=', 'cancelled');
        $previouslyNonCompleted = $orders->where('status', '!=', 'completed');

        $updatedCount = 0;
        if (!empty($directIds)) {
            $updatedCount += Order::whereIn('id', $directIds)->update(['status' => $request->status]);
        }

        // Handle automatic refunds when orders are cancelled
        if ($request->status === 'cancelled') {
            $smsService = new MoolreSmsService();
            foreach ($previouslyNonCancelled as $order) {
                $user = $order->user;
                    $refundAmount = $order->total;
                    $balanceBefore = $user->wallet_balance;
                    $user->increment('wallet_balance', $refundAmount);

                    Transaction::create([
                        'user_id'        => $user->id,
                        'order_id'       => $order->id,
                        'amount'         => $refundAmount,
                        'status'         => 'completed',
                        'type'           => 'refund',
                        'description'    => "Refund for cancelled order #{$order->id}",
                        'balance_before' => $balanceBefore,
                        'balance_after'  => $balanceBefore + $refundAmount,
                    ]);

                    // Reverse shop commission if this order was placed via a shop
                    $commissionLog = \App\Models\CommissionLog::where('source_type', Order::class)
                        ->where('source_id', $order->id)
                        ->first();

                    if ($commissionLog) {
                        $shopOwner = \App\Models\User::where('id', $commissionLog->user_id)->lockForUpdate()->first();
                        if ($shopOwner) {
                            $shopOwner->decrement('commission_balance', $commissionLog->amount);
                        }
                        $commissionLog->delete();
                    }
                    
                    if ($user->phone) {
                        $message = "Your order #{$order->id} has been cancelled and GHS " . number_format($refundAmount, 2) . " has been refunded to your wallet.";
                        $smsService->sendSms($user->phone, $message);
                    }
            }
        }

        // Send SMS notifications if status changed to completed
        if ($request->status === 'completed') {
            $smsService = new MoolreSmsService();
            foreach ($previouslyNonCompleted as $order) {
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
                            $smsService->sendSms($beneficiaryNumber, $beneficiaryMessage);
                        }
                        
                        // Send SMS to user
                        if ($order->user->phone) {
                            $userMessage = "{$size} has been sent to {$beneficiaryNumber}";
                            $smsService->sendSms($order->user->phone, $userMessage);
                        }
                }
            }
        }

        // --- Shop orders ---
        if (!empty($shopIds)) {
            $updatedCount += ShopOrder::whereIn('id', $shopIds)->update(['fulfillment_status' => $request->status]);
        }

        return redirect()->back()->with('success', "Updated {$updatedCount} order(s) successfully.");
    }

    /**
     * Display the admin transactions page.
     */
    public function transactions(Request $request)
    {
        $transactions = Transaction::with('user', 'order.user')->latest();

        if ($request->has('type') && $request->input('type') !== '') {
            $transactions->where('type', $request->input('type'));
        }

        return Inertia::render('Admin/Transactions', [
            'transactions' => $transactions->paginate(50),
            'filterType' => $request->input('type', ''),
        ]);
    }

    /**
     * Store a new user.
     */
    public function storeUser(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:customer,agent,admin,dealer',
        ]);

        User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => bcrypt($request->password),
            'role' => $request->role,
        ]);

        return redirect()->route('admin.users');
    }

    /**
     * Update the user's role.
     */
    public function updateUserRole(Request $request, User $user)
    {
        $request->validate([
            'role' => 'required|string|in:customer,agent,admin,dealer',
        ]);

        $user->update([
            'role' => $request->role,
        ]);

        return redirect()->route('admin.users');
    }

    /**
     * Delete the user.
     */
    public function deleteUser(User $user)
    {
        $user->delete();

        return redirect()->route('admin.users');
    }

    /**
     * Credit user's wallet.
     */
    public function creditWallet(Request $request, User $user, MoolreSmsService $smsService)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
        ]);

        $amount = $request->amount;
        $balanceBefore = $user->wallet_balance;
        $user->increment('wallet_balance', $amount);

        // Create transaction record
        Transaction::create([
            'user_id'        => $user->id,
            'amount'         => $amount,
            'status'         => 'completed',
            'type'           => 'wallet_credit',
            'description'    => "Admin wallet credit - GHS " . number_format($amount, 2),
            'balance_before' => $balanceBefore,
            'balance_after'  => $balanceBefore + $amount,
        ]);

        // Send SMS notification
        $previousBalance = $balanceBefore;
        $message = "Hello {$user->name}, your wallet has been credited with GHS " . number_format($amount, 2) . " by admin. Your previous balance was GHS " . number_format($previousBalance, 2) . " and your current balance is GHS " . number_format($user->wallet_balance, 2);
        $smsService->sendSms($user->phone, $message);

        return redirect()->route('admin.users')->with('success', 'Wallet credited successfully.');
    }

    /**
     * Debit user's wallet.
     */
    public function debitWallet(Request $request, User $user, MoolreSmsService $smsService)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
        ]);

        if ($user->wallet_balance < $request->amount) {
            return redirect()->route('admin.users')->with('error', 'Insufficient wallet balance.');
        }

        $amount = $request->amount;
        $balanceBefore = $user->wallet_balance;
        $user->decrement('wallet_balance', $amount);

        // Create transaction record
        Transaction::create([
            'user_id'        => $user->id,
            'amount'         => $amount,
            'status'         => 'completed',
            'type'           => 'wallet_debit',
            'description'    => "Admin wallet debit - GHS " . number_format($amount, 2),
            'balance_before' => $balanceBefore,
            'balance_after'  => $balanceBefore - $amount,
        ]);

        // Send SMS notification
        $previousBalance = $balanceBefore;
        $message = "Hello {$user->name}, your wallet has been debited with GHS " . number_format($amount, 2) . " by admin. Your previous balance was GHS " . number_format($previousBalance, 2) . " and your current balance is GHS " . number_format($user->wallet_balance, 2);
        $smsService->sendSms($user->phone, $message);

        return redirect()->route('admin.users')->with('success', 'Wallet debited successfully.');
    }

    /**
     * Store a new product.
     */
    public function storeProduct(Request $request)
    {
        \Log::info('=== STORE PRODUCT REQUEST START ===');
        \Log::info('Request Method:', [$request->method()]);
        \Log::info('Request URL:', [$request->url()]);
        \Log::info('Request Headers:', $request->headers->all());
        \Log::info('Store Product Request Data:', $request->all());
        \Log::info('Request Input Count:', [count($request->all())]);
        \Log::info('complete request',[$request->all()]);
        
        try {
            \Log::info('Starting validation...');
            $request->validate([
                'name' => 'required|string|max:255',
                'network' => 'required|in:MTN,Telecel,Ishare,Bigtime',
                'description' => 'required|string|max:255',
                'expiry' => 'required|in:non expiry,30 days,24 hours',
                'product_type' => 'required|in:agent_product,customer_product,dealer_product',
                'variants' => 'required|array|min:1',
                'variants.*.price' => 'required|numeric|min:0',
                'variants.*.quantity' => 'required|string',
                'variants.*.status' => 'required|in:IN STOCK,OUT OF STOCK',
            ]);
            \Log::info('Validation passed successfully');
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation failed:', $e->errors());
            throw $e;
        }

        try {
            \Log::info('Creating product with data:', [
                'name' => $request->name,
                'network' => $request->network,
                'description' => $request->description,
                'expiry' => $request->expiry,
                'product_type' => $request->product_type,
                'has_variants' => count($request->variants) > 1,
            ]);
            
            $product = Product::create([
                'name' => $request->name,
                'network' => $request->network,
                'description' => $request->description,
                'expiry' => $request->expiry,
                'product_type' => $request->product_type,
                'has_variants' => count($request->variants) > 1,
            ]);

            \Log::info('Product created with ID: ' . $product->id);

            foreach ($request->variants as $index => $variantData) {
                \Log::info('Creating variant ' . ($index + 1) . ':', $variantData);
                
                ProductVariant::create([
                    'product_id' => $product->id,
                    'price' => $variantData['price'],
                    'quantity' => $variantData['quantity'],
                    'status' => $variantData['status'],
                    'variant_attributes' => ['size' => $variantData['quantity']],
                ]);
            }

            \Log::info('Product and variants created successfully');
            return redirect()->route('admin.products')->with('success', 'Product created successfully.');
        } catch (\Exception $e) {
            \Log::error('=== PRODUCT CREATION FAILED ===');
            \Log::error('Error message: ' . $e->getMessage());
            \Log::error('Error file: ' . $e->getFile() . ':' . $e->getLine());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            \Log::error('Request data at time of error:', $request->all());
            return redirect()->back()->withErrors(['error' => 'Failed to create product: ' . $e->getMessage()])->withInput();
        }
        
        \Log::info('=== STORE PRODUCT REQUEST END ===');
    }

    /**
     * Update a product.
     */
    public function updateProduct(Request $request, Product $product)
    {
        \Log::info('Update Product Request Data:', $request->all());
        \Log::info('Updating product ID: ' . $product->id);
        
        $request->validate([
            'name' => 'required|string|max:255',
            'network' => 'required|in:MTN,Telecel,Ishare,Bigtime',
            'description' => 'required|string|max:255',
            'expiry' => 'required|in:non expiry,30 days,24 hours',
            'product_type' => 'required|in:agent_product,customer_product,dealer_product',
            'variants' => 'required|array|min:1',
            'variants.*.price' => 'required|numeric|min:0',
            'variants.*.quantity' => 'required|string',
            'variants.*.status' => 'required|in:IN STOCK,OUT OF STOCK',
        ]);

        try {
            \DB::transaction(function () use ($request, $product) {
                $product->update([
                    'name' => $request->name,
                    'network' => $request->network,
                    'description' => $request->description,
                    'expiry' => $request->expiry,
                    'product_type' => $request->product_type,
                    'has_variants' => count($request->variants) > 1,
                ]);

                $existingVariants = $product->variants;
                $requestVariants = collect($request->variants);

                // Update existing variants or create new ones
                $requestVariants->each(function ($variantData, $index) use ($product, $existingVariants) {
                    if (isset($existingVariants[$index])) {
                        // Update existing variant
                        $existingVariants[$index]->update([
                            'price' => $variantData['price'],
                            'quantity' => $variantData['quantity'],
                            'status' => $variantData['status'],
                            'variant_attributes' => ['size' => $variantData['quantity']],
                        ]);
                    } else {
                        // Create new variant
                        $product->variants()->create([
                            'price' => $variantData['price'],
                            'quantity' => $variantData['quantity'],
                            'status' => $variantData['status'],
                            'variant_attributes' => ['size' => $variantData['quantity']],
                        ]);
                    }
                });

                // Delete excess variants if any
                if ($existingVariants->count() > $requestVariants->count()) {
                    $variantsToDelete = $existingVariants->slice($requestVariants->count());
                    foreach ($variantsToDelete as $variant) {
                        $variant->delete();
                    }
                }
            });

            return redirect()->route('admin.products')->with('success', 'Product updated successfully.');
        } catch (\Exception $e) {
            \Log::error('Failed to update product: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Failed to update product: ' . $e->getMessage()])->withInput();
        }
    }

    /**
     * Delete a product.
     */
    public function deleteProduct(Product $product)
    {
        $product->delete();
        return redirect()->route('admin.products');
    }

    /**
     * Display user transaction history.
     */
    public function userTransactions(User $user)
    {
        $transactions = Transaction::where('user_id', $user->id)
            ->with('order')
            ->latest()
            ->get();

        return Inertia::render('Admin/UserTransactions', [
            'user'         => $user,
            'transactions' => $transactions,
        ]);
    }

    /**
     * Export selected orders to CSV.
     */
    public function exportOrders(Request $request)
    {
        $request->validate([
            'order_ids'   => 'required|array|min:1',
            'order_ids.*' => 'required|string',
        ]);

        $directIds = [];
        $shopIds   = [];

        foreach ($request->order_ids as $key) {
            if (str_starts_with($key, 'shop_')) {
                $shopIds[] = (int) substr($key, 5);
            } else {
                // handles both "direct_5" and plain "5"
                $directIds[] = (int) (str_starts_with($key, 'direct_') ? substr($key, 7) : $key);
            }
        }

        $directOrders = !empty($directIds)
            ? Order::with(['products' => fn($q) => $q->withPivot('quantity', 'beneficiary_number', 'product_variant_id')])
                ->whereIn('id', $directIds)->get()->keyBy('id')
            : collect();

        $shopOrders = !empty($shopIds)
            ? ShopOrder::with('items.shopProduct.variant')->whereIn('id', $shopIds)->get()->keyBy('id')
            : collect();

        $filename = 'orders_' . date('Y-m-d_H-i-s') . '.csv';

        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        // Build rows in the original order_ids sequence
        $rows = collect();

        foreach ($request->order_ids as $key) {
            if (str_starts_with($key, 'shop_')) {
                $id = (int) substr($key, 5);
                $shopOrder = $shopOrders->get($id);
                if (!$shopOrder) continue;
                foreach ($shopOrder->items as $item) {
                    $variant = $item->shopProduct?->variant;
                    $size = 'N/A';
                    if ($variant && isset($variant->variant_attributes['size'])) {
                        $size = preg_replace('/[^0-9.]/', '', $variant->variant_attributes['size']);
                    }
                    $rows->push([$item->beneficiary_number ?? 'N/A', $size]);
                }
            } else {
                $id = (int) (str_starts_with($key, 'direct_') ? substr($key, 7) : $key);
                $order = $directOrders->get($id);
                if (!$order) continue;
                foreach ($order->products as $product) {
                    $size = 'N/A';
                    if ($product->pivot->product_variant_id) {
                        $variant = ProductVariant::find($product->pivot->product_variant_id);
                        if ($variant && isset($variant->variant_attributes['size'])) {
                            $size = preg_replace('/[^0-9.]/', '', $variant->variant_attributes['size']);
                        }
                    }
                    $rows->push([$product->pivot->beneficiary_number ?? 'N/A', $size]);
                }
            }
        }

        $callback = function () use ($rows) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Number', 'Volume']);
            foreach ($rows as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Display AFA orders page.
     */
    public function afaOrders()
    {
        $afaOrders = \App\Models\AFAOrders::with(['afaproduct', 'user'])->latest()->get();
        
        return Inertia::render('Admin/AFAOrders', [
            'afaOrders' => $afaOrders
        ]);
    }

    /**
     * Update AFA order status.
     */
    public function updateAfaOrderStatus(Request $request, \App\Models\AFAOrders $order)
    {
        $request->validate([
            'status' => 'required|string|in:PENDING,COMPLETED,CANCELLED',
        ]);

        $order->update(['status' => $request->status]);

        return redirect()->back()->with('success', 'AFA order status updated successfully.');
    }

    /**
     * Toggle Jaybart order pusher functionality.
     */
    public function toggleJaybartOrderPusher(Request $request)
    {
        $enabled = $request->input('enabled', false);
        Setting::set('jaybart_order_pusher_enabled', $enabled ? '1' : '0');
        
        $status = $enabled ? 'enabled' : 'disabled';
        return redirect()->back()->with('success', "Jaybart order pusher {$status} successfully.");
    }

    /**
     * Toggle CodeCraft order pusher functionality.
     */
    public function toggleCodecraftOrderPusher(Request $request)
    {
        $enabled = $request->input('enabled', false);
        Setting::set('codecraft_order_pusher_enabled', $enabled ? '1' : '0');
        
        $status = $enabled ? 'enabled' : 'disabled';
        return redirect()->back()->with('success', "CodeCraft order pusher {$status} successfully.");
    }

    /**
     * Toggle Etopup order pusher functionality.
     */
    public function toggleEtopupOrderPusher(Request $request)
    {
        $enabled = $request->input('enabled', false);
        Setting::set('etopup_order_pusher_enabled', $enabled ? '1' : '0');
        
        $status = $enabled ? 'enabled' : 'disabled';
        return redirect()->back()->with('success', "Etopup order pusher {$status} successfully.");
    }

    /**
     * Toggle UniBundleGH order pusher functionality.
     */
    public function toggleUniBundleGHOrderPusher(Request $request)
    {
        $enabled = $request->input('enabled', false);
        Setting::set('unibundlegh_order_pusher_enabled', $enabled ? '1' : '0');

        $status = $enabled ? 'enabled' : 'disabled';
        return redirect()->back()->with('success', "UniBundleGH order pusher {$status} successfully.");
    }
}