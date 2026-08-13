<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;

class WalletController extends Controller
{
    public function index()
    {
        return Inertia::render('Dashboard/Wallet', [
            'transactions' => Transaction::where('user_id', auth()->id())
                ->where('type', 'topup') // ✅ Only Wallet Top Ups
                ->select('id', 'amount', 'status', 'type', 'description', 'reference', 'created_at')
                ->latest()
                ->paginate(10),
        ]);
    }

    public function verifyPayment(Request $request)
    {
        \Log::info('verifyPayment method called', ['request_data' => $request->all(), 'user_id' => auth()->id()]);
        
        $request->validate([
            'reference' => 'required|string'
        ]);

        $reference = $request->reference;
        $userId = auth()->id();

        try {
            // Call Paystack Verify API first (outside DB transaction to avoid holding lock during HTTP call)
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . config('paystack.secret_key'),
                'Content-Type' => 'application/json',
            ])->get("https://api.paystack.co/transaction/verify/{$reference}");

            $paystackData = $response->json();

            \Log::info('Paystack API response', ['status_code' => $response->status(), 'response' => $paystackData]);

            if (!$response->successful() || !($paystackData['status'] ?? false) || ($paystackData['data']['status'] ?? '') !== 'success') {
                return back()->withErrors(['reference' => 'Payment verification failed or transaction not successful']);
            }

            // Verify the amount Paystack reports matches what we stored (prevent amount tampering)
            $paystackAmountKobo = $paystackData['data']['amount'] ?? 0;

            $credited = DB::transaction(function () use ($reference, $userId, $paystackData, $paystackAmountKobo) {
                // Lock the transaction row to prevent concurrent verify calls
                $transaction = Transaction::where('reference', $reference)
                    ->where('user_id', $userId)
                    ->where('type', 'topup')
                    ->lockForUpdate()
                    ->first();

                if (!$transaction) {
                    return 'not_found';
                }

                if ($transaction->status === 'completed') {
                    return 'already_completed';
                }

                // Use requested_amount (pre-fee) for comparison; fall back to amount if not present
                $requestedKobo = $paystackData['data']['requested_amount'] ?? $paystackAmountKobo;
                $expectedKobo = (int) round($transaction->amount * 100);
                if ($requestedKobo !== $expectedKobo) {
                    \Log::warning('Amount mismatch on verify', [
                        'expected_kobo'   => $expectedKobo,
                        'requested_kobo'  => $requestedKobo,
                        'paystack_kobo'   => $paystackAmountKobo,
                        'reference'       => $transaction->reference,
                    ]);
                    return 'amount_mismatch';
                }

                $transaction->update([
                    'status' => 'completed',
                    'reference' => $paystackData['data']['reference'] ?? $transaction->reference,
                ]);

                // Atomic increment — no read-modify-write race
                User::where('id', $userId)->increment('wallet_balance', $transaction->amount);

                return 'credited';
            });

            if ($credited === 'not_found') {
                \Log::info('Transaction not found', ['reference' => $reference, 'user_id' => $userId]);
                return back()->withErrors(['reference' => 'Transaction not found']);
            }

            if ($credited === 'already_completed') {
                \Log::info('Transaction already completed', ['reference' => $reference]);
                return back()->withErrors(['reference' => 'Transaction already verified']);
            }

            if ($credited === 'amount_mismatch') {
                return back()->withErrors(['reference' => 'Payment amount mismatch. Contact support.']);
            }

            return back()->with('success', 'Payment verified and balance updated');

        } catch (\Exception $e) {
            return back()->withErrors(['reference' => 'Error verifying payment: ' . $e->getMessage()]);
        }
    }


}

