<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Repositories\ResultRepository;
use App\Services\AnalysisService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class UploadController extends Controller
{
    public function __construct(
        protected ResultRepository $resultRepository,
        protected AnalysisService $analysisService
    ) {}

    public function upload(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:csv,xlsx,xls|max:10240', // Max 10MB
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        try {
            $file = $request->file('file');
            $extension = $file->getClientOriginalExtension();

            if ($extension === 'csv') {
                $count = $this->processCsv($file);
            } else {
                $count = $this->processExcel($file);
            }

            // Recalculate lag analysis after bulk insert
            $this->analysisService->recalculateAllLagAnalysis();

            return response()->json([
                'message' => "{$count} data berhasil diupload",
                'count' => $count
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal memproses file: ' . $e->getMessage()
            ], 500);
        }
    }

    protected function processCsv($file): int
    {
        $count = 0;
        $handle = fopen($file->getRealPath(), 'r');

        // Skip header row if exists
        $firstRow = fgetcsv($handle);
        if (!is_numeric(str_replace('-', '', $firstRow[0] ?? 'a'))) {
            // Header row, continue
        } else {
            // Data row, process it
            $this->processRow($firstRow);
            $count++;
        }

        while (($row = fgetcsv($handle)) !== false) {
            if ($this->processRow($row)) {
                $count++;
            }
        }

        fclose($handle);
        return $count;
    }

    protected function processExcel($file): int
    {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getRealPath());
        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray();
        $count = 0;

        // Skip header row
        for ($i = 1; $i < count($rows); $i++) {
            if ($this->processRow($rows[$i])) {
                $count++;
            }
        }

        return $count;
    }

    protected function processRow(array $row): bool
    {
        // Expect: result_4d, draw_date (optional)
        $result4d = trim($row[0] ?? '');

        if (strlen($result4d) !== 4 || !ctype_digit($result4d)) {
            return false;
        }

        $drawDate = isset($row[1]) && !empty(trim($row[1])) 
            ? date('Y-m-d', strtotime(trim($row[1]))) 
            : now()->toDateString();

        // Check for duplicate
        $exists = \App\Models\Result::where('result_4d', $result4d)
            ->where('draw_date', $drawDate)
            ->exists();

        if ($exists) {
            return false;
        }

        $this->resultRepository->store([
            'result_4d' => $result4d,
            'draw_date' => $drawDate,
        ]);

        return true;
    }
}
