<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnalysisService;
use Illuminate\Http\Request;

class HotColdController extends Controller
{
    public function __construct(
        protected AnalysisService $analysisService
    ) {}

    public function index(Request $request)
    {
        $top = $request->get('top', 3);
        $data = $this->analysisService->getHotColdDigits($top);

        return response()->json($data);
    }
}
