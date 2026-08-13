<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopOrderItem extends Model
{
    protected $fillable = [
        'shop_order_id', 'shop_product_id', 'beneficiary_number', 'unit_price', 'cost_price',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
    ];

    public function order()
    {
        return $this->belongsTo(ShopOrder::class, 'shop_order_id');
    }

    public function shopProduct()
    {
        return $this->belongsTo(ShopProduct::class);
    }
}
