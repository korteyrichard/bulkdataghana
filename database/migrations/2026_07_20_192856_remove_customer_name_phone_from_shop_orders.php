<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shop_orders', function (Blueprint $table) {
            $table->dropColumn(['customer_name', 'customer_phone']);
        });
    }

    public function down(): void
    {
        Schema::table('shop_orders', function (Blueprint $table) {
            $table->string('customer_name')->nullable()->after('reference');
            $table->string('customer_phone')->nullable()->after('customer_email');
        });
    }
};
