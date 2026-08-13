<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResultCheckerProduct extends Model
{
    protected $fillable = ['name', 'checker_type', 'display_name', 'price', 'status'];

    public function purchases()
    {
        return $this->hasMany(ResultCheckerPurchase::class);
    }

    public function vouchers()
    {
        return $this->hasMany(ResultCheckerVoucher::class);
    }

    public function availableVouchersCount(): int
    {
        return $this->vouchers()->where('status', 'available')->count();
    }
}
