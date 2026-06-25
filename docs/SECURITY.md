# ForexOS Security Guide

**Last Updated:** 2026-06-25

Comprehensive security documentation for ForexOS, covering authentication, data protection, and best practices.

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication](#authentication)
3. [Authorization](#authorization)
4. [Data Protection](#data-protection)
5. [API Security](#api-security)
6. [Secrets Management](#secrets-management)
7. [Security Headers](#security-headers)
8. [Rate Limiting](#rate-limiting)
9. [Input Validation](#input-validation)
10. [Error Handling](#error-handling)
11. [Security Checklist](#security-checklist)

---

## Security Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      FOREXOS SECURITY LAYERS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │                    EXTERNAL LAYER                       │    │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│    │
│   │  │  Helmet  │  │   CORS   │  │   Rate   │  │   WAF    ││    │
│   │  │ Headers  │  │  Filter  │  │  Limit   │  │  (Vercel)││    │
│   │  └──────────┘  └──────────┘  └──────────┘  └──────────┘│    │
│   └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │                   AUTHENTICATION                         │    │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │    │
│   │  │   JWT    │  │ Sessions │  │  bcrypt  │               │    │
│   │  │  Tokens  │  │  Store   │  │  Hash    │               │    │
│   │  └──────────┘  └──────────┘  └──────────┘               │    │
│   └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │                      DATA LAYER                          │    │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │    │
│   │  │   SSL    │  │   Neon   │  │  Drizzle │               │    │
│   │  │ Required │  │   Pool   │  │   ORM    │               │    │
│   │  └──────────┘  └──────────┘  └──────────┘               │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Security Components

| Layer | Component | Purpose |
|-------|-----------|---------|
| External | Helmet | Security headers |
| External | CORS | Cross-origin request control |
| External | Rate Limiting | DDoS protection |
| Authentication | JWT | Stateless tokens |
| Authentication | bcrypt | Password hashing |
| Data | SSL/TLS | Encrypted connections |
| Data | ORM | SQL injection prevention |

---

## Authentication

### JWT Implementation

ForexOS uses JSON Web Tokens (JWT) for stateless authentication.

#### Token Structure

```typescript
// Token payload
interface TokenPayload {
  userId: string;    // User's UUID
  email: string;      // User's email
  sessionId: string;  // Database session ID
}
```

#### Token Configuration

```typescript
// packages/database/src/auth/jwt.ts
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export function createToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
```

#### Token Validation

```typescript
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
```

### Session Management

Sessions are stored in the database for validation and revocation:

```typescript
// Session validation flow
async function validateSession(token: string) {
  // 1. Verify JWT signature
  const decoded = jwt.verify(token, JWT_SECRET);
  
  // 2. Check session exists and is active
  const session = await db.select().from(sessions)
    .where(eq(sessions.id, decoded.sessionId));
  
  // 3. Check session not expired
  if (new Date(session.expiresAt) < new Date()) {
    return { valid: false };
  }
  
  return { valid: true, user: session.user };
}
```

### Password Security

#### Hashing Configuration

```typescript
// packages/database/src/auth/hash.ts
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}
```

| Setting | Value | Notes |
|---------|-------|-------|
| Algorithm | bcrypt | Industry standard |
| Salt Rounds | 12 | ~250ms per hash |
| Min Password | 8 chars | Enforced at registration |

#### Password Validation

```typescript
// Registration password requirements
const registerSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
```

### Auth Routes

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/auth/register` | POST | No | Create new user |
| `/api/v1/auth/login` | POST | No | Authenticate user |
| `/api/v1/auth/refresh` | POST | Yes | Refresh session |
| `/api/v1/auth/logout` | POST | Yes | Invalidate session |
| `/api/v1/auth/me` | GET | Yes | Get current user |

### Authentication Middleware

```typescript
// apps/api/src/middleware/auth.ts
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authorization header required' }
    });
    return;
  }

  const token = authHeader.substring(7);
  validateSession(token).then((result) => {
    if (!result.valid) {
      res.status(401).json({
        success: false,
        error: { code: 'SESSION_INVALID', message: 'Invalid or expired session' }
      });
      return;
    }
    // Attach user to request
    (req as AuthenticatedRequest).user = result.user;
    next();
  });
}
```

---

## Authorization

### Protected Routes

All trading and account routes require authentication:

```typescript
// apps/api/src/index.ts
app.use('/api/v1/trading', requireAuth, tradingRouter);
app.use('/api/v1/market', requireAuth, marketRouter);
app.use('/api/v1/patterns', requireAuth, patternRouter);
app.use('/api/v1/indicators', requireAuth, indicatorRouter);
app.use('/api/v1/decision', requireAuth, decisionRouter);
app.use('/api/v1/execution', requireAuth, executionRouter);
app.use('/api/v1/optimization', requireAuth, optimizationRouter);
```

### Resource Ownership

Users can only access their own resources:

```typescript
// Example: Get user's positions
const positions = await db.select().from(positions)
  .where(eq(positions.accountId, accountId));
```

---

## Data Protection

### Database Security

#### SSL/TLS Connections

All database connections use SSL:

```typescript
// packages/database/src/index.ts
import { neon } from '@neondatabase/serverless';

// Connection string must include ?sslmode=require
const sql = neon(process.env.DATABASE_URL!);
```

#### Connection String Format

```bash
postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

### Password Storage

- **Hashing**: bcrypt with 12 salt rounds
- **Storage**: Never stored in plain text
- **Verification**: Constant-time comparison

```typescript
// Good: bcrypt comparison (constant time)
const isValid = await bcrypt.compare(password, hash);

// Bad: String comparison (vulnerable to timing attacks)
const isValid = password === hash;
```

### Sensitive Data Handling

| Data | Protection | Storage |
|------|-----------|---------|
| Passwords | bcrypt hash | Database |
| JWT Secret | Environment | Never in code |
| API Keys | Environment | Never in code |
| Database URL | Environment + SSL | Encrypted in transit |
| User Data | Session validation | Database |

---

## API Security

### CORS Configuration

```typescript
// apps/api/src/index.ts
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));
```

#### CORS Settings

```typescript
// apps/api/src/config/env.ts
const envSchema = z.object({
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
});

export const config = {
  corsOrigins: parsed.data.CORS_ORIGINS.split(','),
};
```

### Rate Limiting

```typescript
// apps/api/src/index.ts
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);
```

#### Rate Limit Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| Window | 15 minutes | Time window |
| Max Requests | 100 | Per IP per window |
| Headers | Enabled | Return rate limit info |

### Security Headers (Helmet)

```typescript
// apps/api/src/index.ts
app.use(helmet());
```

Helmet automatically sets these headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking protection |
| `X-XSS-Protection` | `1; mode=block` | XSS filter |
| `Strict-Transport-Security` | `max-age=...` | Force HTTPS |

---

## Secrets Management

### Environment Variables

All secrets are loaded from environment variables:

```typescript
// apps/api/src/config/env.ts
const envSchema = z.object({
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),
  DATABASE_URL: z.string().url(),
});
```

### Validation

Environment validation with Zod ensures all required secrets are present:

```typescript
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}
```

### Secret Requirements

| Secret | Min Length | Purpose |
|--------|-----------|---------|
| `JWT_SECRET` | 32 characters | JWT signing |
| `JWT_REFRESH_SECRET` | 32 characters | Refresh token signing |
| `ENCRYPTION_KEY` | 32 characters | Data encryption |
| `DATABASE_URL` | Valid URL | Database connection |

### Generate Secure Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate encryption key
openssl rand -hex 32

# Generate random password
openssl rand -base64 24
```

---

## Security Headers

### Helmet Configuration

```typescript
// Default Helmet settings (applied automatically)
app.use(helmet());
```

### Custom Security Headers

For additional security, add custom headers:

```typescript
// Content Security Policy
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  next();
});

// Referrer Policy
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

### Recommended Headers

| Header | Recommended Value |
|--------|-------------------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` |

---

## Rate Limiting

### Configuration

```typescript
// apps/api/src/config/env.ts
const envSchema = z.object({
  RATE_LIMIT_MAX: z.string().default('100'),
  RATE_LIMIT_WINDOW: z.string().default('900000'),
});
```

### Rate Limit Headers

The API returns rate limit information in response headers:

| Header | Description |
|--------|-------------|
| `RateLimit-Limit` | Max requests allowed |
| `RateLimit-Remaining` | Requests remaining |
| `RateLimit-Reset` | Time when limit resets |

### Endpoint-Specific Limits

For sensitive endpoints, apply stricter limits:

```typescript
// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Only 10 attempts
  message: 'Too many authentication attempts',
});

app.use('/api/v1/auth', authLimiter, authRouter);
```

---

## Input Validation

### Zod Schema Validation

All user input is validated with Zod:

```typescript
// Register validation
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

// Login validation
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});
```

### Request Validation

```typescript
authRouter.post('/register', asyncHandler(async (req, res) => {
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
  // Process valid request
}));
```

### Validation Best Practices

| Rule | Implementation |
|------|----------------|
| String length | `z.string().min(8).max(255)` |
| Email format | `z.string().email()` |
| URL validation | `z.string().url()` |
| Enum values | `z.enum(['buy', 'sell'])` |
| UUID format | `z.string().uuid()` |
| Numeric range | `z.number().min(0).max(100)` |

---

## Error Handling

### Secure Error Responses

Errors are handled without exposing sensitive information:

```typescript
// apps/api/src/middleware/error-handler.ts
export function errorHandler(err, req, res, next) {
  // Log full error internally
  console.error('Error:', err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
      },
    });
  }

  // Generic message for unknown errors
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
}
```

### Error Response Format

```typescript
// Success response
{
  success: true,
  data: { /* payload */ }
}

// Error response
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human-readable message',
    details: { /* optional */ }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input |
| `UNAUTHORIZED` | 401 | No token provided |
| `SESSION_INVALID` | 401 | Invalid/expired session |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Security Checklist

### Pre-Deployment

- [ ] All environment variables set
- [ ] `NODE_ENV=production`
- [ ] JWT secrets are at least 32 characters
- [ ] Database uses SSL (`?sslmode=require`)
- [ ] CORS origins restricted to production domain
- [ ] Rate limiting enabled
- [ ] No `.env` files committed

### Authentication

- [ ] JWT tokens expire in reasonable time
- [ ] Sessions stored in database
- [ ] Password hashing uses bcrypt (12+ rounds)
- [ ] Password minimum length enforced (8+)
- [ ] Login attempts rate limited
- [ ] Invalid sessions return generic errors

### API Security

- [ ] Helmet middleware enabled
- [ ] CORS configured for allowed origins
- [ ] Rate limiting configured
- [ ] All inputs validated with Zod
- [ ] Errors don't expose stack traces
- [ ] SQL injection prevented via ORM

### Data Protection

- [ ] SSL/TLS for all connections
- [ ] Passwords never logged
- [ ] Secrets never in code
- [ ] Sensitive data excluded from responses

### Monitoring

- [ ] Failed login attempts logged
- [ ] Rate limit violations logged
- [ ] Suspicious activity alerts configured

---

## Vulnerability Reporting

If you discover a security vulnerability in ForexOS:

1. **DO NOT** create a public GitHub issue
2. Email security concerns to the maintainers
3. Include detailed reproduction steps
4. Allow time for remediation before disclosure

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Security Best Practices](https://auth0.com/blog/ten-essential-best-practices-for-json-web-tokens/)

---

*Last updated: 2026-06-25*
