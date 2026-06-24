import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { validateSession } from '@forexos/database/auth';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
  sessionId?: string;
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization header required',
      },
    });
    return;
  }

  const token = authHeader.substring(7);
  
  validateSession(token).then((result) => {
    if (!result.valid || !result.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'SESSION_INVALID',
          message: 'Invalid or expired session',
        },
      });
      return;
    }

    (req as AuthenticatedRequest).user = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    };
    (req as AuthenticatedRequest).sessionId = result.session?.id;
    
    next();
  }).catch(() => {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed',
      },
    });
  });
}
