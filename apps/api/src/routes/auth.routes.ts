import { Router, type Request, type Response } from 'express';

export const authRouter = Router();

// TODO: Implement authentication
authRouter.post('/register', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Authentication not yet implemented',
    },
  });
});

authRouter.post('/login', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Authentication not yet implemented',
    },
  });
});

authRouter.post('/refresh', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Token refresh not yet implemented',
    },
  });
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Logout not yet implemented',
    },
  });
});
