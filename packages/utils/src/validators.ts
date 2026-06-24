// Validation Utilities using Zod
import { z } from 'zod';

// Email validation
export const emailSchema = z.string().email();

// Password validation
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[!@#$%^&*()]/, 'Password must contain special character');

// UUID validation
export const uuidSchema = z.string().uuid();

// Pagination validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Date range validation
export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// Symbol validation (forex pairs)
export const symbolSchema = z.string().regex(
  /^[A-Z]{6}$/,
  'Symbol must be a valid 6-letter forex pair (e.g., EURUSD)'
);

// Volume validation
export const volumeSchema = z.number().positive().max(100);

// Price validation
export const priceSchema = z.number().positive();

// Order type validation
export const orderTypeSchema = z.enum(['buy', 'sell']);
export const orderKindSchema = z.enum(['market', 'limit', 'stop']);

// Type exports
export type Email = z.infer<typeof emailSchema>;
export type Password = z.infer<typeof passwordSchema>;
export type UUID = z.infer<typeof uuidSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
