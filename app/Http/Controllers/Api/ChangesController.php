<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnalysisService;
use Illuminate\Http\Request;

class ChangesController extends Controller
{
    public function __construct(
        protected AnalysisService $analysisService
    ) {}

    public function index()
    {
        $data = $this->analysisService->getPositionChanges();

        return response()->json($data);
    }
}
