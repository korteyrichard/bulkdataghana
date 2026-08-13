<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->index('status');
            $table->index('network');
            $table->index('created_at');
            $table->index('beneficiary_number');
        });

        Schema::table('shop_orders', function (Blueprint $table) {
            $table->index('fulfillment_status');
            $table->index('payment_status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['network']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['beneficiary_number']);
        });

        Schema::table('shop_orders', function (Blueprint $table) {
            $table->dropIndex(['fulfillment_status']);
            $table->dropIndex(['payment_status']);
            $table->dropIndex(['created_at']);
        });
    }
};
