import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { ExecutionService } from '../services/execution';
import { asyncHandler } from '../middleware/error-handler';
import { requireAuth } from '../middleware/auth';

export const executionRouter = Router();

const executionService = new ExecutionService();

// Validation schemas
const orderSchema = z.object({
  symbol: z.string().min(1),
  type: z.enum(['buy', 'sell']),
  kind: z.enum(['market', 'limit', 'stop']).default('market'),
  volume: z.number().positive().min(0.01).max(100),
  price: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  comment: z.string().max(100).optional(),
  magicNumber: z.number().optional(),
});

const closePositionSchema = z.object({
  ticket: z.number().positive(),
  volume: z.number().positive().min(0.01).optional(),
});

const modifyPositionSchema = z.object({
  ticket: z.number().positive(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
});

/**
 * GET /api/v1/execution/status
 * Get execution status
 */
executionRouter.get('/status', requireAuth, asyncHandler(async (_req: Request, res: Response) => {
  const status = await executionService.getStatus();

  res.json({
    success: true,
    data: status,
  });
}));

/**
 * GET /api/v1/execution/account
 * Get account info
 */
executionRouter.get('/account', requireAuth, asyncHandler(async (_req: Request, res: Response) => {
  const account = await executionService.getAccount();

  res.json({
    success: true,
    data: account,
  });
}));

/**
 * POST /api/v1/execution/order
 * Execute a new order
 */
executionRouter.post('/order', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = orderSchema.safeParse(req.body);
  
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

  const { symbol, type, kind, volume, price, stopLoss, takeProfit, comment, magicNumber } = validation.data;

  let result;
  if (type === 'buy') {
    result = await executionService.executeBuy({
      symbol,
      type: 'buy',
      kind,
      volume,
      price,
      stopLoss,
      takeProfit,
      comment,
      magicNumber,
    });
  } else {
    result = await executionService.executeSell({
      symbol,
      type: 'sell',
      kind,
      volume,
      price,
      stopLoss,
      takeProfit,
      comment,
      magicNumber,
    });
  }

  if (result.success) {
    res.json({
      success: true,
      data: {
        ticket: result.ticket,
        message: result.message,
        price: result.price,
        volume: result.volume,
      },
    });
  } else {
    res.status(400).json({
      success: false,
      error: {
        code: 'EXECUTION_ERROR',
        message: result.error || 'Order execution failed',
      },
    });
  }
}));

/**
 * POST /api/v1/execution/close
 * Close a position
 */
executionRouter.post('/close', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = closePositionSchema.safeParse(req.body);
  
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

  const { ticket, volume } = validation.data;
  const result = await executionService.closePosition(ticket, volume);

  if (result.success) {
    res.json({
      success: true,
      data: {
        ticket,
        message: result.message,
        price: result.price,
      },
    });
  } else {
    res.status(400).json({
      success: false,
      error: {
        code: 'CLOSE_ERROR',
        message: result.error || 'Failed to close position',
      },
    });
  }
}));

/**
 * POST /api/v1/execution/close-all
 * Close all positions
 */
executionRouter.post('/close-all', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.body;
  
  let result;
  if (symbol) {
    result = await executionService.closeAllBySymbol(symbol);
  } else {
    result = await executionService.closeAll();
  }

  res.json({
    success: result.success,
    data: {
      closed: result.closed,
      errors: result.errors,
    },
  });
}));

/**
 * POST /api/v1/execution/modify
 * Modify position SL/TP
 */
executionRouter.post('/modify', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = modifyPositionSchema.safeParse(req.body);
  
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

  const { ticket, stopLoss, takeProfit } = validation.data;
  
  if (!stopLoss && !takeProfit) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'At least one of stopLoss or takeProfit is required',
      },
    });
    return;
  }

  const result = await executionService.modifyPosition(ticket, stopLoss, takeProfit);

  if (result.success) {
    res.json({
      success: true,
      data: {
        ticket,
        message: 'Position modified successfully',
      },
    });
  } else {
    res.status(400).json({
      success: false,
      error: {
        code: 'MODIFY_ERROR',
        message: result.error || 'Failed to modify position',
      },
    });
  }
}));

/**
 * POST /api/v1/execution/breakeven
 * Move stop loss to breakeven
 */
executionRouter.post('/breakeven', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { ticket } = req.body;
  
  if (!ticket) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Ticket is required',
      },
    });
    return;
  }

  const success = await executionService.moveToBreakeven(ticket);

  res.json({
    success,
    data: {
      ticket,
      message: success ? 'Stop loss moved to breakeven' : 'Failed to move to breakeven',
    },
  });
}));

/**
 * GET /api/v1/execution/positions
 * Get all open positions
 */
executionRouter.get('/positions', requireAuth, asyncHandler(async (_req: Request, res: Response) => {
  const positions = await executionService.getPositions();

  res.json({
    success: true,
    data: {
      positions,
      total: positions.length,
    },
  });
}));

/**
 * GET /api/v1/execution/positions/:ticket
 * Get position by ticket
 */
executionRouter.get('/positions/:ticket', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const ticket = parseInt(req.params.ticket);
  
  if (isNaN(ticket)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid ticket number',
      },
    });
    return;
  }

  const position = await executionService.getPosition(ticket);

  if (position) {
    res.json({
      success: true,
      data: position,
    });
  } else {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Position not found',
      },
    });
  }
}));

/**
 * GET /api/v1/execution/summary
 * Get position summary
 */
executionRouter.get('/summary', requireAuth, asyncHandler(async (_req: Request, res: Response) => {
  const summary = executionService.getPositionSummary();

  res.json({
    success: true,
    data: summary,
  });
}));

/**
 * GET /api/v1/execution/stats
 * Get trade statistics
 */
executionRouter.get('/stats', requireAuth, asyncHandler(async (_req: Request, res: Response) => {
  const stats = executionService.getTradeStats();

  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * GET /api/v1/execution/history
 * Get trade history
 */
executionRouter.get('/history', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const history = executionService.getTradeHistory(limit);

  res.json({
    success: true,
    data: {
      trades: history,
      total: history.length,
    },
  });
}));

/**
 * GET /api/v1/execution/symbol/:symbol
 * Get symbol info
 */
executionRouter.get('/symbol/:symbol', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const info = await executionService.getSymbolInfo(symbol);

  if (info) {
    res.json({
      success: true,
      data: info,
    });
  } else {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Symbol not found',
      },
    });
  }
}));

/**
 * GET /api/v1/execution/tick/:symbol
 * Get current tick
 */
executionRouter.get('/tick/:symbol', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const tick = await executionService.getTick(symbol);

  if (tick) {
    res.json({
      success: true,
      data: tick,
    });
  } else {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Tick not available',
      },
    });
  }
}));

/**
 * POST /api/v1/execution/margin
 * Calculate margin for order
 */
executionRouter.post('/margin', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { symbol, volume, price, leverage } = req.body;
  
  if (!symbol || !volume || !price) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'symbol, volume, and price are required',
      },
    });
    return;
  }

  const margin = executionService.calculateMargin(symbol, volume, price, leverage);

  res.json({
    success: true,
    data: {
      marginRequired: margin,
      marginCurrency: 'USD',
    },
  });
}));

/**
 * GET /api/v1/execution/health
 * Health check
 */
executionRouter.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'ExecutionService',
      demoMode: true,
      timestamp: Date.now(),
    },
  });
}));
