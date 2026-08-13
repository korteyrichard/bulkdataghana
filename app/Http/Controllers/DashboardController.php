<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Product;
use App\Models\Cart;
use App\Models\Transaction;
use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;
use App\Services\MoolreSmsService;
use App\Models\Alert;
use App\Models\ShopOrder;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        
        // Get products for displaying expiry information
        $products = Product::all();
        
        $cartCount = 0;
        $cartItems = [];
        $walletBalance = 0;
        $orders = [];
        
        if (auth()->check()) {
            $cartCount = Cart::where('user_id', auth()->id())->count();
            $cartItems = Cart::where('user_id', auth()->id())
                ->with(['product', 'productVariant'])
                ->get()
                ->map(function($item) {
                    $size = 'Unknown';
                    if ($item->productVariant && isset($item->productVariant->variant_attributes['size'])) {
                        $size = strtoupper($item->productVariant->variant_attributes['size']);
                    }
                    
                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'quantity' => $size,
                        'beneficiary_number' => $item->beneficiary_number,
                        'product' => [
                            'name' => $item->product ? $item->product->name : 'Data Bundle',
                            'price' => $item->price ?? ($item->productVariant ? $item->productVariant->price : 0),
                            'network' => $item->network ?? ($item->product ? $item->product->network : 'Unknown'),
                            'expiry' => $item->product ? $item->product->expiry : '30 Days'
                        ]
                    ];
                });
            $walletBalance = $user->wallet_balance;
            $orders = Order::where('user_id', $user->id)->with('products')->get();
        }
        
        // Calculate dashboard stats
        $totalSales = Transaction::where('user_id', $user->id)
            ->where('status', 'completed')
            ->where('type', 'order')
            ->sum('amount');
            
        $todaySales = Transaction::where('user_id', $user->id)
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

        // Include shop order stats
        $shop = $user->shop;
        if ($shop) {
            $shopOrdersQuery = ShopOrder::where('shop_id', $shop->id)->where('payment_status', 'paid');
            $totalSales += (float) $shopOrdersQuery->sum('total_amount');
            $todaySales += (float) (clone $shopOrdersQuery)->whereDate('created_at', today())->sum('total_amount');
            $pendingOrdersCount += (clone $shopOrdersQuery)->where('fulfillment_status', 'pending')->count();
            $processingOrdersCount += (clone $shopOrdersQuery)->where('fulfillment_status', 'processing')->count();
        }
        
        return Inertia::render('Dashboard/dashboard', [
            'cartCount' => $cartCount,
            'cartItems' => $cartItems,
            'walletBalance' => $walletBalance,
            'orders' => $orders,
            'totalSales' => $totalSales ?? 0,
            'todaySales' => $todaySales ?? 0,
            'pendingOrders' => $pendingOrdersCount ?? 0,
            'processingOrders' => $processingOrdersCount ?? 0,
            'products' => $products,
            'alerts' => Alert::active()->get(),
        ]);
    }



    public function viewCart()
    {
        $cartItems = Cart::where('user_id', auth()->id())
            ->with(['product', 'productVariant'])
            ->get()
            ->map(function($item) {
                $size = 'Unknown';
                if ($item->productVariant && isset($item->productVariant->variant_attributes['size'])) {
                    $size = strtoupper($item->productVariant->variant_attributes['size']);
                }
                
                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'quantity' => $size,
                    'beneficiary_number' => $item->beneficiary_number,
                    'product' => [
                        'name' => $item->product ? $item->product->name : 'Data Bundle',
                        'price' => $item->price ?? ($item->productVariant ? $item->productVariant->price : 0),
                        'network' => $item->network ?? ($item->product ? $item->product->network : 'Unknown'),
                        'expiry' => $item->product ? $item->product->expiry : '30 Days'
                    ]
                ];
            });
        return Inertia::render('Dashboard/Cart', ['cartItems' => $cartItems]);
    }

    public function removeFromCart($id)
    {
        Cart::where('user_id', auth()->id())->where('id', $id)->delete();
        return response()->json(['success' => true, 'message' => 'Removed from cart']);
    }

    public function transactions(Request $request)
    {
        $user = auth()->user();
        $transactions = Transaction::where('user_id', $user->id)->latest()->get();

        $todayTopUps = Transaction::where('user_id', $user->id)
            ->where('type', 'topup')->where('status', 'completed')
            ->whereDate('created_at', today())->sum('amount');

        $todaySales = Transaction::where('user_id', $user->id)
            ->where('type', 'order')->where('status', 'completed')
            ->whereDate('created_at', today())->sum('amount');

        return Inertia::render('Dashboard/transactions', [
            'transactions' => $transactions,
            'todayTopUps'  => $todayTopUps,
            'todaySales'   => $todaySales,
            'filterType'   => $request->input('type', 'all'),
        ]);
    }

    /**
     * Add to the authenticated user's wallet balance via Paystack
     */
    public function addToWallet(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
        ]);

        $user = auth()->user();
        $reference = 'wallet_' . Str::random(16);
        
        // Store pending transaction
        $transaction = Transaction::create([
            'user_id' => $user->id,
            'order_id' => null,
            'amount' => $request->amount,
            'status' => 'pending',
            'type' => 'topup',
            'description' => 'Wallet top-up of GHS ' . number_format($request->amount, 2),
            'reference' => $reference,
        ]);
        
        // Initialize Paystack payment
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('paystack.secret_key'),
            'Content-Type' => 'application/json',
        ])->post('https://api.paystack.co/transaction/initialize', [
            'email' => $user->email,
            'amount' => $request->amount * 100, // Convert to kobo
            'callback_url' => route('wallet.callback'),
            'reference' => $reference,
            'metadata' => [
                'user_id' => $user->id,
                'transaction_id' => $transaction->id,
                'type' => 'wallet_topup',
                'actual_amount' => $request->amount
            ]
        ]);

        if ($response->successful()) {
            return Inertia::location($response->json('data.authorization_url'));
        }

        $transaction->update(['status' => 'failed']);
        return back()->withErrors(['amount' => 'Payment initialization failed']);
    }

    public function handleWalletCallback(Request $request)
    {
        $reference = $request->reference;

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('paystack.secret_key'),
        ])->get("https://api.paystack.co/transaction/verify/{$reference}");

        if (!$response->successful() || $response->json('data.status') !== 'success') {
            return redirect()->route('dashboard')->with('error', 'Payment verification failed.');
        }

        $paymentData = $response->json('data');
        $metadata = $paymentData['metadata'] ?? [];
        $transactionId = $metadata['transaction_id'] ?? null;

        if (!$transactionId) {
            return redirect()->route('dashboard')->with('error', 'Invalid payment metadata.');
        }

        $credited = \Illuminate\Support\Facades\DB::transaction(function () use ($transactionId, $paymentData, $metadata) {
            $transaction = Transaction::where('id', $transactionId)
                ->where('type', 'topup')
                ->lockForUpdate()
                ->first();

            if (!$transaction || $transaction->status !== 'pending') {
                return false;
            }

            // Validate amount: Paystack amount (kobo) must match stored amount
            $paystackAmountKobo = $paymentData['amount'] ?? 0;
            $expectedKobo = (int) round($transaction->amount * 100);
            if ($paystackAmountKobo !== $expectedKobo) {
                \Log::warning('Callback amount mismatch', [
                    'expected_kobo' => $expectedKobo,
                    'paystack_kobo' => $paystackAmountKobo,
                    'transaction_id' => $transactionId,
                ]);
                return false;
            }

            $transaction->update(['status' => 'completed']);
            $userModel = \App\Models\User::where('id', $transaction->user_id)->lockForUpdate()->first();
            $balanceBefore = $userModel->wallet_balance;
            $userModel->increment('wallet_balance', $transaction->amount);
            $transaction->update([
                'balance_before' => $balanceBefore,
                'balance_after'  => $balanceBefore + $transaction->amount,
            ]);

            return $transaction;
        });

        if ($credited) {
            $user = auth()->user() ?? \App\Models\User::find($credited->user_id);
            if ($user && $user->phone) {
                $amount = $credited->amount;
                $newBalance = $user->fresh()->wallet_balance;
                $previousBalance = $newBalance - $amount;
                $message = "Hello {$user->name}, your wallet top-up of GHS " . number_format($amount, 2) . " has been completed. Previous balance: GHS " . number_format($previousBalance, 2) . ". New balance: GHS " . number_format($newBalance, 2);
                (new MoolreSmsService())->sendSms($user->phone, $message);
            }
        }

        return redirect()->route('dashboard')->with('success', 'Wallet topped up successfully!');
    }

    public function getBundleSizes(Request $request)
    {
        $network = $request->get('network');
        
        if (!$network) {
            return response()->json(['success' => false, 'message' => 'Network is required']);
        }
        
        $user = auth()->user();
        
        // Determine product type based on user role
        if ($user->role === 'customer') {
            $productType = 'customer_product';
        } elseif ($user->role === 'agent') {
            $productType = 'agent_product';
        } elseif ($user->role === 'dealer' || $user->role === 'admin') {
            $productType = 'dealer_product';
        } else {
            $productType = 'customer_product';
        }
        
        $product = Product::where('network', $network)
            ->where('product_type', $productType)
            ->first();
        
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Product not found']);
        }
        
        $variants = $product->variants()
            ->where('status', 'IN STOCK')
            ->get()
            ->map(function($variant) {
                $size = $variant->variant_attributes['size'] ?? null;
                
                // Skip variants without proper size attribute
                if (!$size) {
                    return null;
                }
                $displaySize = strtoupper(str_replace('gb', ' GB', $size));
                if ($size === '0.5gb') {
                    $displaySize = '500 MB';
                }
                return [
                    'value' => preg_replace('/[^0-9.]/', '', $size),
                    'label' => $displaySize,
                    'price' => $variant->price
                ];
            })
            ->filter(function($item) {
                return $item !== null && $item['value'] !== '' && $item['value'] !== 'unknown';
            })
            ->sortBy(function($item) {
                return (float) $item['value'];
            })
            ->values();
            
        return response()->json(['success' => true, 'sizes' => $variants]);
    }
}
