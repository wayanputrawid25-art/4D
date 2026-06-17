<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Result extends Model
{
    use HasFactory;

    protected $table = 'results';

    protected $fillable = [
        'result_4d',
        'as_digit',
        'kop_digit',
        'kepala_digit',
        'ekor_digit',
        'draw_date',
    ];

    protected $casts = [
        'draw_date' => 'date',
        'as_digit' => 'integer',
        'kop_digit' => 'integer',
        'kepala_digit' => 'integer',
        'ekor_digit' => 'integer',
    ];

    public static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            // Auto-extract digits from 4D number
            if ($model->result_4d && strlen($model->result_4d) === 4) {
                $model->as_digit = (int) $model->result_4d[0];
                $model->kop_digit = (int) $model->result_4d[1];
                $model->kepala_digit = (int) $model->result_4d[2];
                $model->ekor_digit = (int) $model->result_4d[3];
            }
        });
    }

    public function lagAnalyses()
    {
        return $this->hasMany(DigitLagAnalysis::class);
    }
}
