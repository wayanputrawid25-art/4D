import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_MAX: z.string().default('100'),
  RATE_LIMIT_WINDOW: z.string().default('900000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parseInt(parsed.data.PORT, 10),
  database: {
    url: parsed.data.DATABASE_URL,
  },
  jwt: {
    secret: parsed.data.JWT_SECRET,
    refreshSecret: parsed.data.JWT_REFRESH_SECRET,
    accessExpiry: parsed.data.JWT_ACCESS_EXPIRY,
    refreshExpiry: parsed.data.JWT_REFRESH_EXPIRY,
  },
  corsOrigins: parsed.data.CORS_ORIGINS.split(','),
  rateLimit: {
    max: parseInt(parsed.data.RATE_LIMIT_MAX, 10),
    windowMs: parseInt(parsed.data.RATE_LIMIT_WINDOW, 10),
  },
} as const;
