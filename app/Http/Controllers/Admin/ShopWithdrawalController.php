<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ShopWithdrawal;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ShopWithdrawalController extends Controller
{
    public function index()
    {
        $withdrawals = ShopWithdrawal::with('user:id,name,email,phone')
            ->latest()
            ->paginate(30);

        return Inertia::render('Admin/ShopWithdrawals', [
            'withdrawals'           => $withdrawals,
            'withdrawal_limit'      => Setting::get('shop_withdrawal_limit', 50),
            'referral_commission'   => Setting::get('referral_commission', 5),
            'agent_registration_fee' => Setting::get('agent_registration_fee', 50),
        ]);
    }

    public function approve(ShopWithdrawal $shopWithdrawal)
    {
        abort_if($shopWithdrawal->status !== 'pending', 422, 'Already processed.');

        DB::transaction(function () use ($shopWithdrawal) {
            $shopWithdrawal->update(['status' => 'approved']);

            // For wallet withdrawals, credit the user's main wallet balance
            if ($shopWithdrawal->withdrawal_type === 'wallet') {
                $shopWithdrawal->user()->lockForUpdate()->first()
                    ->increment('wallet_balance', $shopWithdrawal->amount);
            }
        });

        return back()->with('success', 'Withdrawal approved.');
    }

    public function reject(Request $request, ShopWithdrawal $shopWithdrawal)
    {
        abort_if($shopWithdrawal->status !== 'pending', 422, 'Already processed.');

        $data = $request->validate(['admin_note' => 'nullable|string|max:255']);

        DB::transaction(function () use ($shopWithdrawal, $data) {
            $shopWithdrawal->update([
                'status'     => 'rejected',
                'admin_note' => $data['admin_note'] ?? null,
            ]);
            // Refund full gross amount (net + 2% fee) back to commission balance
            $gross = round($shopWithdrawal->amount / 0.98, 2);
            $shopWithdrawal->user()->lockForUpdate()->first()
                ->increment('commission_balance', $gross);
        });

        return back()->with('success', 'Withdrawal rejected and balance refunded.');
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'withdrawal_limit'       => 'required|numeric|min:1',
            'referral_commission'    => 'required|numeric|min:0',
            'agent_registration_fee' => 'required|numeric|min:1',
        ]);

        Setting::set('shop_withdrawal_limit', $data['withdrawal_limit']);
        Setting::set('referral_commission', $data['referral_commission']);
        Setting::set('agent_registration_fee', $data['agent_registration_fee']);

        return back()->with('success', 'Settings updated.');
    }
}
