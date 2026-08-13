<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;
use App\Services\OrderPusherService;
use App\Services\CodeCraftOrderPusherService;
use App\Services\EtopupOrderPusherService;
use Illuminate\Support\Facades\Log;
use App\Models\Setting;

class OrderController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $orders = auth()->user()->orders()->with('products')->latest()->get();
        return response()->json($orders);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'beneficiary_number' => 'required|string',
            'network_id' => 'required|integer',
            'size' => 'required|string'
        ]);

        $user = auth()->user();
        
        // Map network IDs to network names
        $networkMap = [
            5 => 'MTN',      // Agent MTN
            6 => 'TELECEL',  // Agent Telecel
            7 => 'ISHARE',   // Agent Ishare
            8 => 'BIGTIME',  // Agent Bigtime
            9 => 'MTN',      // Dealer MTN
            10 => 'TELECEL', // Dealer Telecel
            11 => 'ISHARE',  // Dealer Ishare
            12 => 'BIGTIME', // Dealer Bigtime
        ];
        
        if (!isset($networkMap[$request->network_id])) {
            return response()->json(['error' => 'Invalid network ID'], 400);
        }
        
        $networkName = $networkMap[$request->network_id];
        
        // Determine product type based on network_id range
        $productType = in_array($request->network_id, [5, 6, 7, 8]) ? 'agent_product' : 'dealer_product';
        
        $product = Product::where('network', $networkName)
            ->where('product_type', $productType)
            ->first();
            
        if (!$product) {
            return response()->json(['error' => 'Product not found'], 404);
        }

        $variant = ProductVariant::where('product_id', $product->id)
            ->whereJsonContains('variant_attributes->size', $request->size)
            ->first();
            
        if (!$variant) {
            return response()->json(['error' => 'Size variant not available'], 404);
        }

        if (auth()->user()->wallet_balance < $variant->price) {
            return response()->json(['error' => 'Insufficient wallet balance'], 400);
        }

        $order = DB::transaction(function() use ($request, $product, $variant) {
            auth()->user()->decrement('wallet_balance', $variant->price);
            
            $order = Order::create([
                'user_id' => auth()->id(),
                'total' => $variant->price,
                'beneficiary_number' => $request->beneficiary_number,
                'network' => $product->network,
                'status' => 'pending'
            ]);

            $order->products()->attach($product->id, [
                'quantity' => 1,
                'price' => $variant->price,
                'beneficiary_number' => $request->beneficiary_number,
                'product_variant_id' => $variant->id
            ]);

            return $order;
        });
        
        // Push order to external API based on network (if enabled)
        $jaybartEnabled = (bool) Setting::get('jaybart_order_pusher_enabled', 1);
        $codecraftEnabled = (bool) Setting::get('codecraft_order_pusher_enabled', 1);
        $etopupEnabled = (bool) Setting::get('etopup_order_pusher_enabled', 1);
        $unibundleghEnabled = (bool) Setting::get('unibundlegh_order_pusher_enabled', 0);

        try {
            if (strtolower($order->network) === 'mtn') {
                if ($unibundleghEnabled) {
                    $unibundleghService = new \App\Services\UniBundleGHService();
                    $variant = \App\Models\ProductVariant::find($order->products->first()?->pivot?->product_variant_id);
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
                            'api_status' => $result['ok'] ? 'success' : 'failed',
                        ]);
                    }
                } elseif ($etopupEnabled) {
                    $etopupPusher = new EtopupOrderPusherService();
                    $etopupPusher->pushOrderToApi($order);
                    Log::info('Order pushed to Etopup API', ['orderId' => $order->id]);
                } elseif ($jaybartEnabled) {
                    $mtnOrderPusher = new OrderPusherService();
                    $mtnOrderPusher->pushOrderToApi($order);
                    Log::info('Order pushed to Jaybart API', ['orderId' => $order->id]);
                } else {
                    Log::info('All MTN order pushers disabled', ['orderId' => $order->id]);
                }
            } elseif (in_array(strtolower($order->network), ['telecel', 'ishare', 'bigtime']) && $codecraftEnabled) {
                $codeCraftOrderPusher = new CodeCraftOrderPusherService();
                $codeCraftOrderPusher->pushOrderToApi($order);
                Log::info('Order pushed to CodeCraft API', ['orderId' => $order->id]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to push order to external API', ['orderId' => $order->id, 'network' => $order->network, 'error' => $e->getMessage()]);
            $order->update(['api_status' => 'failed']);
        }

        // Load the order with its products and user for the response
        $order->load(['products' => function($query) {
            $query->withPivot('quantity', 'price', 'beneficiary_number', 'product_variant_id');
        }, 'user']);
        
        return response()->json([
            'message' => 'Order created successfully',
            'order' => [
                'reference_id' => $order->id,
                'total' => $order->total,
                'status' => $order->status,
                'network' => $order->network,
                'beneficiary_number' => $order->beneficiary_number,
                'created_at' => $order->created_at,
                'user' => [
                    'name' => $order->user->name,
                    'email' => $order->user->email
                ],
                'products' => $order->products->map(function($product) {
                    return [
                        'name' => $product->name,
                        'quantity' => $product->pivot->quantity,
                        'price' => $product->pivot->price
                    ];
                })
            ]
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
