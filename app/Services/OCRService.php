<?php

namespace App\Services;

use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

class OCRService
{
    protected string $tesseractPath = 'tesseract';
    protected string $tempDir;

    public function __construct()
    {
        $this->tempDir = storage_path('app/temp');
        if (!is_dir($this->tempDir)) {
            mkdir($this->tempDir, 0755, true);
        }
    }

    public function processImage(string $imagePath, string $language = 'eng+ind'): array
    {
        $tempFile = $this->tempDir . '/' . uniqid() . '.txt';
        
        try {
            // Run Tesseract OCR
            $result = Process::path(dirname($imagePath))
                ->run("{$this->tesseractPath} " . basename($imagePath) . " " . basename($tempFile, '.txt') . " -l {$language} --psm 6");
            
            if (!$result->successful()) {
                throw new \Exception('OCR processing failed: ' . $result->errorOutput());
            }

            // Read the output
            $text = file_get_contents($tempFile);
            
            // Clean up
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }

            // Extract 4D numbers from text
            return $this->extract4DNumbers($text);
        } catch (\Exception $e) {
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }
            throw $e;
        }
    }

    public function extract4DNumbers(string $text): array
    {
        $results = [];
        
        // Clean up the text
        $text = preg_replace('/[^0-9\s\n]/', '', $text);
        
        // Find all 4-digit numbers
        preg_match_all('/\b(\d{4})\b/', $text, $matches);
        
        foreach ($matches[1] as $number) {
            // Skip numbers starting with 0 if it's likely a year or date
            if ($number[0] === '0' && strlen($number) === 4) {
                continue;
            }
            
            $result = $this->parse4DNumber($number);
            if ($result) {
                $results[] = $result;
            }
        }

        // Remove duplicates
        $results = array_values(array_unique($results, SORT_REGULAR));
        
        return $results;
    }

    protected function parse4DNumber(string $number): ?array
    {
        if (strlen($number) !== 4 || !ctype_digit($number)) {
            return null;
        }

        return [
            'number' => $number,
            'as' => $number[0],
            'kop' => $number[1],
            'kepala' => $number[2],
            'ekor' => $number[3],
        ];
    }

    public function isTesseractAvailable(): bool
    {
        try {
            $result = Process::run($this->tesseractPath . ' --version');
            return $result->successful();
        } catch (\Exception $e) {
            return false;
        }
    }
}
