<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('alerts')) {
            Schema::create('alerts', function (Blueprint $table) {
                $table->id();
                $table->boolean('is_active')->default(false);
                $table->timestamp('starts_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();
            });
        } else {
            Schema::table('alerts', function (Blueprint $table) {
                if (!Schema::hasColumn('alerts', 'starts_at')) {
                    $table->timestamp('starts_at')->nullable()->after('is_active');
                }
                if (!Schema::hasColumn('alerts', 'expires_at')) {
                    $table->timestamp('expires_at')->nullable()->after('starts_at');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};
