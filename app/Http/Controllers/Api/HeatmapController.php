<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnalysisService;
use Illuminate\Http\Request;

class HeatmapController extends Controller
{
    public function __construct(
        protected AnalysisService $analysisService
    ) {}

    public function index()
    {
        $data = $this->analysisService->getHeatmapData();

        return response()->json($data);
    }
}
