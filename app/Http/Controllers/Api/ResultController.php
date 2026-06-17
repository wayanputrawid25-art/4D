<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Result;
use App\Services\AnalysisService;
use App\Repositories\ResultRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ResultController extends Controller
{
    public function __construct(
        protected AnalysisService $analysisService,
        protected ResultRepository $resultRepository
    ) {}

    public function index(Request $request)
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

        // Sorting
        $sort = $request->get('sort', 'desc');
        $query->orderBy('draw_date', $sort)->orderBy('id', $sort);

        // Pagination
        $limit = $request->get('limit', 15);
        $results = $query->paginate($limit);

        return response()->json($results);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'result_4d' => 'required|string|size:4|regex:/^[0-9]{4}$/',
            'draw_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Check for duplicate
        $exists = Result::where('result_4d', $request->result_4d)
            ->when($request->draw_date, fn($q) => $q->where('draw_date', $request->draw_date))
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Data sudah ada'], 409);
        }

        $result = $this->resultRepository->store([
            'result_4d' => $request->result_4d,
            'draw_date' => $request->draw_date ?? now()->toDateString(),
        ]);

        // Process lag analysis
        $this->analysisService->processNewResult($result);

        return response()->json(['message' => 'Data berhasil disimpan', 'data' => $result], 201);
    }

    public function bulkStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'results' => 'required|array',
            'results.*.result_4d' => 'required|string|size:4|regex:/^[0-9]{4}$/',
            'results.*.draw_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $count = 0;
        $results = [];

        foreach ($request->results as $item) {
            $result = $this->resultRepository->store([
                'result_4d' => $item['result_4d'],
                'draw_date' => $item['draw_date'] ?? now()->toDateString(),
            ]);
            $results[] = $result;
            $count++;
        }

        // Recalculate all lag analysis after bulk insert
        $this->analysisService->recalculateAllLagAnalysis();

        return response()->json(['message' => "{$count} data berhasil disimpan", 'count' => $count], 201);
    }

    public function destroy($id)
    {
        $result = Result::findOrFail($id);
        $result->delete();

        return response()->json(['message' => 'Data berhasil dihapus']);
    }

    public function destroyOld()
    {
        $before = now()->subYear();
        $count = $this->resultRepository->deleteOld($before);

        return response()->json(['message' => "{$count} data berhasil dihapus", 'count' => $count]);
    }

    public function destroyAll()
    {
        $this->resultRepository->truncate();
        
        // Also truncate lag analysis
        \App\Models\DigitLagAnalysis::truncate();

        return response()->json(['message' => 'Semua data berhasil dihapus']);
    }
}
