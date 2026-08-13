<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Models\Transaction;
use App\Models\CommissionLog;
use App\Models\ReferralLog;
use Illuminate\Support\Facades\Redirect;

class BecomeAgentController extends Controller
{
    public function update(Request $request)
    {
        $user = Auth::user();
        if (!$user || $user->role !== 'customer') {
            return back()->withErrors(['message' => 'Unable to become an agent.']);
        }

        $reference = 'agent_' . Str::random(16);
        
        $registrationFee = (float) \App\Models\Setting::get('agent_registration_fee', 50);
        $transactionFee  = round($registrationFee * 0.01, 2);
        $totalAmount     = $registrationFee + $transactionFee;
        
        // Store pending transaction
        $transaction = Transaction::create([
            'user_id'     => $user->id,
            'order_id'    => null,
            'amount'      => $registrationFee,
            'status'      => 'pending',
            'type'        => 'agent_fee',
            'description' => 'Agent registration fee of GHS ' . number_format($registrationFee, 2) . ' (+ GHS ' . number_format($transactionFee, 2) . ' fee)',
            'reference'   => $reference,
        ]);
        
        // Initialize Paystack payment
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('paystack.secret_key'),
            'Content-Type'  => 'application/json',
        ])->post('https://api.paystack.co/transaction/initialize', [
            'email'        => $user->email,
            'amount'       => $totalAmount * 100,
            'callback_url' => route('agent.callback'),
            'reference'    => $reference,
            'metadata'     => [
                'user_id'          => $user->id,
                'transaction_id'   => $transaction->id,
                'type'             => 'agent_registration',
                'actual_amount'    => $registrationFee,
                'transaction_fee'  => $transactionFee,
            ]
        ]);

        if ($response->successful()) {
            $paymentUrl = $response->json('data.authorization_url');
            return \Inertia\Inertia::location($paymentUrl);
        }

        $transaction->update(['status' => 'failed']);
        return back()->withErrors(['message' => 'Payment initialization failed']);
    }

    public function handleAgentCallback(Request $request)
    {
        $reference = $request->reference;
        
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('paystack.secret_key'),
        ])->get("https://api.paystack.co/transaction/verify/{$reference}");

        if ($response->successful() && $response->json('data.status') === 'success') {
            $paymentData = $response->json('data');
            $metadata = $paymentData['metadata'];
            
            $transaction = Transaction::find($metadata['transaction_id']);
            $user = \App\Models\User::find($metadata['user_id']);
            
            if ($transaction && $transaction->status === 'pending' && $user && $user->role === 'customer') {
                // Update user role to agent
                $user->role = 'agent';
                $user->save();

                // Update transaction status
                $transaction->update(['status' => 'completed']);

                // Credit referral commission to referrer if applicable
                $referralCommission = (float) \App\Models\Setting::get('referral_commission', 5);
                if ($user->referred_by && $referralCommission > 0) {
                    $referrer = \App\Models\User::where('id', $user->referred_by)
                        ->lockForUpdate()
                        ->first();

                    if ($referrer) {
                        $referrer->increment('commission_balance', $referralCommission);

                        // Update or create referral log
                        $referralLog = ReferralLog::updateOrCreate(
                            ['referred_id' => $user->id],
                            [
                                'referrer_id'       => $referrer->id,
                                'status'            => 'converted',
                                'commission_earned' => $referralCommission,
                                'converted_at'      => now(),
                            ]
                        );

                        // Log the commission
                        CommissionLog::create([
                            'user_id'     => $referrer->id,
                            'amount'      => $referralCommission,
                            'type'        => 'referral',
                            'description' => 'Referral commission — ' . $user->name . ' became an agent',
                            'source_type' => ReferralLog::class,
                            'source_id'   => $referralLog->id,
                        ]);
                    }
                }
            }
        }

        return redirect()->route('dashboard')->with('success', 'You are now an agent!');
    }
}
