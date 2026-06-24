import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { mt5Service } from '../services/market';
import { asyncHandler } from '../middleware/error-handler';
import { requireAuth } from '../middleware/auth';
import type { Timeframe } from '@forexos/types';

export const marketRouter = Router();

// Validation schemas
const getCandlesSchema = z.object({
  symbol: z.string().min(1),
  timeframe: z.enum(['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1']),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().min(1).max(10000).optional().default(100),
});

const getTickerSchema = z.object({
  symbol: z.string().min(1),
});

const getTickersSchema = z.object({
  symbols: z.string().optional(), // comma-separated
});

const getSymbolsSchema = z.object({
  category: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

/**
 * GET /api/v1/market/symbols
 * Get all available trading symbols
 */
marketRouter.get('/symbols', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = getSymbolsSchema.safeParse(req.query);
  
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

  const symbols = await mt5Service.getSymbols(validation.data.category);
  
  // Filter by isActive if specified
  let result = symbols;
  if (validation.data.isActive !== undefined) {
    const isActive = validation.data.isActive === 'true';
    result = symbols.filter(s => s.isActive === isActive);
  }

  res.json({
    success: true,
    data: {
      symbols: result,
      total: result.length,
    },
  });
}));

/**
 * GET /api/v1/market/symbol/:symbol
 * Get single symbol info
 */
marketRouter.get('/symbol/:symbol', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  
  if (!symbol) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Symbol is required',
      },
    });
    return;
  }

  const symbolInfo = await mt5Service.getSymbol(symbol.toUpperCase());

  if (!symbolInfo) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Symbol ${symbol} not found`,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: { symbol: symbolInfo },
  });
}));

/**
 * GET /api/v1/market/ticker/:symbol
 * Get ticker data for single symbol
 */
marketRouter.get('/ticker/:symbol', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  
  if (!symbol) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Symbol is required',
      },
    });
    return;
  }

  const ticker = await mt5Service.getTicker(symbol.toUpperCase());

  if (!ticker) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Ticker for ${symbol} not found`,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: { ticker },
  });
}));

/**
 * GET /api/v1/market/tickers
 * Get ticker data for multiple symbols
 */
marketRouter.get('/tickers', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = getTickersSchema.safeParse(req.query);
  
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

  const symbols = validation.data.symbols?.split(',').map(s => s.trim().toUpperCase());
  const tickers = await mt5Service.getTickers(symbols);

  res.json({
    success: true,
    data: {
      tickers,
      total: tickers.length,
    },
  });
}));

/**
 * GET /api/v1/market/candles
 * Get historical candle data
 */
marketRouter.get('/candles', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = getCandlesSchema.safeParse(req.query);
  
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

  const { symbol, timeframe, from, to, limit } = validation.data;

  const candles = await mt5Service.getCandles(
    symbol.toUpperCase(),
    timeframe as Timeframe,
    from ? parseInt(from) : undefined,
    to ? parseInt(to) : undefined,
    limit
  );

  res.json({
    success: true,
    data: {
      symbol: symbol.toUpperCase(),
      timeframe,
      candles,
      total: candles.length,
    },
  });
}));

/**
 * GET /api/v1/market/tick/:symbol
 * Get current tick for single symbol
 */
marketRouter.get('/tick/:symbol', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  
  if (!symbol) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Symbol is required',
      },
    });
    return;
  }

  const tick = await mt5Service.getTick(symbol.toUpperCase());

  if (!tick) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Tick for ${symbol} not found`,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: { tick },
  });
}));

/**
 * GET /api/v1/market/status
 * Check market service status
 */
marketRouter.get('/status', asyncHandler(async (_req: Request, res: Response) => {
  const connected = mt5Service.isConnected();

  res.json({
    success: true,
    data: {
      connected,
      mode: process.env.MT5_USE_DEMO === 'false' ? 'live' : 'demo',
      timestamp: Date.now(),
    },
  });
}));
