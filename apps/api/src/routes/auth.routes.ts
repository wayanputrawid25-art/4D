import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { register, login, logout, validateSession } from '@forexos/database/auth';
import { asyncHandler } from '../middleware/error-handler';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Register new user
authRouter.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const validation = registerSchema.safeParse(req.body);
  
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

  const result = await register({
    ...validation.data,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: result.error,
      },
    });
    return;
  }

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
      },
      token: result.token,
    },
  });
}));

// Login user
authRouter.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const validation = loginSchema.safeParse(req.body);
  
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

  const result = await login({
    ...validation.data,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  if (!result.success) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: result.error,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
      },
      token: result.token,
    },
  });
}));

// Refresh token
authRouter.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No token provided',
      },
    });
    return;
  }

  const token = authHeader.substring(7);
  const result = await validateSession(token);

  if (!result.valid) {
    res.status(401).json({
      success: false,
      error: {
        code: 'SESSION_EXPIRED',
        message: 'Session expired or invalid',
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
      },
      sessionId: result.session!.id,
    },
  });
}));

// Logout user
authRouter.post('/logout', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No token provided',
      },
    });
    return;
  }

  const token = authHeader.substring(7);
  const { validateSession } = await import('@forexos/database/auth');
  const result = await validateSession(token);

  if (result.valid && result.session) {
    await logout(result.session.id);
  }

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}));

// Get current user
authRouter.get('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No token provided',
      },
    });
    return;
  }

  const token = authHeader.substring(7);
  const { validateSession } = await import('@forexos/database/auth');
  const result = await validateSession(token);

  if (!result.valid || !result.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid session',
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatarUrl: result.user.avatarUrl,
        timezone: result.user.timezone,
        lastLoginAt: result.user.lastLoginAt,
        createdAt: result.user.createdAt,
      },
    },
  });
}));
