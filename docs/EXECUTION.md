# ForexOS Execution Engine

**Last Updated:** 2026-06-25

Complete guide for ForexOS Execution Engine - order execution, position management, and trade protections.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Order Execution](#order-execution)
4. [Position Management](#position-management)
5. [Advanced Features](#advanced-features)
6. [Execution Filters](#execution-filters)
7. [Protections](#protections)
8. [API Reference](#api-reference)
9. [Usage Examples](#usage-examples)

---

## Overview

### What Is the Execution Engine?

The Execution Engine handles all trade execution and position management:

- **Order Execution**: Market, limit, and stop orders
- **Position Management**: Track and modify open positions
- **Trailing Stops**: Dynamic stop loss movement
- **Break Even**: Move SL to entry price
- **Partial Close**: Close portion of position
- **Execution Filters**: Spread, slippage, market hours

### Components

| Component | Purpose |
|-----------|---------|
| `MT5Connector` | Low-level MT5 API connection |
| `OrderExecutor` | Order validation and execution |
| `PositionManager` | Position tracking and management |
| `AdvancedOrderExecutor` | Advanced features (trailing, filters) |

---

## Architecture

### Module Structure

```
packages/engine/src/execution/
├── types.ts      # Type definitions
├── connector.ts  # MT5 API connection
├── executor.ts   # Order execution
├── manager.ts    # Position management
├── advanced.ts  # Advanced features
└── index.ts     # Module exports
```

### Execution Flow

```
Trading Decision
       ↓
Advanced Executor
  - Spread Check
  - Slippage Check
  - Market Hours Check
       ↓
Retry Logic
       ↓
Order Executor
  - Validation
  - Demo/Real Mode
       ↓
MT5 Connector
       ↓
Position Update
```

---

## Order Execution

### Order Types

| Type | Description |
|------|-------------|
| `market` | Execute immediately at current price |
| `limit` | Execute at specified price or better |
| `stop` | Execute when price crosses level |

### Execute Order

```typescript
import { OrderExecutor } from '@forexos/engine';

// Create executor
const executor = new OrderExecutor(connector, false);

// Execute buy order
const result = await executor.executeBuy({
  symbol: 'EURUSD',
  type: 'buy',
  volume: 0.10,
  stopLoss: 1.0820,
  takeProfit: 1.0900,
});

if (result.success) {
  console.log(`Order executed: Ticket #${result.mt5Ticket}`);
  console.log(`Fill price: ${result.fillPrice}`);
}
```

### Order Validation

```typescript
const validation = executor.validateOrder({
  symbol: 'EURUSD',
  type: 'buy',
  volume: 0.10,
  stopLoss: 1.0820,
  takeProfit: 1.0900,
});

if (!validation.valid) {
  console.log('Errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.log('Warnings:', validation.warnings);
}
```

### Validation Checks

| Check | Error | Warning |
|-------|-------|---------|
| Symbol | Unknown symbol | - |
| Volume | Too small/large | Close to limit |
| SL/TP | Invalid for order type | Too close |
| Price | Required for pending | Stop level |

---

## Position Management

### Position Manager

```typescript
import { PositionManager } from '@forexos/engine';

const manager = new PositionManager(executor);

// Start tracking
manager.startTracking(5000); // Update every 5 seconds

// Get all positions
const positions = manager.getPositions();

// Get by symbol
const eurPositions = manager.getPositionsBySymbol('EURUSD');

// Get by ticket
const position = manager.getPosition(12345678);
```

### Position Summary

```typescript
const summary = manager.getSummary();

console.log(summary);
// {
//   totalPositions: 3,
//   totalVolume: 0.30,
//   totalProfit: 150.00,
//   totalLoss: 0,
//   buyPositions: 2,
//   sellPositions: 1,
//   largestPosition: 0.15,
//   averageProfit: 50.00
// }
```

### Close Positions

```typescript
// Close by ticket
await manager.closePosition(12345678);

// Close all by symbol
await manager.closeAllBySymbol('EURUSD');

// Close all positions
await manager.closeAll();
```

### Modify SL/TP

```typescript
// Set stop loss
await manager.setStopLoss(ticket, 1.0820);

// Set take profit
await manager.setTakeProfit(ticket, 1.0900);

// Move to breakeven
await manager.moveToBreakeven(ticket);
```

---

## Advanced Features

### Advanced Order Executor

```typescript
import { AdvancedOrderExecutor } from '@forexos/engine';

const advanced = new AdvancedOrderExecutor(executor, manager, {
  maxSpreadPips: 5,
  maxSlippagePips: 3,
  retryAttempts: 3,
  retryDelayMs: 1000,
  requireMarketHours: false,
});
```

### Execute with Protection

```typescript
const result = await advanced.executeWithProtection({
  symbol: 'EURUSD',
  type: 'buy',
  volume: 0.10,
  stopLoss: 1.0820,
  takeProfit: 1.0900,
});

if (result.success) {
  console.log(`Ticket: ${result.ticket}`);
  console.log(`Slippage: ${result.slippage?.toFixed(1)} pips`);
  console.log(`Spread: ${result.spread?.toFixed(1)} pips`);
} else if (result.filtered) {
  console.log(`Filtered: ${result.filterReason}`);
  console.log(`Error: ${result.error}`);
}
```

---

## Execution Filters

### Spread Filter

```typescript
// Check spread before execution
const spreadCheck = await advanced.checkSpread('EURUSD');

if (spreadCheck.rejected) {
  console.log(spreadCheck.reason);
  // "Spread too high: 6.2 pips (max: 5)"
}

// Default: 5 pips max
// Configurable via filters.maxSpreadPips
```

### Slippage Protection

```typescript
// Execute with slippage tracking
const result = await advanced.executeWithProtection(order);

if (result.slippage && result.slippage > 2) {
  console.log(`High slippage: ${result.slippage} pips`);
}

// Default: 3 pips max
// Configurable via filters.maxSlippagePips
```

### Market Hours Filter

```typescript
// Only execute during market hours
const advanced = new AdvancedOrderExecutor(executor, manager, {
  requireMarketHours: true,
});

// Market hours:
// - Monday 00:00 to Friday 22:00 UTC
// - Closed weekends
```

### Filter Configuration

```typescript
interface ExecutionFilters {
  maxSpreadPips: number;      // Default: 5
  maxSlippagePips: number;   // Default: 3
  retryAttempts: number;      // Default: 3
  retryDelayMs: number;       // Default: 1000
  requireMarketHours: boolean; // Default: false
}
```

---

## Protections

### Trailing Stop

```typescript
// Set trailing stop
await advanced.setTrailingStop(ticket, {
  enabled: true,
  triggerPips: 20,     // Activate after 20 pips profit
  stepPips: 10,        // Trail by 10 pips
  trailingType: 'classic',
});

// Trailing stop behavior:
// Buy position at 1.0850
// SL at 1.0820 (30 pip initial risk)
// When price reaches 1.0870 (20 pips profit):
//   SL moves to 1.0850 (breakeven)
// When price reaches 1.0880:
//   SL moves to 1.0860 (10 pip lock-in)
// When price reaches 1.0890:
//   SL moves to 1.0870 (20 pip lock-in)
```

### Trailing Types

| Type | Behavior |
|------|----------|
| `classic` | SL follows price at step distance |
| `mt4` | SL moves to highest profit point minus step |

### Break Even

```typescript
// Set break even
await advanced.setBreakEven(ticket, {
  enabled: true,
  triggerPips: 15,      // Move after 15 pips profit
  addBuffer: true,      // Add buffer to entry
  bufferPips: 2,         // 2 pip buffer for costs
});

// Break even behavior:
// Buy at 1.0850, SL at 1.0820
// When price reaches 1.0865 (15 pips profit):
//   SL moves to 1.0852 (entry + buffer)
```

### Partial Close

```typescript
// Set partial close
await advanced.setPartialClose(ticket, {
  enabled: true,
  triggerPips: 25,       // Trigger after 25 pips
  closePercent: 50,      // Close 50% of position
});

// Example:
// 0.10 lot position
// After 25 pips profit:
//   0.05 lot closes (locking in 50% of profit)
//   0.05 lot remains with trailing stop
```

### Update All Protections

```typescript
// Call in your trading loop
while (hasOpenPositions()) {
  await advanced.processAll(); // Update trailing, BE, partial
  await sleep(1000);
}
```

### Retry Logic

```typescript
// Retry configuration
interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;      // Default: 3
  initialDelayMs: number;    // Default: 1000
  maxDelayMs: number;        // Default: 5000
  backoffMultiplier: number; // Default: 2
}

// Retry behavior:
// Attempt 1: Immediate
// Attempt 2: Wait 1 second
// Attempt 3: Wait 2 seconds
// Attempt 4: Wait 4 seconds (max reached)
```

---

## API Reference

### OrderExecutor

```typescript
class OrderExecutor {
  constructor(connector: MT5Connector, isDemo?: boolean);
  
  // Execute orders
  executeBuy(order: OrderRequest): Promise<OrderResult>;
  executeSell(order: OrderRequest): Promise<OrderResult>;
  
  // Position operations
  closePosition(request: ClosePositionRequest): Promise<OrderResult>;
  modifyPosition(request: ModifyPositionRequest): Promise<OrderResult>;
  
  // Position queries
  getOpenPositions(): Promise<Position[]>;
  getPosition(ticket: number): Promise<Position | null>;
  
  // Calculations
  calculateMargin(symbol, volume, price, leverage): number;
  calculatePipValue(symbol, volume): number;
  
  // Validation
  validateOrder(order: OrderRequest): ExecutionValidation;
}
```

### PositionManager

```typescript
class PositionManager {
  constructor(executor: OrderExecutor);
  
  // Tracking
  startTracking(intervalMs?: number): void;
  stopTracking(): void;
  refreshPositions(): Promise<void>;
  
  // Queries
  getPositions(): Position[];
  getPosition(ticket: number): Position | undefined;
  getPositionsBySymbol(symbol: string): Position[];
  getSummary(): PositionSummary;
  
  // Operations
  closePosition(ticket: number): Promise<{ success: boolean; error?: string }>;
  closeAllBySymbol(symbol: string): Promise<CloseResult>;
  closeAll(): Promise<CloseResult>;
  
  // Modifications
  setStopLoss(ticket: number, stopLoss: number): Promise<boolean>;
  setTakeProfit(ticket: number, takeProfit: number): Promise<boolean>;
  moveToBreakeven(ticket: number): Promise<boolean>;
  
  // Statistics
  calculatePnL(): { profit: number; loss: number; net: number };
  calculateStats(): TradeStatistics;
  getHistory(limit?: number): TradeHistory[];
}
```

### AdvancedOrderExecutor

```typescript
class AdvancedOrderExecutor {
  constructor(
    executor: OrderExecutor,
    positionManager: PositionManager,
    filters?: Partial<ExecutionFilters>
  );
  
  // Execution
  executeWithProtection(order: OrderRequest): Promise<ExecutionResult>;
  
  // Modifications
  modifyOrder(ticket: number, stopLoss?, takeProfit?): Promise<ExecutionResult>;
  closePosition(ticket: number, volume?, partial?): Promise<ExecutionResult>;
  cancelOrder(ticket: number): Promise<ExecutionResult>;
  
  // Protections
  setTrailingStop(ticket: number, config: TrailingStopConfig): Promise<ExecutionResult>;
  setBreakEven(ticket: number, config: BreakEvenConfig): Promise<ExecutionResult>;
  setPartialClose(ticket: number, config: PartialCloseConfig): Promise<ExecutionResult>;
  
  // Updates
  updateTrailingStops(): Promise<void>;
  updateBreakEven(): Promise<void>;
  updatePartialCloses(): Promise<void>;
  processAll(): Promise<void>; // Update all protections
  
  // Cleanup
  removeTrailingStop(ticket: number): boolean;
  removeBreakEven(ticket: number): boolean;
  removePartialClose(ticket: number): boolean;
  
  // Filters
  getFilters(): ExecutionFilters;
  updateFilters(filters: Partial<ExecutionFilters>): void;
  checkSpread(symbol: string): Promise<SpreadCheck>;
}
```

### Types

```typescript
interface OrderRequest {
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  comment?: string;
  magicNumber?: number;
}

interface OrderResult {
  success: boolean;
  orderId?: string;
  mt5Ticket?: number;
  message?: string;
  error?: string;
  fillPrice?: number;
  fillTime?: number;
}

interface Position {
  mt5Ticket: number;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  priceOpen: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  profit: number;
  swap: number;
  commission: number;
  comment?: string;
  openTime: number;
  updateTime?: number;
}

interface ExecutionResult {
  success: boolean;
  ticket?: number;
  price?: number;
  volume?: number;
  slippage?: number;
  spread?: number;
  message?: string;
  error?: string;
  attempts?: number;
  retryUsed?: boolean;
  filtered?: boolean;
  filterReason?: string;
}
```

---

## Usage Examples

### Basic Execution

```typescript
import { 
  MT5Connector, 
  OrderExecutor, 
  PositionManager,
  AdvancedOrderExecutor 
} from '@forexos/engine';

async function basicExecution() {
  // Initialize
  const connector = new MT5Connector();
  await connector.connect();
  
  const executor = new OrderExecutor(connector, false);
  const manager = new PositionManager(executor);
  manager.startTracking(5000);
  
  // Execute order
  const result = await executor.executeBuy({
    symbol: 'EURUSD',
    volume: 0.10,
    stopLoss: 1.0820,
    takeProfit: 1.0900,
  });
  
  console.log(`Order: ${result.success ? 'Success' : 'Failed'}`);
}
```

### Full Trading Flow

```typescript
import { AdvancedOrderExecutor } from '@forexos/engine';

async function tradingFlow(decision) {
  const advanced = new AdvancedOrderExecutor(executor, manager, {
    maxSpreadPips: 5,
    maxSlippagePips: 3,
    retryAttempts: 3,
  });
  
  // Execute with all protections
  const result = await advanced.executeWithProtection({
    symbol: decision.symbol,
    type: decision.action === 'buy' ? 'buy' : 'sell',
    volume: decision.positionSize,
    stopLoss: decision.stopLoss,
    takeProfit: decision.takeProfit,
  });
  
  if (result.success) {
    // Set trailing stop
    await advanced.setTrailingStop(result.ticket, {
      enabled: true,
      triggerPips: 20,
      stepPips: 10,
    });
    
    // Set partial close
    await advanced.setPartialClose(result.ticket, {
      enabled: true,
      triggerPips: 30,
      closePercent: 50,
    });
  }
}
```

### Continuous Position Management

```typescript
async function positionManagementLoop() {
  const advanced = new AdvancedOrderExecutor(executor, manager);
  
  // Set trailing stops on existing positions
  for (const position of manager.getPositions()) {
    await advanced.setTrailingStop(position.mt5Ticket, {
      enabled: true,
      triggerPips: 15,
      stepPips: 10,
    });
  }
  
  // Continuous update loop
  setInterval(async () => {
    await manager.refreshPositions();
    await advanced.processAll();
  }, 1000);
}
```

### Emergency Close

```typescript
async function emergencyClose() {
  const manager = new PositionManager(executor);
  
  // Close all positions immediately
  const result = await manager.closeAll();
  
  console.log(`Closed: ${result.closed}`);
  console.log(`Errors: ${result.errors}`);
}
```

### Symbol-Based Trading

```typescript
async function tradeBySymbol() {
  // Only one position per symbol
  const symbol = 'EURUSD';
  const existingPositions = manager.getPositionsBySymbol(symbol);
  
  if (existingPositions.length > 0) {
    console.log('Already have position in', symbol);
    return;
  }
  
  // No position - can trade
  const result = await executor.executeBuy({
    symbol,
    volume: 0.10,
    stopLoss: 1.0820,
    takeProfit: 1.0900,
  });
}
```

### Modify Existing Position

```typescript
async function modifyPosition(ticket: number) {
  const manager = new PositionManager(executor);
  
  // Move stop loss tighter
  await manager.setStopLoss(ticket, 1.0830);
  
  // Move take profit higher
  await manager.setTakeProfit(ticket, 1.0920);
  
  // Move to breakeven
  await manager.moveToBreakeven(ticket);
}
```

---

## Configuration

### Default Filters

```yaml
# config/trading.yaml
execution:
  # Execution Filters
  filters:
    maxSpreadPips: 5
    maxSlippagePips: 3
    retryAttempts: 3
    retryDelayMs: 1000
    requireMarketHours: false
  
  # Trailing Stop Defaults
  trailingStop:
    enabled: true
    triggerPips: 20
    stepPips: 10
    trailingType: classic
  
  # Break Even Defaults
  breakEven:
    enabled: true
    triggerPips: 15
    addBuffer: true
    bufferPips: 2
  
  # Partial Close Defaults
  partialClose:
    enabled: true
    triggerPips: 25
    closePercent: 50
```

---

## Quick Reference

### Order Execution

```typescript
// Market order
executeBuy/sell({ symbol, volume, stopLoss, takeProfit })

// Pending order
executeBuy/sell({ symbol, volume, price, stopLoss, takeProfit })
```

### Position Management

```typescript
// Close position
closePosition(ticket, volume?)

// Modify SL/TP
setStopLoss(ticket, price)
setTakeProfit(ticket, price)
moveToBreakeven(ticket)

// Close all
closeAllBySymbol(symbol)
closeAll()
```

### Advanced Features

```typescript
// Set trailing stop
setTrailingStop(ticket, { triggerPips, stepPips })

// Set break even
setBreakEven(ticket, { triggerPips, addBuffer, bufferPips })

// Set partial close
setPartialClose(ticket, { triggerPips, closePercent })

// Update all
processAll()
```

---

## Summary

| Feature | Status | Module |
|---------|--------|--------|
| Order Execution | ✅ | `OrderExecutor` |
| Position Management | ✅ | `PositionManager` |
| Modify Orders | ✅ | `modifyOrder()` |
| Close Positions | ✅ | `closePosition()` |
| Cancel Orders | ✅ | `cancelOrder()` |
| Trailing Stop | ✅ | `setTrailingStop()` |
| Break Even | ✅ | `setBreakEven()` |
| Partial Close | ✅ | `setPartialClose()` |
| Spread Filter | ✅ | `checkSpread()` |
| Slippage Protection | ✅ | `maxSlippagePips` |
| Retry Logic | ✅ | `executeWithRetry()` |
| Market Hours | ✅ | `requireMarketHours` |

---

*Last updated: 2026-06-25*
