<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('result_checker_vouchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('result_checker_product_id')->constrained()->onDelete('cascade');
            $table->string('serial');
            $table->string('pin');
            $table->string('code')->nullable();
            $table->enum('status', ['available', 'purchased'])->default('available');
            $table->foreignId('purchase_id')->nullable()->constrained('result_checker_purchases')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('result_checker_vouchers');
    }
};
