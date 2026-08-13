<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ResultCheckerProduct;
use App\Models\ResultCheckerPurchase;
use App\Models\ResultCheckerVoucher;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ResultCheckerProductController extends Controller
{
    public function index()
    {
        $products = ResultCheckerProduct::withCount([
            'vouchers as available_vouchers_count' => fn($q) => $q->where('status', 'available'),
            'vouchers as total_vouchers_count',
        ])->get();

        return Inertia::render('Admin/ResultCheckerProducts', ['products' => $products]);
    }

    public function orders(Request $request)
    {
        $search = $request->input('search');

        $orders = ResultCheckerPurchase::with(['user', 'product'])
            ->when($search, function ($q) use ($search) {
                $q->where('recipient', 'like', "%{$search}%")
                    ->orWhere('checker_type', 'like', "%{$search}%")
                    ->orWhere('client_reference', 'like', "%{$search}%")
                    ->orWhereHas('user', fn($u) => $u->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            })
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/ResultCheckerOrders', [
            'orders' => $orders,
            'search' => $search,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'checker_type' => 'required|in:WASSCE,BECE',
            'display_name' => 'nullable|string|max:255',
            'price' => 'required|numeric|min:0',
            'status' => 'required|in:active,inactive',
        ]);

        ResultCheckerProduct::create($request->only('name', 'checker_type', 'display_name', 'price', 'status'));

        return back()->with('success', 'Product created successfully.');
    }

    public function update(Request $request, ResultCheckerProduct $resultCheckerProduct)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'checker_type' => 'required|in:WASSCE,BECE',
            'display_name' => 'nullable|string|max:255',
            'price' => 'required|numeric|min:0',
            'status' => 'required|in:active,inactive',
        ]);

        $resultCheckerProduct->update($request->only('name', 'checker_type', 'display_name', 'price', 'status'));

        return back()->with('success', 'Product updated successfully.');
    }

    public function destroy(ResultCheckerProduct $resultCheckerProduct)
    {
        $resultCheckerProduct->delete();

        return back()->with('success', 'Product deleted successfully.');
    }

    public function vouchers(ResultCheckerProduct $resultCheckerProduct)
    {
        $vouchers = $resultCheckerProduct->vouchers()
            ->with(['purchase' => fn($q) => $q->select('id', 'recipient', 'created_at')])
            ->latest()
            ->paginate(50);

        return Inertia::render('Admin/ResultCheckerVouchers', [
            'product' => $resultCheckerProduct,
            'vouchers' => $vouchers,
        ]);
    }

    public function uploadVouchers(Request $request, ResultCheckerProduct $resultCheckerProduct)
    {
        $request->validate(['vouchers' => 'required|string']);

        $lines = explode("\n", trim($request->vouchers));
        $rows = [];
        $now = now();

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;

            $parts = array_map('trim', explode(',', $line));
            if (count($parts) < 2 || empty($parts[0]) || empty($parts[1])) continue;

            $rows[] = [
                'result_checker_product_id' => $resultCheckerProduct->id,
                'serial' => $parts[0],
                'pin' => $parts[1],
                'code' => $parts[2] ?? null,
                'status' => 'available',
                'purchase_id' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if (empty($rows)) {
            return back()->withErrors(['vouchers' => 'No valid voucher lines found.']);
        }

        ResultCheckerVoucher::insert($rows);

        return back()->with('success', count($rows) . ' vouchers uploaded successfully.');
    }

    public function deleteVoucher(ResultCheckerVoucher $voucher)
    {
        if ($voucher->status === 'purchased') {
            return back()->withErrors(['error' => 'Cannot delete a purchased voucher.']);
        }

        $voucher->delete();

        return back()->with('success', 'Voucher deleted successfully.');
    }
}
