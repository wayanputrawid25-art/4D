<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnalysisService;
use App\Repositories\ResultRepository;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        protected AnalysisService $analysisService,
        protected ResultRepository $resultRepository
    ) {}

    public function index(Request $request)
    {
        $period = $request->get('period', 'all');
        $data = $this->analysisService->getDashboardData($period);

        return response()->json($data);
    }
}
