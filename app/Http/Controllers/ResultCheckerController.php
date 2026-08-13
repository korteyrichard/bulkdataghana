<?php

namespace App\Http\Controllers;

use App\Models\ResultCheckerProduct;
use App\Models\ResultCheckerPurchase;
use App\Models\ResultCheckerVoucher;
use App\Services\MoolreSmsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ResultCheckerController extends Controller
{
    public function index()
    {
        $products = ResultCheckerProduct::where('status', 'active')
            ->withCount(['vouchers as available_vouchers_count' => fn($q) => $q->where('status', 'available')])
            ->get();

        $purchases = ResultCheckerPurchase::where('user_id', Auth::id())
            ->with('product')
            ->latest()
            ->paginate(10);

        return Inertia::render('Dashboard/ResultChecker', [
            'products' => $products,
            'purchases' => $purchases,
        ]);
    }

    public function purchase(Request $request, MoolreSmsService $sms)
    {
        $request->validate([
            'result_checker_product_id' => 'required|exists:result_checker_products,id',
            'recipient' => 'required|digits:10',
            'quantity' => 'required|integer|min:1|max:30',
        ]);

        $user = Auth::user();
        $product = ResultCheckerProduct::findOrFail($request->result_checker_product_id);
        $quantity = (int) $request->quantity;
        $total = $product->price * $quantity;

        if ($user->wallet_balance < $total) {
            return back()->withErrors(['wallet' => 'Insufficient wallet balance.']);
        }

        $availableCount = ResultCheckerVoucher::where('result_checker_product_id', $product->id)
            ->where('status', 'available')
            ->count();

        if ($availableCount < $quantity) {
            return back()->withErrors(['stock' => 'Not enough vouchers in stock.']);
        }

        try {
            DB::transaction(function () use ($user, $product, $quantity, $total, $request, $sms) {
                $freshUser = \App\Models\User::lockForUpdate()->find($user->id);

                if ($freshUser->wallet_balance < $total) {
                    throw new \Exception('Insufficient wallet balance.');
                }

                $vouchers = ResultCheckerVoucher::where('result_checker_product_id', $product->id)
                    ->where('status', 'available')
                    ->lockForUpdate()
                    ->limit($quantity)
                    ->get();

                if ($vouchers->count() < $quantity) {
                    throw new \Exception('Not enough vouchers in stock.');
                }

                $freshUser->wallet_balance -= $total;
                $freshUser->save();

                $checkers = $vouchers->map(fn($v) => [
                    'serial' => $v->serial,
                    'pin' => $v->pin,
                    'code' => $v->code ?? ($v->serial . '-' . $v->pin),
                ])->toArray();

                $reference = 'RC_' . time() . '_' . $freshUser->id;

                $purchase = ResultCheckerPurchase::create([
                    'user_id' => $freshUser->id,
                    'result_checker_product_id' => $product->id,
                    'checker_type' => $product->checker_type,
                    'display_name' => $product->display_name,
                    'recipient' => $request->recipient,
                    'quantity' => $quantity,
                    'unit_price' => $product->price,
                    'total_amount' => $total,
                    'transaction_id' => null,
                    'client_reference' => $reference,
                    'status' => 'COMPLETED',
                    'checkers' => $checkers,
                    'raw_response' => null,
                ]);

                ResultCheckerVoucher::whereIn('id', $vouchers->pluck('id'))
                    ->update(['status' => 'purchased', 'purchase_id' => $purchase->id]);

                $cardLines = collect($checkers)->map(fn($c, $i) =>
                    'Card ' . ($i + 1) . ': Serial: ' . $c['serial'] . ', PIN: ' . $c['pin']
                )->implode("\n");

                $message = "Your {$product->display_name} Result Checker Card(s):\n{$cardLines}\nThank you for your purchase!";
                $sms->sendSms($request->recipient, $message);
            });

            return redirect()->route('dashboard.result-checker')->with('success', 'Purchase successful! Your cards have been sent via SMS.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
