import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { OptimizationService } from '../services/optimization';
import { asyncHandler } from '../middleware/error-handler';
import { requireAuth } from '../middleware/auth';

export const optimizationRouter = Router();

const optimizationService = new OptimizationService();

// Validation schemas
const candleSchema = z.object({
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
});

const parameterSchema = z.object({
  name: z.string(),
  min: z.number(),
  max: z.number(),
  step: z.number(),
  type: z.enum(['int', 'float']),
});

const optimizeSchema = z.object({
  candles: z.array(candleSchema).min(100, 'At least 100 candles required'),
  parameters: z.array(parameterSchema).min(1, 'At least 1 parameter required'),
  config: z.object({
    method: z.enum(['grid_search', 'genetic', 'walk_forward']),
    metric: z.enum(['profit', 'sharpe', 'sortino', 'win_rate', 'profit_factor']).default('profit'),
    maxResults: z.number().min(1).max(1000).optional().default(100),
  }),
});

/**
 * POST /api/v1/optimization/start
 * Start optimization
 */
optimizationRouter.post('/start', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = optimizeSchema.safeParse(req.body);
  
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

  const { candles, parameters, config } = validation.data;
  const id = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Start optimization asynchronously
  optimizationService.optimize(
    id,
    candles as any[],
    parameters as any[],
    config as any
  );

  res.json({
    success: true,
    data: {
      id,
      status: 'started',
      message: 'Optimization started',
    },
  });
}));

/**
 * GET /api/v1/optimization/:id
 * Get optimization result
 */
optimizationRouter.get('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = optimizationService.getResult(id);

  if (!result) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Optimization not found',
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      id: result.id,
      method: result.method,
      status: result.status,
      progress: result.progress,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      totalTests: result.totalTests,
      testedCount: result.testedCount,
      bestResult: result.bestResult ? {
        params: result.bestResult.params,
        metrics: result.bestResult.metrics,
      } : null,
      walkForwardResults: result.walkForwardResults,
    },
  });
}));

/**
 * GET /api/v1/optimization
 * List all optimization results
 */
optimizationRouter.get('/', requireAuth, asyncHandler(async (_req: Request, res: Response) => {
  const results = optimizationService.getAllResults();

  res.json({
    success: true,
    data: {
      optimizations: results.map(r => ({
        id: r.id,
        method: r.method,
        status: r.status,
        progress: r.progress,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
      })),
      total: results.length,
    },
  });
}));

/**
 * POST /api/v1/optimization/:id/cancel
 * Cancel optimization
 */
optimizationRouter.post('/:id/cancel', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const cancelled = optimizationService.cancel(id);

  res.json({
    success: cancelled,
    data: {
      message: cancelled ? 'Optimization cancelled' : 'Optimization not found or already completed',
    },
  });
}));

/**
 * POST /api/v1/optimization/clear
 * Clear old results
 */
optimizationRouter.post('/clear', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const maxAge = req.body.maxAge || 3600000; // 1 hour default
  optimizationService.clearOldResults(maxAge);

  res.json({
    success: true,
    data: {
      message: 'Old results cleared',
    },
  });
}));

/**
 * POST /api/v1/optimization/sample-size
 * Calculate recommended sample size
 */
optimizationRouter.post('/sample-size', asyncHandler(async (req: Request, res: Response) => {
  const { avgBarsInTrade, targetConfidence } = req.body;
  
  if (!avgBarsInTrade) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'avgBarsInTrade is required',
      },
    });
    return;
  }

  const sampleSize = optimizationService.calculateSampleSize(avgBarsInTrade, targetConfidence);

  res.json({
    success: true,
    data: {
      recommendedCandles: sampleSize * avgBarsInTrade,
      estimatedTrades: sampleSize,
      targetConfidence: targetConfidence || 0.95,
    },
  });
}));

/**
 * GET /api/v1/optimization/health
 * Health check
 */
optimizationRouter.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  const results = optimizationService.getAllResults();
  const running = results.filter(r => r.status === 'running').length;

  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'OptimizationService',
      activeOptimizations: running,
      totalOptimizations: results.length,
      timestamp: Date.now(),
    },
  });
}));
