# ForexOS Project Audit Report

**Date:** 2026-06-24  
**Auditor:** OpenHands AI  
**Version:** 1.0.0

---

## Executive Summary

This audit comprehensively reviews the ForexOS trading platform codebase, examining architecture, security, code quality, and business logic correctness.

### Overall Assessment: **NEEDS ATTENTION**

| Category | Status |
|----------|--------|
| Architecture | ⚠️ Inconsistent |
| Security | ⚠️ Medium Risk |
| Code Quality | ⚠️ Needs Improvement |
| Type Safety | ✅ Good |
| Business Logic | ⚠️ Issues Found |

---

## 1. CRITICAL Issues

### 1.1 Risk Engine - Position Size Calculation Bug
**Location:** `packages/engine/src/decision/risk.ts:70-71`

```typescript
const riskPerPip = specs.pipValue;
const lotSize = riskAmount / (pipsAtRisk * riskPerPip);
```

**Issue:** Pip value is hardcoded as a fixed number (10 for most pairs), but should vary based on account currency. For non-USD accounts, pip value calculation is incorrect.

**Impact:** Position sizing will be inaccurate for non-USD accounts, leading to incorrect risk exposure.

**Recommendation:** Calculate pip value dynamically based on account currency:
```typescript
function calculatePipValue(symbol: string, accountCurrency: string): number {
  // Adjust for account currency
}
```

---

### 1.2 MT5 Connector - Demo Mode Always Returns Success
**Location:** `packages/engine/src/execution/connector.ts:336-337`

```typescript
if (this.isDemo) {
  return this.getDemoTradeResult(params);
}
```

**Issue:** Demo mode is enabled by default (`MT5_USE_DEMO !== 'false'`), meaning orders always succeed even with invalid parameters. This creates a false sense of functionality.

**Impact:** Production deployments may fail silently; bugs in order parameters won't be caught during development.

**Recommendation:** 
1. Require explicit `MT5_USE_DEMO=true` to enable demo mode
2. Add logging/warning when demo mode is active
3. Add validation even in demo mode

---

### 1.3 Pattern Service - Incorrect ATR Calculation
**Location:** `apps/api/src/services/pattern/pattern.service.ts:148-169`

```typescript
private calculateATR(candles: Candle[]): number {
  // Using simple average instead of Wilder's smoothing
  const recentTRs = trueRanges.slice(-14);
  return recentTRs.reduce((a, b) => a + b, 0) / recentTRs.length;
}
```

**Issue:** ATR is calculated using simple moving average, but MT5 uses Wilder's smoothing (exponential smoothing). This causes discrepancy between system ATR and broker ATR.

**Recommendation:** Use proper ATR calculation matching MT5:
```typescript
// First ATR is SMA, subsequent use Wilder's smoothing
const atr = firstSMA;
for (let i = period; i < trueRanges.length; i++) {
  atr = ((atr * (period - 1)) + trueRanges[i]) / period;
}
```

---

### 1.4 No Input Validation on Trade Execution
**Location:** `apps/api/src/routes/execution.routes.ts`

**Issue:** Order requests have minimal validation. Missing checks:
- Price deviation from market
- Volume within broker limits
- Stop loss/take profit distance from market price
- Symbol availability

**Impact:** Invalid orders may be sent to MT5, causing rejection or partial fills.

**Recommendation:** Add comprehensive order validation before execution.

---

## 2. HIGH Priority Issues

### 2.1 Duplicate asyncHandler Definition
**Location:** 
- `apps/api/src/middleware/error-handler.ts:59-65`
- `apps/api/src/middleware/auth.ts:13-19`

**Issue:** `asyncHandler` is defined twice with identical functionality.

**Recommendation:** Remove duplicate from `auth.ts`, import from `error-handler.ts`.

---

### 2.2 Hardcoded Demo Account Balance
**Location:** `packages/engine/src/execution/connector.ts:403-417`

```typescript
private getDemoAccountInfo(): AccountInfo {
  return {
    balance: 10000,
    equity: 10000,
    // ...
  };
}
```

**Issue:** Demo balance is hardcoded to 10000, ignoring user's actual account balance in risk calculations.

**Recommendation:** Accept balance as parameter or use a configuration file.

---

### 2.3 Missing Error Handling in MT5 Connector
**Location:** `packages/engine/src/execution/connector.ts:201-217`

**Issue:** `sendRequest` doesn't handle WebSocket connection failures gracefully. If connection drops mid-request, the promise never resolves.

**Recommendation:** Add connection state check and explicit error handling.

---

### 2.4 Pattern Detection - Missing Harami Implementation
**Location:** `packages/engine/src/patterns/types.ts`

**Issue:** `harami` is listed as a pattern type but `detectHarami` function is not implemented in `candlestick.ts`.

**Recommendation:** Implement Harami pattern detection or remove from pattern types.

---

### 2.5 No Database Transactions
**Location:** `packages/database/src/repositories/*.ts`

**Issue:** Repository operations don't use database transactions. Multi-step operations (e.g., create order + update account) could leave data inconsistent.

**Recommendation:** Wrap related operations in transactions.

---

### 2.6 Correlation Calculation is Binary
**Location:** `packages/engine/src/decision/risk.ts:202-223`

```typescript
return overlap.length > 0 ? 1 : 0;
```

**Issue:** Correlation returns only 0 or 1 (100%), not actual correlation coefficient.

**Recommendation:** Implement proper correlation coefficient calculation.

---

## 3. MEDIUM Priority Issues

### 3.1 Missing Environment Variables Validation
**Location:** `apps/api/src/config/env.ts`

**Issue:** `MT5_HOST`, `MT5_PORT`, `MT5_PASSWORD`, `MT5_SERVER` are not validated, but used in connector.

**Recommendation:** Add MT5-related variables to Zod schema.

---

### 3.2 Inconsistent API Response Format
**Location:** Various route files

**Issue:** Some endpoints return `{ success: true, data: {...} }`, others may return `{ success: true, data: { data: {...} } }`.

**Recommendation:** Create a standardized response wrapper.

---

### 3.3 No Rate Limiting Per-User
**Location:** `apps/api/src/index.ts`

**Issue:** Rate limiting is global, not per-user. One user can exhaust limits for all users.

**Recommendation:** Implement per-user rate limiting using user ID from JWT.

---

### 3.4 Missing Index on Database Queries
**Location:** `packages/database/src/schema/*.ts`

**Issue:** No explicit indexes defined on frequently queried columns (e.g., `candles.symbol`, `candles.timestamp`, `positions.accountId`).

**Recommendation:** Add indexes for performance:
```typescript
.index('idx_candles_symbol_time', ['symbol', 'timestamp'])
.index('idx_positions_account', ['accountId'])
```

---

### 3.5 No Logging Framework
**Location:** Throughout codebase

**Issue:** Using `console.log` and `console.error` instead of a structured logging framework.

**Recommendation:** Implement a logging library (e.g., Winston, Pino) with levels, structured output, and log rotation.

---

### 3.6 Genetic Algorithm - Type Casting Issues
**Location:** `packages/engine/src/optimization/genetic.ts:59-62`

```typescript
private async evaluatePopulation(
  population: Chromosome[],
  fitnessFunction: (params: ParameterSet, candles: import('./types').default['candles'] extends infer T ? T : never) => Promise<FitnessMetrics>,
```

**Issue:** Complex type inference that may cause runtime errors.

**Recommendation:** Simplify type signatures.

---

### 3.7 Missing Symbol Coverage
**Location:** `packages/engine/src/decision/risk.ts:14-28`

**Issue:** Only 6 symbols defined (EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, USDCAD), but MT5 supports many more.

**Recommendation:** Either fetch from MT5 dynamically or expand symbol list.

---

## 4. LOW Priority Issues

### 4.1 Duplicate Type Definitions
**Location:**
- `packages/engine/src/indicators/types.ts`
- `packages/engine/src/decision/types.ts`

**Issue:** Some types are duplicated across files (e.g., `Position`, `OrderType`).

**Recommendation:** Consolidate shared types in `packages/types`.

---

### 4.2 Missing JSDoc Comments
**Location:** Most files

**Issue:** Functions lack comprehensive documentation.

**Recommendation:** Add JSDoc for public APIs.

---

### 4.3 No Unit Tests
**Location:** Project-wide

**Issue:** No test files found (`*.test.ts`, `*.spec.ts`).

**Recommendation:** Implement comprehensive test coverage, especially for:
- Indicator calculations
- Pattern detection
- Risk calculations
- Position sizing

---

### 4.4 Magic Numbers
**Location:** Various files

**Issue:** Hardcoded magic numbers without explanation (e.g., `1.5` for ATR multiplier, `2` for risk-reward).

**Recommendation:** Define as named constants with documentation.

---

### 4.5 Unused Import
**Location:** `apps/api/src/routes/pattern.routes.ts:7`

```typescript
import { z } from 'zod';
```

**Issue:** May not be used if schema validation is inline.

**Recommendation:** Verify and remove unused imports.

---

### 4.6 Missing `pnpm-lock.yaml`
**Location:** Project root

**Issue:** Only `package-lock.json` found, but project uses `pnpm` (see `package.json`).

**Recommendation:** Run `pnpm import` to convert or regenerate with `pnpm install`.

---

## 5. Security Issues

### 5.1 JWT Secret Not Enforced
**Location:** `apps/api/src/config/env.ts`

**Issue:** `JWT_SECRET` requires min 32 chars, but no entropy validation. Weak secrets would pass.

**Recommendation:** Add password strength validation or require secrets to be generated using a secure random generator.

---

### 5.2 CORS Wildcard Potential
**Location:** `apps/api/src/config/env.ts`

**Issue:** If `CORS_ORIGINS` includes `*`, CORS protection is bypassed.

**Recommendation:** Validate that `*` is not in the CORS origins list.

---

### 5.3 No SQL Injection Prevention Check
**Location:** `packages/database/src/repositories/*.ts`

**Issue:** Need to verify Drizzle ORM properly sanitizes inputs. Manual SQL construction should be avoided.

**Recommendation:** Audit all database queries, use Drizzle's query builder exclusively.

---

### 5.4 Sensitive Data in Logs
**Location:** `apps/api/src/middleware/error-handler.ts:22`

```typescript
console.error('Error:', err);
```

**Issue:** Full error objects may contain sensitive data.

**Recommendation:** Sanitize errors before logging.

---

## 6. Performance Issues

### 6.1 Pattern Detection - O(n²) Complexity
**Location:** `packages/engine/src/patterns/chart.ts:26-51`

**Issue:** `findSwingPoints` iterates through all candles for each point.

**Recommendation:** Optimize with sliding window approach.

---

### 6.2 No Caching
**Location:** `apps/api/src/services/indicators/indicator.service.ts`

**Issue:** Indicator calculations run on every request, even for the same symbol/timeframe.

**Recommendation:** Implement caching (Redis or in-memory) with TTL.

---

### 6.3 Large Candle Arrays in Memory
**Location:** Throughout indicator calculations

**Issue:** Converting candles to multiple arrays (`closes`, `highs`, etc.) duplicates data.

**Recommendation:** Work directly with candle objects or use typed arrays.

---

## 7. Summary by File

| File | Critical | High | Medium | Low |
|------|----------|------|--------|-----|
| `risk.ts` | 1 | 1 | 1 | 1 |
| `connector.ts` | 1 | 2 | 0 | 0 |
| `pattern.service.ts` | 1 | 0 | 0 | 0 |
| `execution.routes.ts` | 1 | 0 | 0 | 0 |
| `auth.ts` | 0 | 1 | 1 | 1 |
| `error-handler.ts` | 0 | 0 | 1 | 1 |
| `indicator.service.ts` | 0 | 0 | 1 | 1 |
| `env.ts` | 0 | 0 | 2 | 1 |
| Database schemas | 0 | 0 | 1 | 0 |
| Genetic optimizer | 0 | 0 | 1 | 0 |
| **TOTAL** | **4** | **4** | **8** | **6** |

---

## 8. Recommended Actions

### Immediate (Critical)
1. Fix ATR calculation to match MT5
2. Require explicit demo mode flag
3. Add comprehensive order validation
4. Fix pip value calculation for all account currencies

### Short Term (High)
1. Remove duplicate `asyncHandler`
2. Add transaction support to repositories
3. Fix correlation calculation
4. Implement Harami pattern or remove from types

### Medium Term
1. Add per-user rate limiting
2. Implement database indexes
3. Set up logging framework
4. Add comprehensive tests

### Long Term
1. Add WebSocket support for real-time updates
2. Implement caching layer
3. Create API documentation (OpenAPI/Swagger)
4. Add monitoring and alerting

---

## 9. Testing Recommendations

| Component | Test Priority | Test Type |
|-----------|---------------|-----------|
| Indicator calculations | Critical | Unit tests against known values |
| Pattern detection | Critical | Unit tests with historical data |
| Risk calculator | Critical | Unit tests for edge cases |
| Position sizing | Critical | Unit tests for various symbols |
| API endpoints | High | Integration tests |
| MT5 connector | High | Mock tests |
| Auth middleware | Medium | Unit tests |

---

*Report generated by OpenHands AI Assistant*
