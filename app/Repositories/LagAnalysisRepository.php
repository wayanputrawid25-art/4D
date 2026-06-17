<?php

namespace App\Repositories;

use App\Models\DigitLagAnalysis;
use Illuminate\Support\Collection;

class LagAnalysisRepository
{
    public function __construct(
        protected DigitLagAnalysis $model
    ) {}

    public function getByPosition(string $position): Collection
    {
        return $this->model->where('position', $position)->get();
    }

    public function getChangeStats(string $position): array
    {
        $stats = $this->model->where('position', $position)
            ->select('difference', \DB::raw('COUNT(*) as count'))
            ->groupBy('difference')
            ->pluck('count', 'difference')
            ->toArray();

        return [
            'minus_2' => $stats[-2] ?? 0,
            'minus_1' => $stats[-1] ?? 0,
            'zero' => $stats[0] ?? 0,
            'plus_1' => $stats[1] ?? 0,
            'plus_2' => $stats[2] ?? 0,
        ];
    }

    public function getAverageChange(string $position): float
    {
        return round($this->model->where('position', $position)->avg('difference') ?? 0, 2);
    }

    public function getDigitTransitionMatrix(string $position): array
    {
        $transitions = $this->model->where('position', $position)
            ->select('previous_digit', 'current_digit', \DB::raw('COUNT(*) as count'))
            ->groupBy('previous_digit', 'current_digit')
            ->get();

        $matrix = [];
        for ($i = 0; $i < 10; $i++) {
            for ($j = 0; $j < 10; $j++) {
                $matrix[$i][$j] = 0;
            }
        }

        foreach ($transitions as $t) {
            $matrix[$t->previous_digit][$t->current_digit] = $t->count;
        }

        return $matrix;
    }

    public function store(array $data): DigitLagAnalysis
    {
        return $this->model->create($data);
    }

    public function bulkStore(array $data): int
    {
        $this->model->insert($data);
        return count($data);
    }

    public function truncate(): void
    {
        $this->model->truncate();
    }
}
