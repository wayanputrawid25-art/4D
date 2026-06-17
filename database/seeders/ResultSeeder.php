<?php

namespace Database\Seeders;

use App\Models\Result;
use App\Models\DigitLagAnalysis;
use Illuminate\Database\Seeder;

class ResultSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Seeding 1000 dummy 4D results...');

        // Create 1000 dummy results with random 4D numbers
        $results = [];
        $startDate = now()->subMonths(24); // Start from 2 years ago

        for ($i = 0; $i < 1000; $i++) {
            $result4d = str_pad(mt_rand(0, 9999), 4, '0', STR_PAD_LEFT);
            $drawDate = $startDate->copy()->addDays((int)($i * 0.7)); // Approximately daily

            $results[] = [
                'result_4d' => $result4d,
                'as_digit' => (int)$result4d[0],
                'kop_digit' => (int)$result4d[1],
                'kepala_digit' => (int)$result4d[2],
                'ekor_digit' => (int)$result4d[3],
                'draw_date' => $drawDate->format('Y-m-d'),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Insert results in chunks
        foreach (array_chunk($results, 100) as $chunk) {
            Result::insert($chunk);
        }

        $this->command->info('Created 1000 results. Now calculating lag analysis...');

        // Calculate lag analysis
        $allResults = Result::orderBy('draw_date', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $lagData = [];
        $positions = ['as', 'kop', 'kepala', 'ekor'];

        for ($i = 1; $i < $allResults->count(); $i++) {
            $prev = $allResults[$i - 1];
            $curr = $allResults[$i];

            foreach ($positions as $position) {
                $prevDigit = $prev->{"{$position}_digit"};
                $currDigit = $curr->{"{$position}_digit"};
                $difference = $currDigit - $prevDigit;

                $lagData[] = [
                    'position' => $position,
                    'previous_digit' => $prevDigit,
                    'current_digit' => $currDigit,
                    'difference' => $difference,
                    'created_at' => now(),
                ];
            }

            // Insert in chunks to avoid memory issues
            if (count($lagData) >= 400) {
                DigitLagAnalysis::insert($lagData);
                $lagData = [];
            }
        }

        // Insert remaining
        if (!empty($lagData)) {
            DigitLagAnalysis::insert($lagData);
        }

        $lagCount = DigitLagAnalysis::count();
        $this->command->info("Seeding complete!");
        $this->command->info("- Results: " . Result::count());
        $this->command->info("- Lag Analysis: " . $lagCount);
    }
}
