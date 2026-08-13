<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopWithdrawal extends Model
{
    protected $fillable = [
        'user_id', 'amount', 'withdrawal_type',
        'momo_name', 'momo_network', 'momo_number',
        'account_number', 'account_name', 'bank_name',
        'status', 'admin_note',
    ];

    protected $casts = ['amount' => 'decimal:2'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
