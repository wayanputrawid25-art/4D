# ForexOS Environment Configuration

Complete reference for environment variables across all ForexOS applications.

---

## Table of Contents

1. [Overview](#overview)
2. [Variable Categories](#variable-categories)
3. [Frontend Variables](#frontend-variables)
4. [Backend Variables](#backend-variables)
5. [Robot Variables](#robot-variables)
6. [Shared Variables](#shared-variables)
7. [Naming Conventions](#naming-conventions)
8. [Security Guidelines](#security-guidelines)
9. [Setup Instructions](#setup-instructions)

---

## Overview

ForexOS uses a monorepo structure with three main applications:

| Application | Location | Purpose |
|------------|----------|---------|
| Frontend | `apps/web` | Next.js web application |
| Backend | `apps/api` | Node.js REST API |
| Robot | `robot/` | Python MT5 trading robot |

---

## Variable Categories

### Security Levels

| Level | Description | Examples |
|-------|-------------|----------|
| **PUBLIC** | Safe to expose to browser | `NEXT_PUBLIC_*` |
| **SECRET** | Server-side only, never expose | `JWT_SECRET`, `DATABASE_URL` |
| **INTERNAL** | Within application boundaries | `PORT`, `NODE_ENV` |

### Variable Prefixes

| Prefix | Scope | Description |
|--------|-------|-------------|
| `NEXT_PUBLIC_` | Browser + Server | Public variables |
| (none) | Server-side only | Backend secrets |
| `MT5_` | Robot | MT5 trading |
| `API_` | Robot | API connection |
| `ROBOT_` | Backend | Robot configuration |

---

## Frontend Variables

**Location:** `apps/web/.env.example`

### ✅ Public Variables (Safe to Expose)

```bash
# =============================================================================
# PUBLIC CONFIGURATION
# =============================================================================

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001

# Application Environment
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_NODE_ENV=development

# =============================================================================
# FEATURE FLAGS
# =============================================================================
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG_MODE=false
```

### ❌ Variables NOT Allowed in Frontend

These secrets must NEVER be added to frontend `.env`:

| Variable | Reason |
|---------|--------|
| `JWT_SECRET` | Server authentication |
| `JWT_REFRESH_SECRET` | Server authentication |
| `DATABASE_URL` | Database credentials |
| `ENCRYPTION_KEY` | Encryption key |
| `API_KEY` | API authentication |
| `MT5_*` | MT5 credentials |
| `ROBOT_API_KEY` | Robot authentication |
| `REDIS_URL` | Cache credentials |

---

## Backend Variables

**Location:** `apps/api/.env.example`

### Database

```bash
# =============================================================================
# DATABASE (Neon PostgreSQL)
# =============================================================================
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

### Authentication

```bash
# =============================================================================
# AUTHENTICATION
# =============================================================================
# JWT Secret - Min 32 characters, DO NOT SHARE
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-at-least-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

### Server

```bash
# =============================================================================
# SERVER
# =============================================================================
PORT=3001
NODE_ENV=development
```

### CORS

```bash
# =============================================================================
# CORS
# =============================================================================
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Rate Limiting

```bash
# =============================================================================
# RATE LIMITING
# =============================================================================
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

### Redis

```bash
# =============================================================================
# REDIS
# =============================================================================
REDIS_URL=rediss://user:password@host.redis.cloud:6379
```

### Robot API

```bash
# =============================================================================
# ROBOT API
# =============================================================================
ROBOT_API_URL=http://localhost:8000
ROBOT_API_KEY=your-robot-api-key
```

### Encryption

```bash
# =============================================================================
# ENCRYPTION
# =============================================================================
ENCRYPTION_KEY=your-32-byte-encryption-key
```

---

## Robot Variables

**Location:** `robot/.env.example`

### MT5 Connection

```bash
# =============================================================================
# MT5 CONNECTION
# =============================================================================
# MT5 Account Login
MT5_LOGIN=12345678

# MT5 Account Password
MT5_PASSWORD=your_mt5_password

# MT5 Server (e.g., ICMarkets-Demo, ICMarkets-Live)
MT5_SERVER=ICMarkets-Demo

# MT5 Terminal Path (optional, for local terminal)
MT5_PATH=C:\Program Files\MetaTrader 5\terminal64.exe
```

### MT5 Bridge

```bash
# =============================================================================
# MT5 BRIDGE
# =============================================================================
# MT5 Bridge WebSocket Connection
MT5_BRIDGE_HOST=localhost
MT5_BRIDGE_PORT=8888
MT5_USE_DEMO=true
```

### API Connection

```bash
# =============================================================================
# API CONNECTION
# =============================================================================
# Backend API URL
API_URL=http://localhost:3001

# API Authentication Key
API_KEY=your-api-key
```

### Database

```bash
# =============================================================================
# DATABASE
# =============================================================================
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

### Redis

```bash
# =============================================================================
# REDIS
# =============================================================================
REDIS_URL=redis://localhost:6379
```

### Logging

```bash
# =============================================================================
# LOGGING
# =============================================================================
LOG_LEVEL=INFO
```

---

## Shared Variables

Variables used across multiple applications:

| Variable | Frontend | Backend | Robot | Description |
|----------|---------|---------|-------|-------------|
| `NODE_ENV` | ✅ | ✅ | ❌ | Environment mode |
| `DATABASE_URL` | ❌ | ✅ | ✅ | Database connection |
| `REDIS_URL` | ❌ | ✅ | ✅ | Redis connection |

---

## Naming Conventions

### Standard Format

```
{SCOPE}_{CATEGORY}_{NAME}
```

### Examples

| Variable | Format | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_API_URL` | `{SCOPE}_{CATEGORY}_{NAME}` | Public API URL |
| `JWT_SECRET` | `{CATEGORY}_{NAME}` | JWT secret |
| `MT5_BRIDGE_HOST` | `{CATEGORY}_{SUB}_{NAME}` | MT5 bridge host |
| `ROBOT_API_KEY` | `{CATEGORY}_{NAME}` | Robot API key |

### Case Sensitivity

- Use **SCREAMING_SNAKE_CASE** for all variable names
- Use **lowercase** for values (except URLs)
- Use **kebab-case** for path values in Windows (`MT5_PATH`)

---

## Security Guidelines

### 🚨 NEVER Do These

1. ❌ Commit `.env` files to version control
2. ❌ Add secrets to frontend `.env`
3. ❌ Use default values for production secrets
4. ❌ Share secrets via chat/email
5. ❌ Hardcode secrets in source code

### ✅ DO These

1. ✅ Use `.env.example` with placeholder values
2. ✅ Use Vercel/environment secrets for production
3. ✅ Rotate secrets regularly
4. ✅ Use different secrets per environment
5. ✅ Validate secrets at startup

### Secret Validation

All secrets should be validated at application startup:

```typescript
// Example: Validate required secrets
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}
```

---

## Setup Instructions

### 1. Copy Environment Files

```bash
# Root environment
cp .env.example .env

# Frontend environment
cp apps/web/.env.example apps/web/.env

# Backend environment
cp apps/api/.env.example apps/api/.env

# Robot environment
cp robot/.env.example robot/.env
```

### 2. Fill in Secrets

Edit each `.env` file and replace placeholder values:

```bash
# Backend
DATABASE_URL=postgresql://your_user:your_password@your_host/neon_db
JWT_SECRET=your-production-jwt-secret-at-least-32-chars

# Robot
MT5_LOGIN=your_mt5_login
MT5_PASSWORD=your_mt5_password
MT5_SERVER=YourBroker-Server
API_KEY=your_backend_api_key
```

### 3. Vercel Setup

For Vercel deployment, add secrets in the dashboard:

```
Settings → Environment Variables
```

Add each variable with appropriate environment scope:
- **Production**: All production secrets
- **Preview**: Preview/staging secrets
- **Development**: Local development values

---

## Variable Reference

### Complete Variable List

| Variable | Type | Required | Scope | Description |
|----------|------|----------|-------|-------------|
| `NODE_ENV` | string | Yes | All | Environment mode |
| `DATABASE_URL` | string | Yes | Backend, Robot | PostgreSQL connection |
| `JWT_SECRET` | string | Yes | Backend | JWT signing secret |
| `JWT_REFRESH_SECRET` | string | Yes | Backend | Refresh token secret |
| `JWT_ACCESS_EXPIRY` | string | No | Backend | Access token expiry |
| `JWT_REFRESH_EXPIRY` | string | No | Backend | Refresh token expiry |
| `ENCRYPTION_KEY` | string | Yes | Backend | Data encryption key |
| `PORT` | number | No | Backend | Server port |
| `CORS_ORIGINS` | string | Yes | Backend | CORS allowed origins |
| `RATE_LIMIT_MAX` | number | No | Backend | Max requests per window |
| `RATE_LIMIT_WINDOW` | number | No | Backend | Rate limit window (ms) |
| `REDIS_URL` | string | Yes | Backend, Robot | Redis connection |
| `ROBOT_API_URL` | string | Yes | Backend | Robot API endpoint |
| `ROBOT_API_KEY` | string | Yes | Backend | Robot API authentication |
| `MT5_LOGIN` | string | Yes | Robot | MT5 account login |
| `MT5_PASSWORD` | string | Yes | Robot | MT5 account password |
| `MT5_SERVER` | string | Yes | Robot | MT5 server name |
| `MT5_PATH` | string | No | Robot | MT5 terminal path |
| `MT5_BRIDGE_HOST` | string | No | Robot | MT5 bridge host |
| `MT5_BRIDGE_PORT` | number | No | Robot | MT5 bridge port |
| `MT5_USE_DEMO` | boolean | No | Robot | Use demo mode |
| `API_URL` | string | Yes | Robot | Backend API URL |
| `API_KEY` | string | Yes | Robot | API authentication |
| `LOG_LEVEL` | string | No | Robot | Logging level |
| `NEXT_PUBLIC_APP_URL` | string | Yes | Frontend | Application URL |
| `NEXT_PUBLIC_API_URL` | string | Yes | Frontend | API URL |
| `NEXT_PUBLIC_APP_ENV` | string | No | Frontend | App environment |
| `NEXT_PUBLIC_NODE_ENV` | string | No | Frontend | Node environment |

---

## Troubleshooting

### "Environment variable not found"

1. Check if the variable is defined in `.env`
2. Restart the application
3. For Vercel: Redeploy after adding secrets

### "JWT_SECRET must be at least 32 characters"

1. Generate a new secure secret:
   ```bash
   openssl rand -base64 32
   ```

### "DATABASE_URL is required"

1. Check Neon PostgreSQL dashboard
2. Copy the connection string
3. Ensure `?sslmode=require` is appended

### "CORS error in browser"

1. Check `CORS_ORIGINS` includes your frontend URL
2. Ensure no trailing slashes
3. For production: Use exact domain, no wildcards

---

*Last updated: 2026-06-24*
