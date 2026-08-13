<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopResultCheckerProduct extends Model
{
    protected $fillable = ['shop_id', 'result_checker_product_id', 'agent_price', 'is_active'];

    protected $casts = [
        'agent_price' => 'decimal:2',
        'is_active'   => 'boolean',
    ];

    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    public function resultCheckerProduct()
    {
        return $this->belongsTo(ResultCheckerProduct::class);
    }
}
