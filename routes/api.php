<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ResultController;
use App\Http\Controllers\Api\FrequencyController;
use App\Http\Controllers\Api\HotColdController;
use App\Http\Controllers\Api\HeatmapController;
use App\Http\Controllers\Api\ChangesController;
use App\Http\Controllers\Api\OcrController;
use App\Http\Controllers\Api\UploadController;
use App\Http\Controllers\Api\ExportController;

// Dashboard
Route::get('/dashboard', [DashboardController::class, 'index']);

// Results
Route::get('/results', [ResultController::class, 'index']);
Route::post('/results', [ResultController::class, 'store']);
Route::post('/results/bulk', [ResultController::class, 'bulkStore']);
Route::delete('/results/{id}', [ResultController::class, 'destroy']);
Route::delete('/results/old', [ResultController::class, 'destroyOld']);
Route::delete('/results/all', [ResultController::class, 'destroyAll']);

// Frequency
Route::get('/frequency', [FrequencyController::class, 'index']);
Route::get('/frequency/{position}', [FrequencyController::class, 'show']);

// Hot/Cold
Route::get('/hot-cold', [HotColdController::class, 'index']);

// Heatmap
Route::get('/heatmap', [HeatmapController::class, 'index']);

// Changes
Route::get('/changes', [ChangesController::class, 'index']);

// OCR
Route::post('/ocr', [OcrController::class, 'process']);
Route::get('/ocr/check', [OcrController::class, 'check']);

// Upload
Route::post('/upload', [UploadController::class, 'upload']);

// Export
Route::get('/export/preview', [ExportController::class, 'preview']);
Route::get('/export/pdf', [ExportController::class, 'pdf']);
