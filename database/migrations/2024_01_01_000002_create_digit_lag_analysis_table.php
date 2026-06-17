<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('digit_lag_analysis', function (Blueprint $table) {
            $table->id();
            $table->enum('position', ['as', 'kop', 'kepala', 'ekor']);
            $table->unsignedTinyInteger('previous_digit');
            $table->unsignedTinyInteger('current_digit');
            $table->integer('difference'); // Can be negative
            $table->timestamp('created_at')->useCurrent();

            $table->index('position');
            $table->index('previous_digit');
            $table->index('current_digit');
            $table->index('difference');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('digit_lag_analysis');
    }
};
