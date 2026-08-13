<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('result_checker_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('result_checker_product_id')->constrained()->onDelete('cascade');
            $table->string('checker_type');
            $table->string('display_name')->nullable();
            $table->string('recipient', 20);
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('total_amount', 10, 2);
            $table->string('transaction_id')->nullable();
            $table->string('client_reference')->nullable();
            $table->enum('status', ['COMPLETED', 'FAILED', 'PENDING'])->default('PENDING');
            $table->json('checkers');
            $table->json('raw_response')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('result_checker_purchases');
    }
};
