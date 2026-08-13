<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResultCheckerPurchase extends Model
{
    protected $fillable = [
        'user_id', 'result_checker_product_id', 'checker_type', 'display_name',
        'recipient', 'quantity', 'unit_price', 'total_amount', 'transaction_id',
        'client_reference', 'status', 'checkers', 'raw_response',
    ];

    protected $casts = [
        'checkers' => 'array',
        'raw_response' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(ResultCheckerProduct::class, 'result_checker_product_id');
    }
}
