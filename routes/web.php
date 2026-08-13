<?php

use App\Http\Controllers\BecomeAgentController;
use App\Http\Controllers\ResultCheckerController;
use App\Http\Controllers\Admin\ResultCheckerProductController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\ShopController;
use App\Http\Controllers\ShopStorefrontController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\JoinUsController;
use App\Http\Controllers\OrdersController;
use App\Http\Controllers\TransactionsController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\AFAController;
use App\Http\Controllers\ApiDocsController;
use App\Http\Controllers\TermsController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::get('/become_an_agent', function () {
        return Inertia::render('become_an_agent', [
            'agent_registration_fee' => (float) \App\Models\Setting::get('agent_registration_fee', 50),
        ]);
    })->name('become_an_agent');

Route::middleware(['auth'])->group(function () {
    Route::post('/become_an_agent', [BecomeAgentController::class, 'update'])->name('become_an_agent.update');
});
Route::get('/agent/callback', [BecomeAgentController::class, 'handleAgentCallback'])->name('agent.callback');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard/wallet', [WalletController::class, 'index'])->name('dashboard.wallet');
    Route::get('/dashboard/joinUs', [JoinUsController::class, 'index'])->name('dashboard.joinUs');
    Route::get('/dashboard/orders', [OrdersController::class, 'index'])->name('dashboard.orders');
    Route::get('/dashboard/transactions', [TransactionsController::class, 'index'])->name('dashboard.transactions');
    Route::get('/dashboard/afa-registration', [AFAController::class, 'index'])->name('dashboard.afa');
    Route::post('/dashboard/afa-registration', [AFAController::class, 'store'])->name('dashboard.afa.store');
    Route::get('/dashboard/afa-orders', [AFAController::class, 'afaOrders'])->name('dashboard.afa.orders');
    Route::get('/dashboard/api-docs', [ApiDocsController::class, 'index'])->name('dashboard.api-docs');
    Route::get('/dashboard/terms', [TermsController::class, 'index'])->name('dashboard.terms');

    // Result Checker routes
    Route::get('/dashboard/result-checker', [ResultCheckerController::class, 'index'])->name('dashboard.result-checker');
    Route::post('/dashboard/result-checker/purchase', [ResultCheckerController::class, 'purchase'])->name('dashboard.result-checker.purchase');

    // Cart routes
    Route::post('/add-to-cart', [CartController::class, 'store'])->name('add.to.cart');
    Route::get('/cart', [CartController::class, 'index'])->name('cart.index');
    Route::delete('/cart/{cart}', [CartController::class, 'destroy'])->name('remove.from.cart');
    Route::post('/process-excel-to-cart', [CartController::class, 'processExcelToCart']);
    Route::post('/process-bulk-to-cart', [CartController::class, 'processBulkToCart']);

    // Wallet balance route
    Route::post('/dashboard/wallet/add', [DashboardController::class, 'addToWallet'])->name('dashboard.wallet.add');
    Route::get('/wallet/callback', [DashboardController::class, 'handleWalletCallback'])->name('wallet.callback');
    Route::post('/dashboard/wallet/verify', [WalletController::class, 'verifyPayment'])->name('dashboard.wallet.verify');
    
    // Bundle sizes API
    Route::get('/api/bundle-sizes', [DashboardController::class, 'getBundleSizes'])->name('api.bundle-sizes');

    // ❌ REMOVED THE DUPLICATE ADMIN ROUTE FROM HERE
    // Route::get('/admin/dashboard', [\App\Http\Controllers\AdminDashboardController::class, 'index'])->name('admin.dashboard');
});

// Checkout route
Route::middleware(['auth'])->group(function () {
    Route::get('/checkout', [CheckoutController::class, 'index'])->name('checkout.index');
    Route::post('/place_order', [OrdersController::class, 'checkout'])->name('checkout.process');
});

// Admin routes - This is the correct group with role middleware
Route::middleware(['auth', 'verified', 'role:admin'])->name('admin.')->group(function () {
    Route::get('admin/dashboard', [\App\Http\Controllers\AdminDashboardController::class, 'index'])->name('dashboard');
    Route::get('admin/users', [\App\Http\Controllers\AdminDashboardController::class, 'users'])->name('users');
    Route::post('admin/users', [\App\Http\Controllers\AdminDashboardController::class, 'storeUser'])->name('users.store');
    Route::put('admin/users/{user}', [\App\Http\Controllers\AdminDashboardController::class, 'updateUserRole'])->name('users.updateRole');
    Route::delete('admin/users/{user}', [\App\Http\Controllers\AdminDashboardController::class, 'deleteUser'])->name('users.delete');
    Route::post('admin/users/{user}/credit', [\App\Http\Controllers\AdminDashboardController::class, 'creditWallet'])->name('users.credit');
    Route::post('admin/users/{user}/debit', [\App\Http\Controllers\AdminDashboardController::class, 'debitWallet'])->name('users.debit');
    Route::get('admin/products', [\App\Http\Controllers\AdminDashboardController::class, 'products'])->name('products');
    Route::post('admin/products', [\App\Http\Controllers\AdminDashboardController::class, 'storeProduct'])->name('products.store');
    Route::put('admin/products/{product}', [\App\Http\Controllers\AdminDashboardController::class, 'updateProduct'])->name('products.update');
    Route::delete('admin/products/{product}', [\App\Http\Controllers\AdminDashboardController::class, 'deleteProduct'])->name('products.delete');
    Route::get('admin/variations', [\App\Http\Controllers\Admin\VariationAttributeController::class, 'index'])->name('variations');
    Route::post('admin/variation-attributes', [\App\Http\Controllers\Admin\VariationAttributeController::class, 'store'])->name('variation-attributes.store');
    Route::put('admin/variation-attributes/{variationAttribute}', [\App\Http\Controllers\Admin\VariationAttributeController::class, 'update'])->name('variation-attributes.update');
    Route::delete('admin/variation-attributes/{variationAttribute}', [\App\Http\Controllers\Admin\VariationAttributeController::class, 'destroy'])->name('variation-attributes.delete');
    Route::get('admin/orders', [\App\Http\Controllers\AdminDashboardController::class, 'orders'])->name('orders');
    Route::delete('admin/orders/{order}', [\App\Http\Controllers\AdminDashboardController::class, 'deleteOrder'])->name('orders.delete');
    Route::put('admin/orders/bulk-status', [\App\Http\Controllers\AdminDashboardController::class, 'bulkUpdateOrderStatus'])->name('orders.bulkUpdateStatus');
    Route::put('admin/orders/{order}/status', [\App\Http\Controllers\AdminDashboardController::class, 'updateOrderStatus'])->name('orders.updateStatus');
    Route::put('admin/shop-orders/{shopOrder}/status', [\App\Http\Controllers\AdminDashboardController::class, 'updateShopOrderStatus'])->name('shop-orders.updateStatus');
    Route::get('admin/transactions', [\App\Http\Controllers\AdminDashboardController::class, 'transactions'])->name('transactions');
    Route::get('admin/users/{user}/transactions', [\App\Http\Controllers\AdminDashboardController::class, 'userTransactions'])->name('users.transactions');
    Route::post('admin/orders/export', [\App\Http\Controllers\AdminDashboardController::class, 'exportOrders'])->name('orders.export');
    Route::get('admin/afa-products', [\App\Http\Controllers\Admin\AFAProductController::class, 'index'])->name('afa-products');
    Route::post('admin/afa-products', [\App\Http\Controllers\Admin\AFAProductController::class, 'store'])->name('afa-products.store');
    Route::put('admin/afa-products/{afaProduct}', [\App\Http\Controllers\Admin\AFAProductController::class, 'update'])->name('afa-products.update');
    Route::delete('admin/afa-products/{afaProduct}', [\App\Http\Controllers\Admin\AFAProductController::class, 'destroy'])->name('afa-products.destroy');
    Route::get('admin/afa-orders', [\App\Http\Controllers\AdminDashboardController::class, 'afaOrders'])->name('afa-orders');
    Route::put('admin/afa-orders/{order}/status', [\App\Http\Controllers\AdminDashboardController::class, 'updateAfaOrderStatus'])->name('afa.orders.updateStatus');
    Route::post('admin/toggle-jaybart-order-pusher', [\App\Http\Controllers\AdminDashboardController::class, 'toggleJaybartOrderPusher'])->name('toggle.jaybart.order.pusher');
    Route::post('admin/toggle-codecraft-order-pusher', [\App\Http\Controllers\AdminDashboardController::class, 'toggleCodecraftOrderPusher'])->name('toggle.codecraft.order.pusher');
    Route::post('admin/toggle-etopup-order-pusher', [\App\Http\Controllers\AdminDashboardController::class, 'toggleEtopupOrderPusher'])->name('toggle.etopup.order.pusher');
    Route::post('admin/toggle-unibundlegh-order-pusher', [\App\Http\Controllers\AdminDashboardController::class, 'toggleUniBundleGHOrderPusher'])->name('toggle.unibundlegh.order.pusher');
    Route::get('admin/alerts', [\App\Http\Controllers\Admin\AlertController::class, 'index'])->name('alerts');
    Route::post('admin/alerts', [\App\Http\Controllers\Admin\AlertController::class, 'store'])->name('alerts.store');
    Route::put('admin/alerts/{alert}', [\App\Http\Controllers\Admin\AlertController::class, 'update'])->name('alerts.update');
    Route::delete('admin/alerts/{alert}', [\App\Http\Controllers\Admin\AlertController::class, 'destroy'])->name('alerts.delete');
    Route::post('admin/alerts/{alert}/toggle', [\App\Http\Controllers\Admin\AlertController::class, 'toggleActive'])->name('alerts.toggle');
    // Shop withdrawals
    Route::get('admin/shops', [\App\Http\Controllers\AdminDashboardController::class, 'shops'])->name('shops');
    Route::patch('admin/shops/{shop}/toggle', [\App\Http\Controllers\AdminDashboardController::class, 'toggleShop'])->name('shops.toggle');
    Route::get('admin/shop-withdrawals', [\App\Http\Controllers\Admin\ShopWithdrawalController::class, 'index'])->name('shop-withdrawals');
    Route::post('admin/shop-withdrawals/{shopWithdrawal}/approve', [\App\Http\Controllers\Admin\ShopWithdrawalController::class, 'approve'])->name('shop-withdrawals.approve');
    Route::post('admin/shop-withdrawals/{shopWithdrawal}/reject', [\App\Http\Controllers\Admin\ShopWithdrawalController::class, 'reject'])->name('shop-withdrawals.reject');
    Route::post('admin/shop-settings', [\App\Http\Controllers\Admin\ShopWithdrawalController::class, 'updateSettings'])->name('shop-settings.update');

    // Result Checker admin routes
    Route::get('admin/result-checker-products', [ResultCheckerProductController::class, 'index'])->name('result-checker-products.index');
    Route::post('admin/result-checker-products', [ResultCheckerProductController::class, 'store'])->name('result-checker-products.store');
    Route::put('admin/result-checker-products/{resultCheckerProduct}', [ResultCheckerProductController::class, 'update'])->name('result-checker-products.update');
    Route::delete('admin/result-checker-products/{resultCheckerProduct}', [ResultCheckerProductController::class, 'destroy'])->name('result-checker-products.destroy');
    Route::get('admin/result-checker-orders', [ResultCheckerProductController::class, 'orders'])->name('result-checker-orders.index');
    Route::get('admin/result-checker-products/{resultCheckerProduct}/vouchers', [ResultCheckerProductController::class, 'vouchers'])->name('result-checker-vouchers.index');
    Route::post('admin/result-checker-products/{resultCheckerProduct}/vouchers', [ResultCheckerProductController::class, 'uploadVouchers'])->name('result-checker-vouchers.upload');
    Route::delete('admin/result-checker-vouchers/{voucher}', [ResultCheckerProductController::class, 'deleteVoucher'])->name('result-checker-vouchers.delete');
});

// Shop owner dashboard routes (auth required)
Route::middleware(['auth', 'verified'])->prefix('dashboard/shop')->name('shop.')->group(function () {
    Route::get('/', [ShopController::class, 'dashboard'])->name('dashboard');
    Route::get('/create', [ShopController::class, 'createShop'])->name('create');
    Route::post('/create', [ShopController::class, 'storeShop'])->name('store');
    Route::get('/edit', [ShopController::class, 'editShop'])->name('edit');
    Route::post('/edit', [ShopController::class, 'updateShop'])->name('update');
    Route::get('/products', [ShopController::class, 'products'])->name('products');
    Route::post('/products', [ShopController::class, 'addProduct'])->name('products.add');
    Route::put('/products/{shopProduct}', [ShopController::class, 'updateProduct'])->name('products.update');
    Route::delete('/products/{shopProduct}', [ShopController::class, 'removeProduct'])->name('products.remove');
    // Result checker management
    Route::post('/result-checkers', [ShopController::class, 'addResultChecker'])->name('result-checkers.add');
    Route::put('/result-checkers/{shopResultChecker}', [ShopController::class, 'updateResultChecker'])->name('result-checkers.update');
    Route::delete('/result-checkers/{shopResultChecker}', [ShopController::class, 'removeResultChecker'])->name('result-checkers.remove');
    Route::get('/orders', [ShopController::class, 'orders'])->name('orders');
    Route::get('/commissions', [ShopController::class, 'commissions'])->name('commissions');
    Route::get('/referrals', [ShopController::class, 'referrals'])->name('referrals');
    Route::get('/withdrawals', [ShopController::class, 'withdrawals'])->name('withdrawals');
    Route::post('/withdrawals', [ShopController::class, 'requestWithdrawal'])->name('withdrawals.request');
});

// Public storefront routes (no auth)
Route::prefix('store')->name('shop.')->group(function () {
    Route::get('/{slug}', [ShopStorefrontController::class, 'show'])->name('storefront');
    Route::post('/{slug}/checkout', [ShopStorefrontController::class, 'initializePayment'])->name('storefront.checkout');
    Route::get('/{slug}/callback', [ShopStorefrontController::class, 'handleCallback'])->name('storefront.callback');
    Route::get('/{slug}/success', [ShopStorefrontController::class, 'orderSuccess'])->name('storefront.callback.success');
    Route::post('/{slug}/purchase-result-checker', [ShopStorefrontController::class, 'purchaseResultCheckerFromShop'])->name('purchase.result-checker');
    Route::get('/{slug}/track', [ShopStorefrontController::class, 'showTrackPage'])->name('storefront.track.page');
    Route::post('/{slug}/track', [ShopStorefrontController::class, 'trackOrder'])->name('storefront.track');
    Route::post('/{slug}/create-from-payment', [ShopStorefrontController::class, 'createOrderFromPayment'])->name('storefront.create-from-payment');
});

Route::get('/payment', function () {
    return view('payment');
})->name('payment');
Route::post('/payment/initialize', [PaymentController::class, 'initializePayment'])->name('payment.initialize');
Route::get('/payment/callback', [PaymentController::class, 'handleCallback'])->name('payment.callback');
Route::get('/payment/success', function () { return 'Payment Successful!'; })->name('payment.success');
Route::get('/payment/failed', function () { return 'Payment Failed!'; })->name('payment.failed');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';