<?php

namespace App\Services;

use App\Models\Result;
use App\Models\DigitLagAnalysis;
use App\Repositories\ResultRepository;
use App\Repositories\LagAnalysisRepository;
use Illuminate\Support\Collection;
use Carbon\Carbon;

class AnalysisService
{
    public function __construct(
        protected ResultRepository $resultRepository,
        protected LagAnalysisRepository $lagRepository
    ) {}

    public function getDashboardData(string $period = 'all'): array
    {
        $results = $this->resultRepository->getByPeriod($period)->get();
        $total = $results->count();

        if ($total === 0) {
            return [
                'total_results' => 0,
                'hottest_digit' => '-',
                'coldest_digit' => '-',
                'biggest_change' => '-',
                'smallest_change' => '-',
                'avg_change' => 0,
            ];
        }

        // Get hottest and coldest overall
        $overallStats = $this->resultRepository->getHottestAndColdestOverall();

        // Get change stats
        $positionChanges = $this->getPositionChanges();
        $allChanges = [];
        foreach ($positionChanges as $position => $changes) {
            $allChanges = array_merge($allChanges, $changes->pluck('difference')->toArray());
        }

        $biggestChange = !empty($allChanges) ? max($allChanges) : '-';
        $smallestChange = !empty($allChanges) ? min($allChanges) : '-';
        $avgChange = !empty($allChanges) ? round(array_sum($allChanges) / count($allChanges), 2) : 0;

        return [
            'total_results' => $total,
            'hottest_digit' => $overallStats['hottest'] ?? '-',
            'coldest_digit' => $overallStats['coldest'] ?? '-',
            'biggest_change' => $biggestChange,
            'smallest_change' => $smallestChange,
            'avg_change' => $avgChange,
        ];
    }

    public function getFrequencyData(string $position = null): array
    {
        if ($position) {
            $stats = $this->resultRepository->getPositionStats($position);
            $changeStats = $this->lagRepository->getChangeStats($position);
            
            // Calculate rankings
            $rankings = [];
            $total = array_sum($stats['frequencies']);
            $frequencies = $stats['frequencies'];
            arsort($frequencies);
            
            $rank = 1;
            foreach ($frequencies as $digit => $frequency) {
                if ($frequency > 0) {
                    $percentage = $total > 0 ? round(($frequency / $total) * 100, 2) : 0;
                    $type = $this->getDigitType($frequency, $total);
                    
                    $rankings[] = [
                        'digit' => $digit,
                        'frequency' => $frequency,
                        'percentage' => $percentage,
                        'type' => $type,
                    ];
                    $rank++;
                }
            }

            return [
                'total' => $stats['total'],
                'frequencies' => $stats['frequencies'],
                'hottest_digit' => $stats['hottest_digit'],
                'coldest_digit' => $stats['coldest_digit'],
                'avg_change' => $this->lagRepository->getAverageChange($position),
                'digit_range' => $this->calculateDigitRange($position),
                'change_stats' => $changeStats,
                'rankings' => $rankings,
            ];
        }

        // Return all positions
        $allPositions = ['as', 'kop', 'kepala', 'ekor'];
        $result = [];

        foreach ($allPositions as $pos) {
            $result[$pos] = $this->getFrequencyData($pos);
        }

        return $result;
    }

    public function getHotColdDigits(int $top = 3): array
    {
        $positions = ['as', 'kop', 'kepala', 'ekor'];
        $allDigits = [];

        foreach ($positions as $position) {
            $frequencies = $this->resultRepository->getFrequencyByPosition($position);
            foreach ($frequencies as $digit => $count) {
                if (!isset($allDigits[$digit])) {
                    $allDigits[$digit] = 0;
                }
                $allDigits[$digit] += $count;
            }
        }

        arsort($allDigits);
        
        $sorted = array_keys($allDigits);
        $hotDigits = array_slice($sorted, 0, $top);
        $coldDigits = array_slice($sorted, -$top, $top);
        
        return [
            'hot_digits' => $hotDigits,
            'cold_digits' => array_reverse($coldDigits),
        ];
    }

    public function getHeatmapData(): array
    {
        $positions = ['as', 'kop', 'kepala', 'ekor'];
        $heatmap = [];
        $maxFreq = 0;

        foreach ($positions as $position) {
            $frequencies = $this->resultRepository->getFrequencyByPosition($position);
            $heatmap[$position] = $frequencies;
            $maxFreq = max($maxFreq, ...$frequencies);
        }

        // Add max for color calculation
        foreach ($positions as $position) {
            $heatmap[$position]['max'] = $maxFreq;
        }

        // Calculate position volatility
        $positionStats = [];
        foreach ($positions as $position) {
            $avgChange = abs($this->lagRepository->getAverageChange($position));
            $positionStats[$position] = [
                'avgChange' => $avgChange,
                'totalPlus' => $this->getTotalPositiveChanges($position),
            ];
        }

        // Find most stable and volatile
        uasort($positionStats, fn($a, $b) => $a['avgChange'] <=> $b['avgChange']);
        $sortedPositions = array_keys($positionStats);

        return [
            'total' => $this->resultRepository->getTotalCount(),
            'hottest_overall' => $this->getHottestAndColdestOverall()['hottest'],
            'most_stable' => $sortedPositions[0] ?? '-',
            'most_volatile' => array_reverse($sortedPositions)[0] ?? '-',
            'heatmap' => $heatmap,
            'position_stats' => $positionStats,
        ];
    }

    public function getPositionChanges(): array
    {
        $positions = ['as', 'kop', 'kepala', 'ekor'];
        $changes = [];

        foreach ($positions as $position) {
            $changes[$position] = $this->lagRepository->getByPosition($position);
        }

        return $changes;
    }

    public function processNewResult(Result $result): void
    {
        // Get the previous result
        $previousResult = Result::where('id', '<', $result->id)
            ->orderBy('id', 'desc')
            ->first();

        if (!$previousResult) {
            return;
        }

        $positions = ['as', 'kop', 'kepala', 'ekor'];
        $lagData = [];

        foreach ($positions as $position) {
            $previousDigit = $previousResult->{"{$position}_digit"};
            $currentDigit = $result->{"{$position}_digit"};
            $difference = $currentDigit - $previousDigit;

            $lagData[] = [
                'position' => $position,
                'previous_digit' => $previousDigit,
                'current_digit' => $currentDigit,
                'difference' => $difference,
                'created_at' => now(),
            ];
        }

        $this->lagRepository->bulkStore($lagData);
    }

    public function recalculateAllLagAnalysis(): void
    {
        $this->lagRepository->truncate();

        $results = Result::orderBy('draw_date', 'asc')->orderBy('id', 'asc')->get();
        $lagData = [];

        for ($i = 1; $i < $results->count(); $i++) {
            $prev = $results[$i - 1];
            $curr = $results[$i];

            foreach (['as', 'kop', 'kepala', 'ekor'] as $position) {
                $lagData[] = [
                    'position' => $position,
                    'previous_digit' => $prev->{"{$position}_digit"},
                    'current_digit' => $curr->{"{$position}_digit"},
                    'difference' => $curr->{"{$position}_digit"} - $prev->{"{$position}_digit"},
                    'created_at' => now(),
                ];
            }
        }

        if (!empty($lagData)) {
            $this->lagRepository->bulkStore($lagData);
        }
    }

    protected function getDigitType(int $frequency, int $total): string
    {
        if ($total === 0) {
            return 'normal';
        }

        $percentage = ($frequency / $total) * 100;

        if ($percentage > 12) { // Above average (10% expected)
            return 'hot';
        } elseif ($percentage < 8) { // Below average
            return 'cold';
        }

        return 'normal';
    }

    protected function calculateDigitRange(string $position): string
    {
        $changes = $this->lagRepository->getByPosition($position);
        if ($changes->isEmpty()) {
            return '0';
        }

        $differences = $changes->pluck('difference')->toArray();
        return max($differences) - min($differences);
    }

    protected function getTotalPositiveChanges(string $position): int
    {
        return DigitLagAnalysis::where('position', $position)
            ->where('difference', '>', 0)
            ->count();
    }

    protected function getHottestAndColdestOverall(): array
    {
        return $this->resultRepository->getHottestAndColdestOverall();
    }
}
