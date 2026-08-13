<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referral_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referrer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('referred_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['registered', 'converted'])->default('registered');
            $table->decimal('commission_earned', 10, 2)->default(0);
            $table->timestamp('converted_at')->nullable();
            $table->timestamps();

            $table->unique('referred_id'); // one referral log per referred user
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_logs');
    }
};
