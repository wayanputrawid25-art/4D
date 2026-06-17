<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnalysisService;
use Illuminate\Http\Request;

class FrequencyController extends Controller
{
    public function __construct(
        protected AnalysisService $analysisService
    ) {}

    public function index()
    {
        $data = $this->analysisService->getFrequencyData();

        return response()->json($data);
    }

    public function show(string $position)
    {
        if (!in_array($position, ['as', 'kop', 'kepala', 'ekor'])) {
            return response()->json(['message' => 'Invalid position'], 400);
        }

        $data = $this->analysisService->getFrequencyData($position);

        return response()->json($data);
    }
}
