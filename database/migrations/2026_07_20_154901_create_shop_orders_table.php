<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->string('reference')->unique(); // store_ prefixed paystack reference
            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('customer_phone');
            $table->decimal('total_amount', 10, 2); // amount verified from Paystack
            $table->decimal('commission_amount', 10, 2)->default(0); // profit for shop owner
            $table->enum('payment_status', ['pending', 'paid', 'failed'])->default('pending');
            $table->enum('fulfillment_status', ['pending', 'processing', 'completed', 'cancelled'])->default('pending');
            $table->timestamps();

            $table->index(['reference', 'payment_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_orders');
    }
};
