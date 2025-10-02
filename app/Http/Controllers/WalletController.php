<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Transaction;

class WalletController extends Controller
{
    public function index()
    {
        return Inertia::render('Dashboard/Wallet', [
            'transactions' => Transaction::where('user_id', auth()->id())
                ->whereIn('type', ['topup', 'wallet_credit', 'wallet_debit']) // Include wallet credit/debit
                ->latest()
                ->paginate(10),
        ]);
    }
}

