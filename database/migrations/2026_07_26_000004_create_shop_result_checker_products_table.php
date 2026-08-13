<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_result_checker_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained('shops')->cascadeOnDelete();
            $table->foreignId('result_checker_product_id')->constrained('result_checker_products')->cascadeOnDelete();
            $table->decimal('agent_price', 10, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['shop_id', 'result_checker_product_id'], 'src_shop_rcp_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_result_checker_products');
    }
};
