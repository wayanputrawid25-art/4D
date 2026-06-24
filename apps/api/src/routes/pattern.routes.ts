import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { patternService, TradingSignal, ConfluenceResult } from '../services/pattern';
import { asyncHandler } from '../middleware/error-handler';
import { requireAuth } from '../middleware/auth';
import type { Timeframe, Candle } from '@forexos/types';
import type { PatternDetectionOptions, PatternSignal } from '../services/pattern';

export const patternRouter = Router();

// Validation schemas
const detectPatternsSchema = z.object({
  candles: z.array(z.object({
    id: z.string(),
    symbol: z.string(),
    timeframe: z.enum(['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1']),
    timestamp: z.number(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    tickVolume: z.number(),
    spread: z.number(),
  })),
  options: z.object({
    minConfidence: z.number().min(0).max(100).optional(),
    patternTypes: z.array(z.string()).optional(),
  }).optional(),
});

const analyzeConfluenceSchema = z.object({
  signals: z.array(z.any()),
});

/**
 * POST /api/v1/patterns/detect
 * Detect patterns in provided candle data
 */
patternRouter.post('/detect', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = detectPatternsSchema.safeParse(req.body);
  
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
        details: validation.error.errors,
      },
    });
    return;
  }

  const { candles, options } = validation.data;
  
  if (candles.length < 2) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_DATA',
        message: 'At least 2 candles required for pattern detection',
      },
    });
    return;
  }

  const service = new (await import('../services/pattern/pattern.service')).PatternDetectionService(options as PatternDetectionOptions);
  const patterns = service.detectPatterns(candles as Candle[]);

  res.json({
    success: true,
    data: {
      patterns: patterns.map(p => ({
        id: p.id,
        pattern: p.pattern,
        formed: p.formed,
        timestamp: p.timestamp,
      })),
      total: patterns.length,
      analyzedCandles: candles.length,
    },
  });
}));

/**
 * POST /api/v1/patterns/signals
 * Get trading signals from patterns
 */
patternRouter.post('/signals', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = detectPatternsSchema.safeParse(req.body);
  
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
      },
    });
    return;
  }

  const { candles, options } = validation.data;
  
  if (candles.length < 2) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_DATA',
        message: 'At least 2 candles required',
      },
    });
    return;
  }

  const service = new (await import('../services/pattern/pattern.service')).PatternDetectionService(options as PatternDetectionOptions);
  const patterns = service.detectPatterns(candles as Candle[]);
  const signals = service.generateSignals(patterns);

  res.json({
    success: true,
    data: {
      signals,
      total: signals.length,
      bullish: signals.filter(s => s.direction === 'bullish').length,
      bearish: signals.filter(s => s.direction === 'bearish').length,
    },
  });
}));

/**
 * POST /api/v1/patterns/confluence
 * Analyze pattern confluence
 */
patternRouter.post('/confluence', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = analyzeConfluenceSchema.safeParse(req.body);
  
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
      },
    });
    return;
  }

  const { signals } = validation.data;
  
  if (!signals || signals.length === 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_DATA',
        message: 'No signals provided for confluence analysis',
      },
    });
    return;
  }

  const confluence = patternService.analyzeConfluence(signals as PatternSignal[]);

  res.json({
    success: true,
    data: confluence,
  });
}));

/**
 * GET /api/v1/patterns/types
 * Get all supported pattern types
 */
patternRouter.get('/types', requireAuth, asyncHandler(async (_req: Request, res: Response) => {
  const patternTypes = {
    candlestick: [
      { type: 'doji', name: 'Doji', direction: 'neutral' },
      { type: 'hammer', name: 'Hammer', direction: 'bullish' },
      { type: 'inverted_hammer', name: 'Inverted Hammer', direction: 'bearish' },
      { type: 'bullish_engulfing', name: 'Bullish Engulfing', direction: 'bullish' },
      { type: 'bearish_engulfing', name: 'Bearish Engulfing', direction: 'bearish' },
      { type: 'morning_star', name: 'Morning Star', direction: 'bullish' },
      { type: 'evening_star', name: 'Evening Star', direction: 'bearish' },
      { type: 'piercing_line', name: 'Piercing Line', direction: 'bullish' },
      { type: 'dark_cloud_cover', name: 'Dark Cloud Cover', direction: 'bearish' },
      { type: 'shooting_star', name: 'Shooting Star', direction: 'bearish' },
      { type: 'spinning_top', name: 'Spinning Top', direction: 'neutral' },
      { type: 'marubozu', name: 'Marubozu', direction: 'bullish' },
    ],
    chart: [
      { type: 'head_and_shoulders', name: 'Head and Shoulders', direction: 'bearish' },
      { type: 'inverse_head_and_shoulders', name: 'Inverse Head and Shoulders', direction: 'bullish' },
      { type: 'double_top', name: 'Double Top', direction: 'bearish' },
      { type: 'double_bottom', name: 'Double Bottom', direction: 'bullish' },
      { type: 'ascending_triangle', name: 'Ascending Triangle', direction: 'bullish' },
      { type: 'descending_triangle', name: 'Descending Triangle', direction: 'bearish' },
      { type: 'symmetrical_triangle', name: 'Symmetrical Triangle', direction: 'neutral' },
      { type: 'rising_wedge', name: 'Rising Wedge', direction: 'bearish' },
      { type: 'falling_wedge', name: 'Falling Wedge', direction: 'bullish' },
      { type: 'bull_flag', name: 'Bull Flag', direction: 'bullish' },
      { type: 'bear_flag', name: 'Bear Flag', direction: 'bearish' },
    ],
  };

  res.json({
    success: true,
    data: patternTypes,
  });
}));

/**
 * GET /api/v1/patterns/health
 * Health check for pattern service
 */
patternRouter.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'PatternDetectionService',
      timestamp: Date.now(),
    },
  });
}));
