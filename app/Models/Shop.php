<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Shop extends Model
{
    protected $fillable = [
        'user_id', 'name', 'slug', 'description', 'logo', 'whatsapp', 'is_active', 'primary_color', 'secondary_color',
    ];

    protected $casts = ['is_active' => 'boolean'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function shopProducts()
    {
        return $this->hasMany(ShopProduct::class);
    }

    public function shopResultCheckerProducts()
    {
        return $this->hasMany(ShopResultCheckerProduct::class);
    }

    public function activeResultCheckerProducts()
    {
        return $this->shopResultCheckerProducts()->where('is_active', true);
    }

    public function orders()
    {
        return $this->hasMany(ShopOrder::class);
    }

    public static function generateSlug(string $name): string
    {
        $slug = Str::slug($name);
        $original = $slug;
        $count = 1;
        while (static::where('slug', $slug)->exists()) {
            $slug = $original . '-' . $count++;
        }
        return $slug;
    }
}
