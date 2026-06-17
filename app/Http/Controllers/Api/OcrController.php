<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OCRService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class OcrController extends Controller
{
    public function __construct(
        protected OCRService $ocrService
    ) {}

    public function process(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120', // Max 5MB
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Check if Tesseract is available
        if (!$this->ocrService->isTesseractAvailable()) {
            // For demo purposes, return sample data if Tesseract is not available
            return response()->json([
                'message' => 'OCR processing simulated (Tesseract not installed)',
                'results' => [
                    ['number' => '1234', 'as' => '1', 'kop' => '2', 'kepala' => '3', 'ekor' => '4'],
                    ['number' => '5678', 'as' => '5', 'kop' => '6', 'kepala' => '7', 'ekor' => '8'],
                ],
                'note' => 'Install Tesseract OCR for actual image processing'
            ]);
        }

        try {
            // Store the uploaded image temporarily
            $image = $request->file('image');
            $path = $image->store('temp', 'local');
            $fullPath = Storage::disk('local')->path($path);

            // Process the image
            $results = $this->ocrService->processImage($fullPath);

            // Clean up the temp file
            Storage::disk('local')->delete($path);

            if (empty($results)) {
                return response()->json([
                    'message' => 'No 4D numbers found in the image',
                    'results' => []
                ]);
            }

            return response()->json([
                'message' => 'OCR processing successful',
                'results' => $results
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'OCR processing failed: ' . $e->getMessage(),
                'results' => []
            ], 500);
        }
    }

    public function check()
    {
        $available = $this->ocrService->isTesseractAvailable();

        return response()->json([
            'tesseract_available' => $available,
            'message' => $available ? 'Tesseract OCR is installed' : 'Tesseract OCR is not installed'
        ]);
    }
}
