<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('results', function (Blueprint $table) {
            $table->id();
            $table->string('result_4d', 4);
            $table->unsignedTinyInteger('as_digit');
            $table->unsignedTinyInteger('kop_digit');
            $table->unsignedTinyInteger('kepala_digit');
            $table->unsignedTinyInteger('ekor_digit');
            $table->date('draw_date')->nullable();
            $table->timestamps();

            $table->index('result_4d');
            $table->index('draw_date');
            $table->index('as_digit');
            $table->index('kop_digit');
            $table->index('kepala_digit');
            $table->index('ekor_digit');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('results');
    }
};
