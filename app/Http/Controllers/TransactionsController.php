<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
    use App\Models\Transaction;
use Illuminate\Support\Facades\Auth;

class TransactionsController extends Controller
{
    /**
     * Display a listing of the transactions.
     */

    public function index(Request $request)
    {
        $user = Auth::user();

        $transactions = Transaction::where('user_id', $user->id)
            ->when($request->type, function ($query, $type) {
                return $query->where('type', $type);
            })
            ->latest()
            ->get();
            
        // Calculate daily stats
        $todayTopUps = Transaction::where('user_id', $user->id)
            ->whereIn('type', ['topup', 'wallet_credit'])
            ->where('status', 'completed')
            ->whereDate('created_at', today())
            ->sum('amount');
            
        $todaySales = Transaction::where('user_id', $user->id)
            ->where('type', 'order')
            ->where('status', 'completed')
            ->whereDate('created_at', today())
            ->sum('amount');

        return inertia('Dashboard/transactions', [
            'transactions' => $transactions,
            'todayTopUps' => $todayTopUps ?? 0,
            'todaySales' => $todaySales ?? 0,
            'filterType' => $request->type ?? '',
        ]);
    }

}
