# Configuration Audit Report

**Date:** 2026-06-24  
**Auditor:** Senior DevOps Engineer  
**Status:** Pending Approval

---

## Executive Summary

This document provides a comprehensive audit of the ForexOS repository configuration, including environment variables, package configurations, and deployment settings.

### Key Findings

| Category | Count | Severity |
|----------|-------|----------|
| Total Environment Variables | 25 | - |
| Missing Variables | 8 | High |
| Duplicate Variables | 3 | Medium |
| Inconsistent Naming | 4 | Low |
| Security Issues | 2 | Critical |

---

## 1. Environment Matrix

### 1.1 Production Variables

| Variable | Type | Required | Location | Description |
|----------|------|----------|----------|-------------|
| `DATABASE_URL` | Secret | ✅ Yes | api, web, robot, database | Neon PostgreSQL connection string |
| `JWT_SECRET` | Secret | ✅ Yes | api, web | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret | ✅ Yes | api | Refresh token signing secret |
| `MT5_HOST` | String | ✅ Yes | api, engine | MT5 Bridge host |
| `MT5_PORT` | Number | ✅ Yes | api, engine | MT5 Bridge port |
| `MT5_LOGIN` | String | ✅ Yes | engine, robot | MT5 account login |
| `MT5_PASSWORD` | Secret | ✅ Yes | engine, robot | MT5 account password |
| `MT5_SERVER` | String | ✅ Yes | engine, robot | MT5 server name |
| `MT5_USE_DEMO` | Boolean | Yes | api, engine | Use demo mode |
| `REDIS_URL` | String | ✅ Yes | api, web | Redis connection URL |
| `API_KEY` | Secret | ✅ Yes | robot | API authentication key |
| `API_URL` | String | Yes | robot | Backend API URL |
| `ENCRYPTION_KEY` | Secret | ✅ Yes | api, web | Data encryption key |
| `PORT` | Number | No | api | Server port (default: 3001) |
| `NODE_ENV` | String | Yes | api, web | Environment (development/production) |

### 1.2 Development Variables

| Variable | Type | Default | Location | Description |
|----------|------|---------|----------|-------------|
| `CORS_ORIGINS` | String | localhost:3000,3001 | api | Allowed CORS origins |
| `RATE_LIMIT_MAX` | Number | 100 | api | Max requests per window |
| `RATE_LIMIT_WINDOW` | Number | 900000 | api | Rate limit window (ms) |
| `JWT_ACCESS_EXPIRY` | String | 15m | api | Access token expiry |
| `JWT_REFRESH_EXPIRY` | String | 7d | api | Refresh token expiry |
| `ROBOT_API_URL` | String | localhost:8000 | api, web | Robot API endpoint |
| `ROBOT_API_KEY` | Secret | - | api, web | Robot API authentication |
| `MT5_PATH` | String | - | robot | MT5 terminal path |
| `LOG_LEVEL` | String | INFO | robot | Logging level |

### 1.3 Frontend Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | String | ✅ Yes | Backend API URL |
| `NEXT_PUBLIC_APP_URL` | String | Yes | Frontend app URL |

### 1.4 Backend Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `DATABASE_URL` | String | ✅ Yes | PostgreSQL connection |
| `PORT` | Number | No | Server port |
| `CORS_ORIGINS` | String | Yes | CORS configuration |
| `RATE_LIMIT_MAX` | Number | No | Rate limiting |
| `RATE_LIMIT_WINDOW` | Number | No | Rate limit window |

### 1.5 Robot Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `MT5_LOGIN` | String | ✅ Yes | MT5 account |
| `MT5_PASSWORD` | Secret | ✅ Yes | MT5 password |
| `MT5_SERVER` | String | ✅ Yes | MT5 server |
| `MT5_PATH` | String | No | Terminal path |
| `API_KEY` | Secret | ✅ Yes | API authentication |
| `API_URL` | String | ✅ Yes | Backend URL |
| `REDIS_URL` | String | Yes | Redis connection |
| `DATABASE_URL` | String | Yes | Database connection |

---

## 2. Missing Variables

### 2.1 Critical (Block Deployment)

| Variable | Required By | Issue |
|----------|------------|-------|
| `DATABASE_URL` | api, web, robot, database | Not defined in .env.example for robot |
| `JWT_SECRET` | api, web | Not defined in robot .env.example |
| `REDIS_URL` | api, web | Not defined in robot .env.example |
| `MT5_LOGIN` | engine | Not defined in api .env.example |
| `MT5_PASSWORD` | engine | Not defined in api .env.example |
| `MT5_SERVER` | engine | Not defined in api .env.example |

### 2.2 Missing in Configuration Service

| Variable | Issue |
|----------|-------|
| `DATABASE_URL` | Should be read from configService |
| `JWT_SECRET` | Should be read from configService |
| `REDIS_URL` | Should be read from configService |
| `API_KEY` | Should be read from configService |

### 2.3 Missing in Frontend

| Variable | Issue |
|----------|-------|
| `NEXT_PUBLIC_STRIPE_KEY` | Stripe integration not configured |
| `NEXT_PUBLIC_GA_ID` | Google Analytics not configured |

---

## 3. Duplicate Variables

### 3.1 Cross-Application Duplicates

| Variable | Appears In | Issue |
|----------|-----------|-------|
| `DATABASE_URL` | api, web, robot | Should be centralized in shared config |
| `JWT_SECRET` | api, web | Exposed to frontend (SECURITY ISSUE) |
| `ENCRYPTION_KEY` | api, web | Exposed to frontend (SECURITY ISSUE) |

### 3.2 Duplicate with Different Purposes

| Variable | api | web | robot | Issue |
|----------|-----|-----|-------|-------|
| `API_KEY` | ✅ | - | ✅ | Different purposes |
| `API_URL` | - | - | ✅ | Should match NEXT_PUBLIC_API_URL |
| `ROBOT_API_URL` | ✅ | ✅ | - | Different from API_URL |

---

## 4. Inconsistent Variable Names

### 4.1 Naming Convention Violations

| Current | Recommended | Location |
|---------|-------------|----------|
| `MT5_USE_DEMO` | `MT5_DEMO_MODE` | api, engine |
| `MT5_HOST` | `MT5_BRIDGE_HOST` | api, engine |
| `MT5_PORT` | `MT5_BRIDGE_PORT` | api, engine |
| `ROBOT_API_KEY` | `API_KEY` | api, web |
| `ROBOT_API_URL` | `API_BASE_URL` | api, web |

### 4.2 Case Inconsistencies

| Variable | Used As | Issue |
|----------|---------|-------|
| `MT5_PASSWORD` | snake_case | Should be consistent with API conventions |
| `API_KEY` | SCREAMING_SNAKE | Mix of styles |

---

## 5. Security Issues

### 5.1 Critical Issues

| ID | Issue | Location | Risk |
|----|-------|----------|------|
| SEC-01 | `JWT_SECRET` exposed to frontend via .env.example | apps/web/.env.example | ✅ CRITICAL - Secrets in frontend |
| SEC-02 | `ENCRYPTION_KEY` exposed to frontend | apps/web/.env.example | ✅ CRITICAL - Encryption keys exposed |

### 5.2 Security Recommendations

1. **Remove secrets from frontend .env.example**
   - Remove: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`
   - Keep only: `NEXT_PUBLIC_*`, `DATABASE_URL` (if needed)

2. **Hardcoded fallback secrets**
   - `packages/database/src/auth/jwt.ts:3` - Hardcoded fallback
   - `packages/database/src/auth/repository.ts:152` - Hardcoded fallback

3. **MT5 credentials in environment**
   - Consider using a secrets manager
   - Add encryption for MT5_PASSWORD

---

## 6. Turbo Workspace Configuration

### 6.1 Current Configuration

```json
{
  "globalDependencies": [".env"],
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["build"], "outputs": ["coverage/**"] }
  }
}
```

### 6.2 Issues Found

| Issue | Severity | Description |
|-------|----------|-------------|
| Missing workspace detection | Low | Should detect apps/* and packages/* |
| No build ordering | Low | API should build before web |
| Missing env validation | Medium | No env schema validation in turbo |

### 6.3 Recommendations

```json
{
  "pipeline": {
    "//#build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "web#build": {
      "dependsOn": ["api#build"],
      "outputs": [".next/**"]
    },
    "api#build": {
      "dependsOn": ["database#build", "trading-config#build", "engine#build"],
      "outputs": ["dist/**"]
    }
  }
}
```

---

## 7. Package Manager Configuration

### 7.1 Current Configuration

```json
{
  "packageManager": "npm@10.2.0",
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

### 7.2 Issues Found

| Issue | Severity | Description |
|-------|----------|-------------|
| No pnpm/yarn support | Low | Only npm specified |
| Missing workspace config | Medium | Should specify workspaces |

### 7.3 Recommendations

```json
{
  "packageManager": "npm@10.2.0",
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  },
  "workspaces": {
    "packages": ["apps/*", "packages/*"],
    "nohoist": ["**/node_modules/@forexos/**"]
  }
}
```

---

## 8. Vercel Configuration

### 8.1 Current Configuration

```json
{
  "framework": "nextjs",
  "buildCommand": "cd apps/web && npm install && npm run build",
  "outputDirectory": "apps/web/.next",
  "regions": ["sin1"],
  "public": true
}
```

### 8.2 Issues Found

| Issue | Severity | Description |
|-------|----------|-------------|
| Missing monorepo config | Medium | Not using Vercel monorepo support |
| Wrong build command | Low | Should use turbo |
| Missing env vars in vercel | High | Not all required vars configured |

### 8.3 Recommendations

```json
{
  "framework": "nextjs",
  "buildCommand": "npx turbo build --filter=web",
  "outputDirectory": "apps/web/.next",
  "installCommand": "npm install",
  "regions": ["sin1"],
  "github": {
    "silent": false,
    "autoJobCanceling": false
  },
  "projectSettings": {
    "buildCommand": "npx turbo build --filter=web",
    "installCommand": "npm install"
  }
}
```

---

## 9. Monorepo Compatibility

### 9.1 Workspace Structure

```
forexos/
├── apps/
│   ├── api/          ✅ Node.js API
│   └── web/          ✅ Next.js Frontend
├── packages/
│   ├── database/     ✅ Drizzle ORM
│   ├── engine/       ✅ Trading Engine
│   ├── trading-config/ ✅ Configuration
│   ├── types/        ✅ Shared Types
│   ├── ui/           ✅ UI Components
│   └── utils/        ✅ Utilities
├── robot/            ⚠️ Python (separate)
└── config/           ✅ Trading Config
```

### 9.2 Compatibility Matrix

| Package | TypeScript | Node.js | Works in Monorepo |
|---------|------------|---------|-------------------|
| database | ✅ | ✅ | ✅ |
| engine | ✅ | ✅ | ✅ |
| trading-config | ✅ | ✅ | ✅ |
| types | ✅ | ✅ | ✅ |
| ui | ✅ | ✅ | ✅ |
| utils | ✅ | ✅ | ✅ |
| api | ✅ | ✅ | ✅ |
| web | ✅ | ✅ | ✅ |

### 9.3 Issues Found

| Issue | Severity | Description |
|-------|----------|-------------|
| Robot outside workspace | Low | Python project not in npm workspaces |
| Config duplication | Low | Two config directories (config/, packages/config/) |
| Package naming | Low | `@forexos/trading-config` vs `packages/trading-config` |

---

## 10. Variable Usage Summary

### 10.1 Source Files Reference

| File | Variables Used |
|------|---------------|
| `apps/api/src/services/market/mt5.service.ts` | MT5_HOST, MT5_PORT, MT5_USE_DEMO |
| `apps/api/src/services/execution/execution.service.ts` | MT5_USE_DEMO |
| `apps/api/src/routes/market.routes.ts` | MT5_USE_DEMO |
| `packages/database/drizzle.config.ts` | DATABASE_URL |
| `packages/database/src/auth/jwt.ts` | JWT_SECRET |
| `packages/database/src/auth/repository.ts` | JWT_SECRET, DATABASE_URL |
| `packages/database/src/index.ts` | DATABASE_URL |
| `packages/engine/src/execution/connector.ts` | MT5_HOST, MT5_PORT, MT5_LOGIN, MT5_PASSWORD, MT5_SERVER, MT5_USE_DEMO |
| `apps/web/src/lib/auth/client.ts` | NEXT_PUBLIC_API_URL |

---

## 11. Recommendations Summary

### 11.1 Immediate Actions (Before Approval)

1. **Remove secrets from frontend .env.example**
   ```diff
   - JWT_SECRET=your-super-secret-jwt-key
   - JWT_REFRESH_SECRET=your-refresh-secret-key
   - ENCRYPTION_KEY=your-32-byte-encryption-key
   ```

2. **Add missing variables to .env.example files**

3. **Fix hardcoded fallback secrets in database package**

### 11.2 Short-term (Next Sprint)

1. Create centralized config package
2. Add environment validation
3. Implement secrets manager
4. Update Turbo configuration

### 11.3 Long-term (Future Phases)

1. Move to Vercel secrets manager
2. Add environment validation at build time
3. Implement runtime configuration
4. Add monitoring for missing variables

---

## 12. Approval Checklist

- [ ] Remove secrets from frontend .env.example
- [ ] Add missing environment variables
- [ ] Fix hardcoded fallback secrets
- [ ] Update Turbo configuration
- [ ] Update Vercel configuration
- [ ] Standardize variable naming
- [ ] Add environment validation
- [ ] Document all variables

---

*End of Configuration Audit Report*
