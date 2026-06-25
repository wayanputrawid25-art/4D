# Vercel Deployment Checklist

Vercel compatibility audit for ForexOS monorepo.

---

## Executive Summary

| Status | Count |
|--------|-------|
| ✅ Ready | 15 |
| ⚠️ Warning | 3 |
| 🔴 Blocked | 4 |
| ❌ Not Applicable | 8 |

---

## Blocking Issues (Must Fix Before Deployment)

### BLOCK-01: Backend API Uses Express (Not Next.js API)

**Severity:** CRITICAL  
**Location:** `apps/api/`  
**Description:** Backend is a separate Express.js application, not Next.js API routes.

**Impact:** Vercel deployment of `apps/web` cannot include the backend. Backend must be deployed separately.

**Solution Options:**

| Option | Pros | Cons |
|--------|------|------|
| **A. Deploy API separately** | Simple, independent scaling | Two deployments to manage |
| **B. Convert to Next.js API routes** | Single deployment | Rewrite Express → Next.js |
| **C. Use separate hosting** | Best for production | Railway, Render, Fly.io |

**Recommendation:** Option A - Deploy API to Railway/Render, Web to Vercel.

---

### BLOCK-02: Environment Variables in Root .env

**Severity:** HIGH  
**Location:** `.env.example`  
**Description:** Environment variables are at monorepo root, not scoped per app.

**Impact:** Vercel cannot inject environment variables correctly for monorepo structure.

**Required Vercel Environment Variables:**

| Variable | Required | Current |
|----------|----------|---------|
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | ✅ In vercel.json |
| `NEXT_PUBLIC_API_URL` | ✅ Yes | ✅ In vercel.json |
| `DATABASE_URL` | ✅ Yes | ❌ Missing |
| `JWT_SECRET` | ✅ Yes | ❌ Missing |
| `CORS_ORIGINS` | ✅ Yes | ❌ Missing |

**Solution:** Add all required variables to Vercel Dashboard.

---

### BLOCK-03: Next.js Output Directory Mismatch

**Severity:** HIGH  
**Location:** `vercel.json`, `turbo.json`  
**Description:** Build outputs may not be traced correctly.

**Current Config:**
```json
// vercel.json
"outputDirectory": "apps/web/.next"
```

**Issue:** Vercel expects `.next` at root or configured path.

**Solution:** Verify build outputs to `apps/web/.next`.

---

### BLOCK-04: Missing Build Verification

**Severity:** MEDIUM  
**Location:** CI/CD  
**Description:** No automated build verification before deployment.

**Solution:** Add build step to GitHub Actions:
```yaml
- name: Build Web
  run: npm run build --filter=@forexos/web
```

---

## Warnings (Should Fix)

### WARN-01: API URL Points to localhost

**Severity:** LOW  
**Location:** `apps/web/.env.example`  
**Current:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Required for Vercel:**
```bash
NEXT_PUBLIC_API_URL=https://forexos-api.vercel.app
```

---

### WARN-02: CORS Configuration Static

**Severity:** LOW  
**Location:** `apps/api/src/config/env.ts`  
**Issue:** CORS origins are loaded at startup, may not update with Vercel cold starts.

**Current:**
```typescript
corsOrigins: parsed.data.CORS_ORIGINS.split(','),
```

---

### WARN-03: MT5 WebSocket Not Edge Compatible

**Severity:** LOW  
**Location:** `apps/api/src/services/market/mt5.service.ts`  
**Issue:** Uses Node.js `WebSocket`, cannot run on Edge Runtime.

**Status:** ✅ OK - API runs on Node.js runtime (separate deployment).

---

## Ready for Deployment

### ✅ Configuration

| Item | Status | Notes |
|------|--------|-------|
| `next.config.js` | ✅ Ready | Standard Next.js 14 config |
| `transpilePackages` | ✅ Ready | Configured for monorepo packages |
| `reactStrictMode` | ✅ Ready | Enabled |
| `typedRoutes` | ✅ Ready | Experimental feature enabled |

### ✅ Environment Variables (Frontend)

| Variable | Status | Location |
|----------|--------|----------|
| `NEXT_PUBLIC_APP_URL` | ✅ Ready | vercel.json |
| `NEXT_PUBLIC_API_URL` | ✅ Ready | vercel.json |
| `NEXT_PUBLIC_APP_ENV` | ✅ Ready | vercel.json |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | ✅ Ready | vercel.json |
| `NEXT_PUBLIC_ENABLE_DEBUG_MODE` | ✅ Ready | vercel.json |

### ✅ Build Pipeline

| Step | Status | Verified |
|------|--------|----------|
| Turbo build | ✅ Ready | `npx turbo build --filter=//web` |
| Next.js build | ✅ Ready | `next build` |
| TypeScript | ✅ Ready | `tsc --noEmit` |
| Output directory | ✅ Ready | `apps/web/.next` |

### ✅ Code Quality

| Check | Status |
|-------|--------|
| No `middleware.ts` edge issues | ✅ Ready |
| No server-only code in client | ✅ Ready |
| `'use client'` directives | ✅ Ready |
| Auth store is client-only | ✅ Ready |
| Auth client uses NEXT_PUBLIC | ✅ Ready |

### ✅ Monorepo Structure

| Package | Build | Exports |
|---------|-------|---------|
| `@forexos/types` | ✅ | ✅ |
| `@forexos/utils` | ✅ | ✅ |
| `@forexos/ui` | ✅ | ✅ |
| `@forexos/trading-config` | ✅ | ✅ |
| `@forexos/engine` | ✅ | ✅ |
| `@forexos/database` | ✅ | ✅ |

---

## Not Applicable

| Item | Reason |
|------|--------|
| Server Actions | Not used |
| ISR/SSG | Standard SSR |
| Edge Runtime | Not required |
| Image Optimization | Standard config |
| Middleware | Not implemented |
| i18n | Not implemented |
| Middleware Edge Config | No middleware |
| Vercel Blob | Not used |

---

## Deployment Steps

### 1. Deploy Backend (Railway/Render)

```bash
# Clone repo
git clone https://github.com/wayanputrawid25-art/AI_Assist_Trading.git
cd AI_Assist_Trading

# Install dependencies
npm install

# Build API
npm run build --filter=@forexos/api

# Deploy to Railway
railway up
```

### 2. Configure Backend Environment

Set these in Railway/Render:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon connection string |
| `JWT_SECRET` | Min 32 char secret |
| `JWT_REFRESH_SECRET` | Min 32 char secret |
| `CORS_ORIGINS` | `https://your-web.vercel.app` |
| `PORT` | `3001` |
| `NODE_ENV` | `production` |

### 3. Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com)
2. Import `AI_Assist_Trading`
3. Configure:

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Root Directory | `.` |
| Build Command | `npx turbo build --filter=//web` |
| Output Directory | `apps/web/.next` |

4. Add Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` |
| `NEXT_PUBLIC_API_URL` | `https://your-api.railway.app` |
| `NEXT_PUBLIC_APP_ENV` | `production` |

### 4. Update CORS

After frontend URL is known, update backend `CORS_ORIGINS` to include:
```
https://your-project.vercel.app
```

---

## Post-Deployment Verification

### Checklist

- [ ] Frontend loads at Vercel URL
- [ ] Backend health check returns 200
- [ ] Login/Register works
- [ ] API calls succeed from frontend
- [ ] CORS headers correct
- [ ] No console errors
- [ ] Web Vitals in range

### Test Endpoints

```bash
# Health check
curl https://your-api.railway.app/health

# CORS test
curl -I -X OPTIONS \
  -H "Origin: https://your-web.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  https://your-api.railway.app/api/v1/auth/login
```

---

## Summary

### Before Deployment

1. ✅ Monorepo structure ready
2. ✅ Build pipeline configured
3. ✅ Environment variables documented
4. 🔴 Deploy backend separately (Express → Railway)
5. 🔴 Add missing Vercel env vars
6. 🔴 Update NEXT_PUBLIC_API_URL to production URL

### After Fixes

All items should be ✅ Ready for deployment.

---

*Last updated: 2026-06-24*
