<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shop_withdrawals', function (Blueprint $table) {
            $table->enum('withdrawal_type', ['momo', 'wallet'])->default('momo')->after('amount');
            $table->string('momo_name')->nullable()->after('withdrawal_type');
            $table->enum('momo_network', ['MTN', 'Telecel'])->nullable()->after('momo_name');
            $table->string('momo_number')->nullable()->after('momo_network');

            // make bank fields nullable since wallet type won't use them
            $table->string('account_number')->nullable()->change();
            $table->string('account_name')->nullable()->change();
            $table->string('bank_name')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('shop_withdrawals', function (Blueprint $table) {
            $table->dropColumn(['withdrawal_type', 'momo_name', 'momo_network', 'momo_number']);
            $table->string('account_number')->nullable(false)->change();
            $table->string('account_name')->nullable(false)->change();
            $table->string('bank_name')->nullable(false)->change();
        });
    }
};
