<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralLog extends Model
{
    protected $fillable = ['referrer_id', 'referred_id', 'status', 'commission_earned', 'converted_at'];

    protected $casts = [
        'commission_earned' => 'decimal:2',
        'converted_at'      => 'datetime',
    ];

    public function referrer()
    {
        return $this->belongsTo(User::class, 'referrer_id');
    }

    public function referred()
    {
        return $this->belongsTo(User::class, 'referred_id');
    }
}
