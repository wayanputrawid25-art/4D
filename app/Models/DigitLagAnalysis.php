<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DigitLagAnalysis extends Model
{
    use HasFactory;

    protected $table = 'digit_lag_analysis';

    protected $fillable = [
        'position',
        'previous_digit',
        'current_digit',
        'difference',
    ];

    protected $casts = [
        'previous_digit' => 'integer',
        'current_digit' => 'integer',
        'difference' => 'integer',
    ];

    public const POSITION_AS = 'as';
    public const POSITION_KOP = 'kop';
    public const POSITION_KEPALA = 'kepala';
    public const POSITION_EKOR = 'ekor';

    public static array $positions = [
        self::POSITION_AS,
        self::POSITION_KOP,
        self::POSITION_KEPALA,
        self::POSITION_EKOR,
    ];

    public function result()
    {
        return $this->belongsTo(Result::class);
    }
}
