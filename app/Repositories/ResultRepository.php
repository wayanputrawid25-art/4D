<?php

namespace App\Repositories;

use App\Models\Result;
use Illuminate\Support\Collection;

class ResultRepository
{
    public function __construct(
        protected Result $model
    ) {}

    public function getAll()
    {
        return $this->model->orderBy('draw_date', 'desc');
    }

    public function getRecent(int $limit = 10)
    {
        return $this->model->orderBy('draw_date', 'desc')->limit($limit)->get();
    }

    public function getByPeriod(string $period)
    {
        $query = $this->model->query();

        switch ($period) {
            case 'day':
                $query->whereDate('draw_date', today());
                break;
            case 'week':
                $query->whereBetween('draw_date', [now()->startOfWeek(), now()->endOfWeek()]);
                break;
            case 'month':
                $query->whereMonth('draw_date', now()->month)->whereYear('draw_date', now()->year);
                break;
            case 'year':
                $query->whereYear('draw_date', now()->year);
                break;
        }

        return $query;
    }

    public function getFrequencyByPosition(string $position): array
    {
        $column = "{$position}_digit";
        $frequencies = $this->model->select($column, \DB::raw('COUNT(*) as count'))
            ->groupBy($column)
            ->pluck('count', $column)
            ->toArray();

        $result = array_fill(0, 10, 0);
        foreach ($frequencies as $digit => $count) {
            $result[(int)$digit] = $count;
        }

        return $result;
    }

    public function getPositionStats(string $position): array
    {
        $column = "{$position}_digit";
        $total = $this->model->count();
        
        if ($total === 0) {
            return [
                'total' => 0,
                'frequencies' => array_fill(0, 10, 0),
                'hottest_digit' => null,
                'coldest_digit' => null,
            ];
        }

        $frequencies = $this->getFrequencyByPosition($position);
        arsort($frequencies);
        
        $hottest = array_key_first($frequencies);
        $coldest = array_key_last($frequencies);

        return [
            'total' => $total,
            'frequencies' => $frequencies,
            'hottest_digit' => $hottest,
            'coldest_digit' => $coldest,
        ];
    }

    public function getAllPositionsStats(): array
    {
        $positions = ['as', 'kop', 'kepala', 'ekor'];
        $stats = [];

        foreach ($positions as $position) {
            $stats[$position] = $this->getPositionStats($position);
        }

        return $stats;
    }

    public function getTotalCount(): int
    {
        return $this->model->count();
    }

    public function getHottestAndColdestOverall(): array
    {
        $positions = ['as', 'kop', 'kepala', 'ekor'];
        $allFrequencies = [];

        foreach ($positions as $position) {
            $freqs = $this->getFrequencyByPosition($position);
            foreach ($freqs as $digit => $count) {
                if (!isset($allFrequencies[$digit])) {
                    $allFrequencies[$digit] = 0;
                }
                $allFrequencies[$digit] += $count;
            }
        }

        if (empty($allFrequencies)) {
            return ['hottest' => null, 'coldest' => null];
        }

        arsort($allFrequencies);

        return [
            'hottest' => array_key_first($allFrequencies),
            'coldest' => array_key_last($allFrequencies),
        ];
    }

    public function store(array $data): Result
    {
        return $this->model->create($data);
    }

    public function bulkStore(array $data): int
    {
        $count = 0;
        foreach ($data as $item) {
            $this->model->create($item);
            $count++;
        }
        return $count;
    }

    public function deleteOld(\DateTime $before): int
    {
        return $this->model->where('draw_date', '<', $before)->delete();
    }

    public function truncate(): void
    {
        $this->model->truncate();
    }
}
