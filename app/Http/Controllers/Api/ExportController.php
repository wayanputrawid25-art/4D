<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Result;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

class ExportController extends Controller
{
    public function preview(Request $request)
    {
        $query = Result::query();

        // Filter by period
        if ($request->has('period')) {
            $period = $request->get('period');
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
        }

        $results = $query->orderBy('draw_date', 'desc')->paginate(1000);

        return response()->json($results);
    }

    public function pdf(Request $request)
    {
        $query = Result::query();

        // Apply period filter
        $period = $request->get('period', 'all');
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

        $results = $query->orderBy('draw_date', 'desc')->get();

        if ($results->isEmpty()) {
            return response()->json(['message' => 'No data to export'], 400);
        }

        // For simplicity, return CSV content as a "PDF" placeholder
        // In production, you'd use a PDF library like DomPDF or TCPDF
        $content = $this->generateCsvContent($results, $request->get('dateFormat', 'Y-m-d'));

        return Response::make($content, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename=4d-analysis-' . date('Y-m-d') . '.csv',
        ]);
    }

    protected function generateCsvContent($results, string $dateFormat): string
    {
        $lines = [];
        $lines[] = "4D Number,AS,KOP,KEPALA,EKOR,Draw Date";

        foreach ($results as $result) {
            $drawDate = date($dateFormat, strtotime($result->draw_date));
            $lines[] = "{$result->result_4d},{$result->as_digit},{$result->kop_digit},{$result->kepala_digit},{$result->ekor_digit},{$drawDate}";
        }

        return implode("\n", $lines);
    }
}
