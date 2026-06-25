# Database Deployment Checklist

Neon PostgreSQL integration audit for ForexOS.

---

## Executive Summary

| Status | Count |
|--------|-------|
| ✅ Ready | 12 |
| ⚠️ Warning | 4 |
| 🔴 Blocked | 0 |
| ❌ Not Applicable | 2 |

---

## Database Overview

| Item | Value |
|------|-------|
| **Provider** | Neon PostgreSQL |
| **ORM** | Drizzle ORM |
| **Driver** | @neondatabase/serverless |
| **Schema Location** | `packages/database/src/schema/` |
| **Migrations** | `packages/database/drizzle/migrations/` |
| **Tables** | 10 |
| **Indexes** | 13 |

---

## 1. DATABASE_URL Configuration

### ✅ Connection String Format

```typescript
// packages/database/src/index.ts
const sql = neon(process.env.DATABASE_URL!);
```

**Expected Format:**
```
postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

### ⚠️ SSL Configuration

| Setting | Current | Required |
|---------|---------|----------|
| `sslmode` | URL parameter | ✅ Required |
| Driver SSL | Default (TLS) | ✅ Neon handles |

**Recommendation:** Append `?sslmode=require` to all DATABASE_URL values.

### ✅ Verified Files

| File | Status | Notes |
|------|--------|-------|
| `drizzle.config.ts` | ✅ | Uses `process.env.DATABASE_URL` |
| `src/index.ts` | ✅ | Neon serverless driver |
| `src/auth/repository.ts` | ✅ | Database queries |
| `apps/api/.env.example` | ✅ | Example with `?sslmode=require` |

---

## 2. Drizzle Configuration

### ✅ Drizzle Config

```typescript
// packages/database/drizzle.config.ts
export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### ✅ Schema Export

```typescript
// packages/database/src/schema/index.ts
export * from './users';
export * from './accounts';
export * from './sessions';
export * from './orders';
export * from './positions';
export * from './trades';
export * from './symbols';
export * from './strategies';
export * from './candles';
export * from './patterns';
```

---

## 3. Migrations

### ✅ Migration Status

| Migration | Status |
|-----------|--------|
| `0000_fresh_jamie_braddock.sql` | ✅ Generated |
| Journal | ✅ Configured |
| Meta | ✅ Tracked |

### Migration Tables

| Table | Columns | Constraints | Indexes |
|-------|---------|-------------|---------|
| `users` | 14 | 1 (email unique) | 0 |
| `accounts` | 14 | 1 (FK to users) | 2 |
| `sessions` | 9 | 1 (FK to users) | 0 |
| `orders` | 17 | 1 (FK to accounts) | 3 |
| `positions` | 16 | 1 (FK to accounts) | 3 |
| `trades` | 16 | 1 (FK to accounts) | 0 |
| `symbols` | 16 | 1 (name unique) | 2 |
| `strategies` | 11 | 1 (FK to users) | 0 |
| `candles` | 11 | 0 | 2 |
| `patterns` | 17 | 2 (FKs) | 0 |

### ⚠️ Missing Migration Indexes

The following indexes from schema files are NOT in migrations:

| Schema File | Index | Status |
|-------------|-------|--------|
| `accounts.ts` | `accounts_user_id_idx` | ⚠️ Not in migration |
| `accounts.ts` | `accounts_mt5_login_idx` | ⚠️ Not in migration |
| `orders.ts` | `orders_account_id_idx` | ⚠️ Not in migration |
| `orders.ts` | `orders_symbol_idx` | ⚠️ Not in migration |
| `orders.ts` | `orders_status_idx` | ⚠️ Not in migration |
| `positions.ts` | `positions_account_id_idx` | ⚠️ Not in migration |
| `positions.ts` | `positions_symbol_idx` | ⚠️ Not in migration |
| `positions.ts` | `positions_mt5_ticket_idx` | ⚠️ Not in migration |
| `symbols.ts` | `symbols_category_idx` | ⚠️ Not in migration |
| `symbols.ts` | `symbols_is_active_idx` | ⚠️ Not in migration |

**Note:** Candles table indexes ARE in migration.

### ✅ Missing Indexes Script

Run this to create missing indexes:

```sql
-- Accounts
CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts" ("user_id");
CREATE INDEX IF NOT EXISTS "accounts_mt5_login_idx" ON "accounts" ("mt5_login");

-- Orders
CREATE INDEX IF NOT EXISTS "orders_account_id_idx" ON "orders" ("account_id");
CREATE INDEX IF NOT EXISTS "orders_symbol_idx" ON "orders" ("symbol");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" ("status");

-- Positions
CREATE INDEX IF NOT EXISTS "positions_account_id_idx" ON "positions" ("account_id");
CREATE INDEX IF NOT EXISTS "positions_symbol_idx" ON "positions" ("symbol");
CREATE INDEX IF NOT EXISTS "positions_mt5_ticket_idx" ON "positions" ("mt5_ticket");

-- Symbols
CREATE INDEX IF NOT EXISTS "symbols_category_idx" ON "symbols" ("category");
CREATE INDEX IF NOT EXISTS "symbols_is_active_idx" ON "symbols" ("is_active");
```

---

## 4. Indexes Summary

### ✅ Indexes Present

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| `candles` | `candles_symbol_timeframe_timestamp_idx` | symbol, timeframe, timestamp | Primary lookup |
| `candles` | `candles_symbol_timeframe_idx` | symbol, timeframe | Range queries |
| `sessions` | `sessions_token_unique` | token | Session validation |
| `trades` | `trades_mt5_ticket_unique` | mt5_ticket | Unique ticket |
| `positions` | `positions_mt5_ticket_unique` | mt5_ticket | Unique ticket |
| `users` | `users_email_unique` | email | Unique email |
| `symbols` | `symbols_name_unique` | name | Unique symbol |

### ⚠️ Indexes Missing (Run Script Above)

| Table | Index | Type |
|-------|-------|------|
| `accounts` | user_id | FK lookup |
| `accounts` | mt5_login | MT5 lookup |
| `orders` | account_id | FK lookup |
| `orders` | symbol | Symbol lookup |
| `orders` | status | Filter lookup |
| `positions` | account_id | FK lookup |
| `positions` | symbol | Symbol lookup |
| `positions` | mt5_ticket | Ticket lookup |
| `symbols` | category | Category filter |
| `symbols` | is_active | Active filter |

---

## 5. Connection Pooling

### ✅ Neon Serverless Driver

Neon uses **serverless driver** architecture:

```
┌─────────────────────────────────────────────────────┐
│                   Your Application                    │
│                    (Node.js)                         │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ WebSocket
                      ▼
┌─────────────────────────────────────────────────────┐
│               Neon Proxy                             │
│         (Connection Pooling)                         │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ TCP
                      ▼
┌─────────────────────────────────────────────────────┐
│              Neon PostgreSQL                         │
│               (Compute)                              │
└─────────────────────────────────────────────────────┘
```

### ⚠️ Connection Pooling Settings

| Setting | Current | Neon Default | Recommendation |
|---------|---------|--------------|----------------|
| Max Connections | Not set | 10 | 10 for serverless |
| Connection Timeout | Not set | 5s | 5s |
| Idle Timeout | Not set | 10s | 10s |

**Note:** Neon manages pooling automatically with serverless driver.

### ✅ Connection Verification

```typescript
// packages/database/src/index.ts
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

---

## 6. Authentication Repository

### ✅ Auth Functions

| Function | Status | Purpose |
|----------|--------|---------|
| `register()` | ✅ | Create user + session |
| `login()` | ✅ | Authenticate + session |
| `validateSession()` | ✅ | JWT + DB session |
| `logout()` | ✅ | Invalidate session |
| `getUserById()` | ✅ | Get user by ID |

### ⚠️ Security Warning

**Hardcoded Fallback Secret:**

```typescript
// packages/database/src/auth/repository.ts:152
const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'dev-secret-change-in-production');
```

**Fix Required:** Remove fallback in production.

### ✅ Password Hashing

```typescript
// Uses bcryptjs for password hashing
const passwordHash = await hashPassword(input.password);
```

---

## 7. Schema Definitions

### Users Table

```typescript
// packages/database/src/schema/users.ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  settings: jsonb('settings').$type<Record<string, unknown>>().default({}),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  isActive: boolean('is_active').default(true),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
```

### Trading Tables

| Table | Purpose |
|-------|---------|
| `accounts` | User MT5 accounts |
| `orders` | Pending orders |
| `positions` | Open positions |
| `trades` | Closed trades |
| `symbols` | Trading instruments |
| `candles` | Price data |
| `patterns` | Detected patterns |
| `strategies` | Trading strategies |

---

## 8. Deployment Checklist

### Pre-Deployment

- [ ] Neon project created
- [ ] DATABASE_URL copied
- [ ] `?sslmode=require` appended
- [ ] Schema migrations run
- [ ] Missing indexes created

### Database Commands

```bash
# Generate migrations
npm run db:generate

# Push schema (development)
npm run db:push

# Run migrations (production)
npm run db:migrate

# Studio (local development)
npm run db:studio
```

### Environment Variables

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | ✅ Yes | `postgresql://...@...neon.tech/db?sslmode=require` |

---

## 9. Performance Recommendations

### Indexes for Production

```sql
-- Critical for trading performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS "candles_symbol_timeframe_timestamp_idx" 
  ON "candles" ("symbol", "timeframe", "timestamp");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_account_id_idx" 
  ON "orders" ("account_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "positions_account_id_idx" 
  ON "positions" ("account_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "trades_account_id_idx" 
  ON "trades" ("account_id");
```

### Partitioning (Future)

Consider partitioning `candles` table by time for better performance:

```sql
-- Example: Range partitioning by month
CREATE TABLE candles (
  ...
) PARTITION BY RANGE (timestamp);
```

---

## 10. Summary

### Ready for Deployment ✅

| Item | Status |
|------|--------|
| Neon Driver | ✅ Configured |
| SSL/TLS | ✅ Enabled |
| Drizzle ORM | ✅ Configured |
| Schema | ✅ Defined |
| Migrations | ✅ Generated |
| Auth | ✅ Implemented |
| Connection | ✅ Serverless |

### Action Items ⚠️

| Item | Priority | Action |
|------|----------|--------|
| Missing Indexes | HIGH | Run CREATE INDEX script |
| JWT Fallback Secret | MEDIUM | Remove production fallback |
| Connection Pooling | LOW | Monitor Neon console |

### Before First Deployment

1. Create Neon project
2. Copy connection string
3. Add `?sslmode=require`
4. Run: `npm run db:push`
5. Run index creation script
6. Test connection

---

*Last updated: 2026-06-24*
