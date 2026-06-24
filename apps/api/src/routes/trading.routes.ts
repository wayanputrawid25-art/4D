import { Router, type Request, type Response } from 'express';

export const tradingRouter = Router();

// TODO: Implement trading routes
tradingRouter.get('/orders', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Trading endpoints not yet implemented',
    },
  });
});

tradingRouter.post('/orders', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Trading endpoints not yet implemented',
    },
  });
});

tradingRouter.get('/positions', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Position endpoints not yet implemented',
    },
  });
});

tradingRouter.delete('/positions/:id', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Position endpoints not yet implemented',
    },
  });
});
