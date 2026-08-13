<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->enum('jaybart_api_status', ['disabled', 'success', 'failed'])->default('disabled')->after('reference_id');
            $table->enum('codecraft_api_status', ['disabled', 'success', 'failed'])->default('disabled')->after('jaybart_api_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['jaybart_api_status', 'codecraft_api_status']);
        });
    }
};