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
            // Check if columns exist before dropping
            if (Schema::hasColumn('orders', 'jaybart_api_status')) {
                $table->dropColumn('jaybart_api_status');
            }
            if (Schema::hasColumn('orders', 'codecraft_api_status')) {
                $table->dropColumn('codecraft_api_status');
            }
            // Add new column if it doesn't exist
            if (!Schema::hasColumn('orders', 'api_status')) {
                $table->enum('api_status', ['disabled', 'success', 'failed'])->default('disabled')->after('reference_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('api_status');
            $table->enum('jaybart_api_status', ['disabled', 'success', 'failed'])->default('disabled')->after('reference_id');
            $table->enum('codecraft_api_status', ['disabled', 'success', 'failed'])->default('disabled')->after('jaybart_api_status');
        });
    }
};