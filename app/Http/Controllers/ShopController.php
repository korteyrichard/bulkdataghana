<?php

namespace App\Http\Controllers;

use App\Models\CommissionLog;
use App\Models\ProductVariant;
use App\Models\ReferralLog;
use App\Models\ResultCheckerProduct;
use App\Models\Setting;
use App\Models\Shop;
use App\Models\ShopProduct;
use App\Models\ShopResultCheckerProduct;
use App\Models\ShopWithdrawal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ShopController extends Controller
{
    private function userShop()
    {
        return Auth::user()->shop;
    }

    // ── Dashboard ──────────────────────────────────────────────────────────────

    public function dashboard()
    {
        $user = Auth::user();
        $shop = $user->shop()->with('shopProducts.variant.product')->first();

        $stats = $shop ? [
            'total_orders'     => $shop->orders()->where('payment_status', 'paid')->count(),
            'total_commission' => $shop->orders()->where('payment_status', 'paid')->sum('commission_amount'),
            'pending_orders'   => $shop->orders()->where('payment_status', 'paid')->where('fulfillment_status', 'pending')->count(),
        ] : null;

        $withdrawalLimit = (float) Setting::get('shop_withdrawal_limit', 50);

        return Inertia::render('Dashboard/Shop/Dashboard', [
            'shop'              => $shop,
            'stats'             => $stats,
            'commission_balance' => (float) $user->commission_balance,
            'withdrawal_limit'  => $withdrawalLimit,
            'referral_link'     => url('/register?ref=' . $user->referral_code),
            'referral_code'     => $user->referral_code,
            'referred_count'    => $user->referredUsers()->count(),
        ]);
    }

    // ── Shop CRUD ──────────────────────────────────────────────────────────────

    public function createShop()
    {
        if ($this->userShop()) {
            return redirect()->route('shop.dashboard');
        }
        return Inertia::render('Dashboard/Shop/CreateShop');
    }

    public function storeShop(Request $request)
    {
        if ($this->userShop()) {
            return back()->withErrors(['message' => 'You already have a shop.']);
        }

        $data = $request->validate([
            'name'            => 'required|string|max:100',
            'description'     => 'nullable|string|max:500',
            'whatsapp'        => 'nullable|string|max:20',
            'logo'            => 'nullable|image|max:2048',
            'primary_color'   => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'secondary_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
        ]);

        $logoPath = null;
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('shop-logos', 'public');
        }

        Shop::create([
            'user_id'         => Auth::id(),
            'name'            => $data['name'],
            'slug'            => Shop::generateSlug($data['name']),
            'description'     => $data['description'] ?? null,
            'whatsapp'        => $data['whatsapp'] ?? null,
            'logo'            => $logoPath,
            'primary_color'   => $data['primary_color'] ?? '#0891b2',
            'secondary_color' => $data['secondary_color'] ?? '#1d4ed8',
        ]);

        return redirect()->route('shop.dashboard')->with('success', 'Shop created successfully!');
    }

    public function editShop()
    {
        $shop = $this->userShop();
        if (!$shop) return redirect()->route('shop.create');

        return Inertia::render('Dashboard/Shop/EditShop', ['shop' => $shop]);
    }

    public function updateShop(Request $request)
    {
        $shop = $this->userShop();
        if (!$shop) return back()->withErrors(['message' => 'Shop not found.']);

        $data = $request->validate([
            'name'            => 'required|string|max:100',
            'description'     => 'nullable|string|max:500',
            'whatsapp'        => 'nullable|string|max:20',
            'logo'            => 'nullable|image|max:2048',
            'is_active'       => 'boolean',
            'primary_color'   => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'secondary_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
        ]);

        if ($request->hasFile('logo')) {
            if ($shop->logo) Storage::disk('public')->delete($shop->logo);
            $data['logo'] = $request->file('logo')->store('shop-logos', 'public');
        }

        // Regenerate slug only if name changed
        if ($data['name'] !== $shop->name) {
            $data['slug'] = Shop::generateSlug($data['name']);
        }

        $shop->update($data);

        return back()->with('success', 'Shop updated successfully!');
    }

    // ── Shop Products ──────────────────────────────────────────────────────────

    public function products()
    {
        $shop = $this->userShop();
        if (!$shop) return redirect()->route('shop.create');

        $shopProducts = ShopProduct::where('shop_id', $shop->id)
            ->with('variant.product')
            ->get()
            ->map(fn($sp) => [
                'id'             => $sp->id,
                'variant_id'     => $sp->product_variant_id,
                'name'           => $sp->variant->full_name,
                'network'        => $sp->variant->product->network,
                'cost_price'     => (float) $sp->variant->price,
                'selling_price'  => (float) $sp->selling_price,
                'profit'         => round((float) $sp->selling_price - (float) $sp->variant->price, 2),
                'stock_status'   => $sp->variant->status,
                'is_active'      => $sp->is_active,
            ]);

        // Map role to product_type
        $roleProductTypeMap = [
            'customer' => 'customer_product',
            'agent'    => 'agent_product',
            'dealer'   => 'dealer_product',
            'admin'    => 'dealer_product',
        ];
        $productType = $roleProductTypeMap[Auth::user()->role] ?? 'customer_product';

        // Available variants not yet in this shop, filtered by the user's role product type
        $availableVariants = ProductVariant::where('status', 'IN STOCK')
            ->where('quantity', '>', 0)
            ->whereHas('product', fn($q) => $q->where('product_type', $productType))
            ->with('product')
            ->whereNotIn('id', $shopProducts->pluck('variant_id'))
            ->get()
            ->map(fn($v) => [
                'id'      => $v->id,
                'name'    => $v->full_name,
                'network' => $v->product->network,
                'price'   => (float) $v->price,
            ]);

        $resultCheckerProducts = ResultCheckerProduct::where('status', 'active')
            ->withCount(['vouchers as available_vouchers_count' => fn($q) => $q->where('status', 'available')])
            ->get();

        $shopResultCheckers = $shop
            ? ShopResultCheckerProduct::where('shop_id', $shop->id)
                ->where('is_active', true)
                ->with('resultCheckerProduct')
                ->get()
            : collect();

        return Inertia::render('Dashboard/Shop/Products', [
            'shop'                    => $shop,
            'shop_products'           => $shopProducts,
            'available_variants'      => $availableVariants,
            'resultCheckerProducts'   => $resultCheckerProducts,
            'shopResultCheckers'      => $shopResultCheckers,
        ]);
    }

    public function addProduct(Request $request)
    {
        $shop = $this->userShop();
        if (!$shop) return back()->withErrors(['message' => 'Shop not found.']);

        $data = $request->validate([
            'product_variant_id' => 'required|exists:product_variants,id',
            'selling_price'      => 'required|numeric|min:0.01',
        ]);

        // Ensure selling price >= cost price
        $variant = ProductVariant::with('product')->findOrFail($data['product_variant_id']);

        // Security: ensure the variant belongs to a product type the user is allowed to sell
        $roleProductTypeMap = [
            'customer' => 'customer_product',
            'agent'    => 'agent_product',
            'dealer'   => 'dealer_product',
            'admin'    => 'dealer_product',
        ];
        $allowedType = $roleProductTypeMap[Auth::user()->role] ?? 'customer_product';
        abort_if($variant->product->product_type !== $allowedType, 403, 'You are not allowed to sell this product.');

        if ($data['selling_price'] < $variant->price) {
            return back()->withErrors(['selling_price' => 'Selling price cannot be less than cost price (GHS ' . number_format($variant->price, 2) . ').']);
        }

        ShopProduct::updateOrCreate(
            ['shop_id' => $shop->id, 'product_variant_id' => $data['product_variant_id']],
            ['selling_price' => $data['selling_price'], 'is_active' => true]
        );

        return back()->with('success', 'Product added to shop.');
    }

    public function updateProduct(Request $request, ShopProduct $shopProduct)
    {
        $this->authorizeShopProduct($shopProduct);

        $data = $request->validate([
            'selling_price' => 'required|numeric|min:0.01',
            'is_active'     => 'boolean',
        ]);

        $variant = $shopProduct->variant;
        if ($data['selling_price'] < $variant->price) {
            return back()->withErrors(['selling_price' => 'Selling price cannot be less than cost price (GHS ' . number_format($variant->price, 2) . ').']);
        }

        $shopProduct->update($data);

        return back()->with('success', 'Product updated.');
    }

    public function removeProduct(ShopProduct $shopProduct)
    {
        $this->authorizeShopProduct($shopProduct);
        $shopProduct->delete();
        return back()->with('success', 'Product removed from shop.');
    }

    public function addResultChecker(Request $request)
    {
        $shop = $this->userShop();
        if (!$shop) return back()->withErrors(['message' => 'Shop not found.']);

        $data = $request->validate([
            'result_checker_product_id' => 'required|exists:result_checker_products,id',
            'agent_price'               => 'required|numeric|min:0',
        ]);

        $product = ResultCheckerProduct::findOrFail($data['result_checker_product_id']);

        if ((float) $data['agent_price'] < (float) $product->price) {
            return back()->withErrors(['agent_price' => 'Price must be >= base price (GHS ' . number_format($product->price, 2) . ')']);
        }

        ShopResultCheckerProduct::updateOrCreate(
            ['shop_id' => $shop->id, 'result_checker_product_id' => $data['result_checker_product_id']],
            ['agent_price' => $data['agent_price'], 'is_active' => true]
        );

        return back()->with('success', 'Result checker added to shop.');
    }

    public function updateResultChecker(Request $request, ShopResultCheckerProduct $shopResultChecker)
    {
        $shop = $this->userShop();
        abort_if(!$shop || $shopResultChecker->shop_id !== $shop->id, 403);

        $data = $request->validate(['agent_price' => 'required|numeric|min:0']);

        $product = $shopResultChecker->resultCheckerProduct;
        if ((float) $data['agent_price'] < (float) $product->price) {
            return back()->withErrors(['agent_price' => 'Price must be >= base price (GHS ' . number_format($product->price, 2) . ')']);
        }

        $shopResultChecker->update(['agent_price' => $data['agent_price']]);

        return back()->with('success', 'Price updated.');
    }

    public function removeResultChecker(ShopResultCheckerProduct $shopResultChecker)
    {
        $shop = $this->userShop();
        abort_if(!$shop || $shopResultChecker->shop_id !== $shop->id, 403);

        $shopResultChecker->update(['is_active' => false]);

        return back()->with('success', 'Result checker removed from shop.');
    }

    // ── Orders ─────────────────────────────────────────────────────────────────

    public function orders()
    {
        $shop = $this->userShop();
        if (!$shop) return redirect()->route('shop.create');

        $orders = $shop->orders()
            ->with('items.shopProduct.variant.product')
            ->where('payment_status', 'paid')
            ->latest()
            ->paginate(20);

        return Inertia::render('Dashboard/Shop/Orders', [
            'shop'   => $shop,
            'orders' => $orders,
        ]);
    }

    // ── Commissions ────────────────────────────────────────────────────────────

    public function commissions()
    {
        $user = Auth::user();

        $logs = CommissionLog::where('user_id', $user->id)
            ->latest()
            ->paginate(20);

        $totals = [
            'shop_order' => CommissionLog::where('user_id', $user->id)->where('type', 'shop_order')->sum('amount'),
            'referral'   => CommissionLog::where('user_id', $user->id)->where('type', 'referral')->sum('amount'),
            'total'      => CommissionLog::where('user_id', $user->id)->sum('amount'),
        ];

        return Inertia::render('Dashboard/Shop/Commissions', [
            'logs'               => $logs,
            'totals'             => $totals,
            'commission_balance' => (float) $user->commission_balance,
        ]);
    }

    // ── Referrals ──────────────────────────────────────────────────────────────

    public function referrals()
    {
        $user = Auth::user();

        $referrals = ReferralLog::where('referrer_id', $user->id)
            ->with('referred:id,name,email,created_at')
            ->latest()
            ->paginate(20);

        $stats = [
            'total'     => ReferralLog::where('referrer_id', $user->id)->count(),
            'converted' => ReferralLog::where('referrer_id', $user->id)->where('status', 'converted')->count(),
            'earned'    => ReferralLog::where('referrer_id', $user->id)->sum('commission_earned'),
        ];

        return Inertia::render('Dashboard/Shop/Referrals', [
            'referrals'      => $referrals,
            'stats'          => $stats,
            'referral_link'  => url('/register?ref=' . $user->referral_code),
            'referral_code'  => $user->referral_code,
            'referral_commission' => (float) Setting::get('referral_commission', 5),
        ]);
    }

    // ── Withdrawals ────────────────────────────────────────────────────────────

    public function withdrawals()
    {
        $user = Auth::user();
        $withdrawalLimit = (float) Setting::get('shop_withdrawal_limit', 50);

        return Inertia::render('Dashboard/Shop/Withdrawals', [
            'commission_balance' => (float) $user->commission_balance,
            'withdrawal_limit'   => $withdrawalLimit,
            'withdrawals'        => $user->withdrawals()->latest()->get(),
            'can_withdraw'       => $user->commission_balance >= $withdrawalLimit,
        ]);
    }

    public function requestWithdrawal(Request $request)
    {
        $user = Auth::user();
        $withdrawalLimit = (float) Setting::get('shop_withdrawal_limit', 50);

        if ($user->commission_balance < $withdrawalLimit) {
            return back()->withErrors(['message' => "Minimum withdrawal is GHS {$withdrawalLimit}."]);
        }

        if ($user->withdrawals()->where('status', 'pending')->exists()) {
            return back()->withErrors(['message' => 'You already have a pending withdrawal request.']);
        }

        $data = $request->validate([
            'amount'          => "required|numeric|min:{$withdrawalLimit}|max:{$user->commission_balance}",
            'withdrawal_type' => 'required|in:momo,wallet',
            'momo_name'       => 'required_if:withdrawal_type,momo|nullable|string|max:100',
            'momo_network'    => 'required_if:withdrawal_type,momo|nullable|in:MTN,Telecel',
            'momo_number'     => 'required_if:withdrawal_type,momo|nullable|digits:10',
        ]);

        $grossAmount = (float) $data['amount'];
        $fee         = round($grossAmount * 0.02, 2);
        $netAmount   = round($grossAmount - $fee, 2);

        DB::transaction(function () use ($user, $data, $grossAmount, $fee, $netAmount) {
            $user = \App\Models\User::where('id', $user->id)->lockForUpdate()->first();

            if ($user->commission_balance < $grossAmount) {
                throw new \Exception('Insufficient commission balance.');
            }

            $user->decrement('commission_balance', $grossAmount);

            ShopWithdrawal::create([
                'user_id'         => $user->id,
                'amount'          => $netAmount,
                'withdrawal_type' => $data['withdrawal_type'],
                'momo_name'       => $data['withdrawal_type'] === 'momo' ? $data['momo_name'] : null,
                'momo_network'    => $data['withdrawal_type'] === 'momo' ? $data['momo_network'] : null,
                'momo_number'     => $data['withdrawal_type'] === 'momo' ? $data['momo_number'] : null,
            ]);
        });

        return back()->with('success', 'Withdrawal request submitted successfully.');
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private function authorizeShopProduct(ShopProduct $shopProduct): void
    {
        $shop = $this->userShop();
        abort_if(!$shop || $shopProduct->shop_id !== $shop->id, 403);
    }
}
