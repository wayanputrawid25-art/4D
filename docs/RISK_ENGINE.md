# ForexOS Risk Engine

**Last Updated:** 2026-06-25

Complete guide for ForexOS Risk Engine - comprehensive risk management system.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Risk Parameters](#risk-parameters)
4. [Position Sizing](#position-sizing)
5. [Risk Validation](#risk-validation)
6. [Drawdown Protection](#drawdown-protection)
7. [Correlation Management](#correlation-management)
8. [Currency Exposure](#currency-exposure)
9. [Risk Metrics](#risk-metrics)
10. [API Reference](#api-reference)
11. [Usage Examples](#usage-examples)

---

## Overview

### What Is the Risk Engine?

The Risk Engine provides comprehensive risk management for all trading activities:

- **Position Sizing**: Calculate optimal lot size based on risk
- **Risk Validation**: Validate trades against risk parameters
- **Drawdown Protection**: Monitor and limit drawdowns
- **Correlation Management**: Prevent over-concentration
- **Currency Exposure**: Track exposure by currency
- **Real-time Metrics**: Monitor risk in real-time

### Default Risk Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| Max Risk Per Trade | 1.0% | Maximum risk per trade |
| Max Daily Risk | 3.0% | Maximum daily loss limit |
| Max Weekly Risk | 6.0% | Maximum weekly loss limit |
| Max Drawdown | 10.0% | Maximum drawdown allowed |
| Max Positions | 5 | Maximum concurrent positions |
| Max Correlation | 0.7 | Maximum correlation between positions |
| Min Risk-Reward | 2.0 | Minimum R:R ratio |
| Max Leverage | 100:1 | Maximum allowed leverage |
| Min Margin Level | 150% | Minimum margin level |
| Trailing Stop | Enabled | Trailing stop activation |

---

## Architecture

### Risk Engine Structure

```
packages/engine/src/risk/
├── types.ts    # Type definitions
├── engine.ts   # Risk engine implementation
└── index.ts   # Module exports
```

### Core Components

| Component | Description |
|-----------|-------------|
| `RiskEngine` | Main risk management class |
| `calculatePositionSize()` | Calculate lot size based on risk |
| `validateTrade()` | Validate trade against parameters |
| `assessTrade()` | Full trade risk assessment |
| `getDrawdownState()` | Monitor drawdown |
| `checkCorrelations()` | Check position correlations |

---

## Risk Parameters

### Configuration

```typescript
interface RiskParameters {
  maxRiskPerTrade: number;     // 1.0% default
  maxDailyRisk: number;        // 3.0% default
  maxWeeklyRisk: number;       // 6.0% default
  maxDrawdown: number;         // 10.0% default
  maxOpenPositions: number;    // 5 default
  maxCorrelation: number;       // 0.7 default
  minRiskReward: number;        // 2.0 default
  maxLeverage: number;         // 100 default
  minMarginLevel: number;       // 150% default
  maxVolumePerTrade: number;    // 1.0 lot default
  trailingStop: boolean;        // true default
  trailingStep: number;         // 15 pips default
}
```

### Creating Risk Engine

```typescript
import { RiskEngine } from '@forexos/engine';

const riskEngine = new RiskEngine({
  accountBalance: 10000,
  accountCurrency: 'USD',
  leverage: 100,
  parameters: {
    maxRiskPerTrade: 1.0,
    maxDailyRisk: 3.0,
    maxDrawdown: 10.0,
  },
});
```

---

## Position Sizing

### Calculate Position Size

```typescript
const positionSize = riskEngine.calculatePositionSize({
  symbol: 'EURUSD',
  entryPrice: 1.0850,
  stopLoss: 1.0820,
  direction: 'buy',
});

console.log(positionSize);
// {
//   lotSize: 0.33,
//   units: 33000,
//   riskAmount: 99.00,
//   riskPercent: 0.99,
//   pipValue: 10,
//   pipValueUSD: 3.30,
//   marginRequired: 358.05,
//   stopLossPips: 30,
//   takeProfitPips: 60
// }
```

### Position Size Calculation

```typescript
// Risk amount = Account × Risk%
const riskAmount = accountBalance * (maxRiskPerTrade / 100);

// Pips at risk = |Entry - SL| / pip decimal
const pipsAtRisk = Math.abs(entryPrice - stopLoss) / pipDecimal;

// Lot size = Risk Amount / (Pips × Pip Value)
const lotSize = riskAmount / (pipsAtRisk * pipValue);
```

### ATR-Based Stop Loss

```typescript
// Calculate stop loss using ATR
const stopLoss = riskEngine.calculateATRStopLoss(candles, 1.5);

const positionSize = riskEngine.calculatePositionSize({
  symbol: 'EURUSD',
  entryPrice: 1.0850,
  stopLoss: stopLoss,
  direction: 'buy',
});
```

### Take Profit Calculation

```typescript
// Calculate TP based on risk-reward ratio
const takeProfit = riskEngine.calculateTakeProfit(
  entryPrice,    // 1.0850
  stopLoss,      // 1.0820
  2.0           // 1:2 ratio
);
// Result: 1.0910
```

---

## Risk Validation

### Validate Trade

```typescript
const validation = riskEngine.validateTrade(assessment);

console.log(validation);
// {
//   valid: true,
//   errors: [],
//   warnings: [],
//   canTrade: true,
//   riskLevel: 'low'
// }
```

### Validation Checks

| Check | Error | Warning |
|-------|-------|---------|
| Max Positions | Reached | - |
| Daily Risk | Exceeded | Approaching |
| Weekly Risk | - | Approaching |
| Drawdown | - | High |
| Risk-Reward | Below Minimum | - |
| Margin | - | High Usage |
| Correlation | - | High |

### Risk Levels

```typescript
type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

// Low: No errors, <1 warning
// Medium: 1 warning
// High: ≥2 warnings
// Extreme: Errors present
```

---

## Drawdown Protection

### Drawdown State

```typescript
const drawdown = riskEngine.getDrawdownState();

console.log(drawdown);
// {
//   peak: 10500,
//   current: 10000,
//   drawdownPercent: 4.76,
//   isInDrawdown: true,
//   recoveryMode: false,
//   consecutiveLosers: 2,
//   maxConsecutiveLosers: 4
// }
```

### Drawdown Calculation

```
Drawdown % = (Peak - Current) / Peak × 100
```

### Drawdown Response

| Condition | Response |
|-----------|----------|
| Drawdown > 5% | Warning |
| Drawdown > 8% | Reduce risk by 50% |
| Drawdown > 10% | Block new trades |
| 3+ Consecutive Losers | Reduce risk by 25% |
| Recovery Mode | Gradual position increases |

---

## Correlation Management

### Check Correlations

```typescript
const correlations = riskEngine.checkCorrelations('EURUSD');

console.log(correlations);
// [
//   {
//     symbol1: 'EURUSD',
//     symbol2: 'GBPUSD',
//     correlation: 0.8,
//     strength: 'strong_positive'
//   }
// ]
```

### Correlation Strength

| Correlation | Strength |
|-------------|----------|
| >0.7 | Strong Positive |
| 0.4-0.7 | Moderate Positive |
| -0.4-0.4 | Weak |
| -0.4 - -0.7 | Moderate Negative |
| <-0.7 | Strong Negative |

### Correlation Calculation

```typescript
// Same base currency (EUR): 0.8
// Same quote currency (USD): 0.7
// Currency matrix overlap: Calculated percentage
```

---

## Currency Exposure

### Get Exposures

```typescript
const exposures = riskEngine.getCurrencyExposures();

console.log(exposures);
// [
//   {
//     currency: 'EUR',
//     longExposure: 33000,
//     shortExposure: 0,
//     netExposure: 33000,
//     exposurePercent: 3.3
//   },
//   {
//     currency: 'USD',
//     longExposure: 10000,
//     shortExposure: 20000,
//     netExposure: -10000,
//     exposurePercent: 3.0
//   }
// ]
```

### Exposure Tracking

| Currency | Long | Short | Net | % of Account |
|----------|------|-------|-----|--------------|
| EUR | 33000 | 0 | +33000 | 3.3% |
| USD | 10000 | 20000 | -10000 | 3.0% |

---

## Risk Metrics

### Get Risk Metrics

```typescript
const metrics = riskEngine.getRiskMetrics();

console.log(metrics);
// {
//   accountBalance: 10000,
//   accountEquity: 10200,
//   openPositions: 3,
//   pendingOrders: 1,
//   dailyPnL: 150,
//   weeklyPnL: 200,
//   unrealizedPnL: 200,
//   marginUsed: 1500,
//   marginLevel: 680,
//   maxDrawdownCurrent: 2.5,
//   maxDrawdownAllowed: 10.0
// }
```

### Metrics Breakdown

| Metric | Description |
|--------|-------------|
| Account Balance | Current balance |
| Account Equity | Balance + Unrealized P&L |
| Open Positions | Active positions |
| Pending Orders | Pending orders count |
| Daily P&L | Today's profit/loss |
| Weekly P&L | This week's profit/loss |
| Unrealized P&L | Open positions P&L |
| Margin Used | Margin in use |
| Margin Level | Equity / Margin × 100 |
| Max Drawdown | Current drawdown % |

---

## API Reference

### RiskEngine Class

```typescript
class RiskEngine {
  constructor(options: RiskEngineOptions);
  
  // Position Sizing
  calculatePositionSize(options: PositionSizeOptions): PositionSizeResult;
  calculateATRStopLoss(candles: Candle[], multiplier?: number): number;
  calculateTakeProfit(entry: number, stopLoss: number, ratio: number): number;
  
  // Validation
  validateTrade(assessment: TradeRiskAssessment): TradeValidation;
  assessTrade(options: TradeAssessmentOptions): TradeRiskAssessment;
  
  // Risk State
  getDrawdownState(): DrawdownState;
  checkCorrelations(symbol: string): CorrelationEntry[];
  getCurrencyExposures(): CurrencyExposure[];
  getRiskMetrics(): RiskMetrics;
  getRiskSummary(): RiskSummary;
  
  // Management
  updatePositions(positions: Position[]): void;
  updateOrders(orders: Order[]): void;
  recordTradeResult(profit: number): void;
  resetDailyRisk(): void;
  resetWeeklyRisk(): void;
  getParameters(): RiskParameters;
  updateParameters(params: Partial<RiskParameters>): void;
}
```

### Types

```typescript
interface PositionSizeOptions {
  symbol: string;
  entryPrice: number;
  stopLoss: number;
  direction: 'buy' | 'sell';
}

interface PositionSizeResult {
  lotSize: number;
  units: number;
  riskAmount: number;
  riskPercent: number;
  pipValue: number;
  pipValueUSD: number;
  marginRequired: number;
  stopLossPips: number;
  takeProfitPips: number;
}

interface TradeValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  canTrade: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
}
```

---

## Usage Examples

### Basic Trade Assessment

```typescript
import { RiskEngine } from '@forexos/engine';

const riskEngine = new RiskEngine({
  accountBalance: 10000,
  leverage: 100,
});

// Assess a potential trade
const assessment = riskEngine.assessTrade({
  symbol: 'EURUSD',
  direction: 'buy',
  entryPrice: 1.0850,
  stopLoss: 1.0820,
  takeProfit: 1.0910,
});

console.log(`Action: ${assessment.validation.canTrade ? 'CAN TRADE' : 'NO TRADE'}`);
console.log(`Lot Size: ${assessment.lotSize.toFixed(2)}`);
console.log(`Risk: $${assessment.riskAmount.toFixed(2)}`);
console.log(`R:R: ${assessment.riskReward.toFixed(2)}`);

if (assessment.validation.errors.length > 0) {
  console.log('Errors:', assessment.validation.errors);
}

if (assessment.validation.warnings.length > 0) {
  console.log('Warnings:', assessment.validation.warnings);
}
```

### Full Risk Summary

```typescript
import { RiskEngine } from '@forexos/engine';

const riskEngine = new RiskEngine({
  accountBalance: 10000,
});

// Update positions
riskEngine.updatePositions([
  {
    id: '1',
    symbol: 'EURUSD',
    type: 'buy',
    volume: 0.1,
    openPrice: 1.0850,
    currentPrice: 1.0860,
    profit: 10,
    profitPercent: 0.1,
    swap: 0,
    commission: 0,
    openTime: Date.now(),
    ticket: 12345,
  },
]);

// Get full summary
const summary = riskEngine.getRiskSummary();

console.log('=== RISK SUMMARY ===');
console.log(`Can Trade: ${summary.canOpenTrade}`);
console.log(`Suggested Risk: ${summary.suggestedRiskPercent.toFixed(2)}%`);
console.log(`Open Positions: ${summary.metrics.openPositions}`);
console.log(`Daily P&L: $${summary.metrics.dailyPnL.toFixed(2)}`);
console.log(`Drawdown: ${summary.drawdownState.drawdownPercent.toFixed(2)}%`);

if (summary.warnings.length > 0) {
  console.log('Warnings:');
  summary.warnings.forEach(w => console.log(`  - ${w}`));
}
```

### Dynamic Risk Adjustment

```typescript
function adjustRiskBasedOnConditions(riskEngine: RiskEngine): number {
  const summary = riskEngine.getRiskSummary();
  let riskPercent = 1.0; // Base risk
  
  // Reduce in drawdown
  if (summary.drawdownState.isInDrawdown) {
    riskPercent *= 0.5;
  }
  
  // Reduce after losing streak
  if (summary.drawdownState.consecutiveLosers >= 3) {
    riskPercent *= 0.75;
  }
  
  // Reduce with many positions
  if (summary.metrics.openPositions >= 3) {
    riskPercent *= 0.8;
  }
  
  // Reduce near daily limit
  if (summary.metrics.dailyPnL < -summary.metrics.accountBalance * 0.02) {
    riskPercent *= 0.5;
  }
  
  return riskPercent;
}
```

### Pre-Trade Checklist

```typescript
function preTradeCheck(
  riskEngine: RiskEngine,
  symbol: string,
  direction: 'buy' | 'sell',
  entryPrice: number,
  stopLoss: number
): boolean {
  const assessment = riskEngine.assessTrade({
    symbol,
    direction,
    entryPrice,
    stopLoss,
  });
  
  // Check 1: Validation passed
  if (!assessment.validation.valid) {
    console.log('Trade invalid:', assessment.validation.errors);
    return false;
  }
  
  // Check 2: Risk level acceptable
  if (assessment.validation.riskLevel === 'extreme') {
    console.log('Risk level too high');
    return false;
  }
  
  // Check 3: Not in max drawdown
  const drawdown = riskEngine.getDrawdownState();
  if (drawdown.drawdownPercent >= 10) {
    console.log('Max drawdown reached');
    return false;
  }
  
  // Check 4: No high correlations
  const correlations = riskEngine.checkCorrelations(symbol);
  if (correlations.some(c => c.correlation > 0.8)) {
    console.log('High correlation with existing position');
    return false;
  }
  
  return true;
}
```

### Position Management

```typescript
function managePositions(riskEngine: RiskEngine): void {
  const metrics = riskEngine.getRiskMetrics();
  
  // Check margin level
  if (metrics.marginLevel < 200) {
    console.log('Warning: Low margin level');
  }
  
  // Check daily loss
  if (metrics.dailyPnL < -metrics.accountBalance * 0.03) {
    console.log('Daily loss limit reached - closing positions');
    // Would trigger position closing
  }
  
  // Check for trailing stop opportunity
  if (metrics.unrealizedPnL > 50) {
    console.log('Consider activating trailing stop');
  }
}
```

---

## Configuration

### Trading Config

```yaml
# config/trading.yaml
risk:
  # Position Sizing
  maxRiskPerTrade: 1.0        # 1% per trade
  maxDailyRisk: 3.0          # 3% daily limit
  maxWeeklyRisk: 6.0         # 6% weekly limit
  maxDrawdown: 10.0          # 10% max drawdown
  
  # Position Limits
  maxOpenPositions: 5        # 5 concurrent trades
  maxCorrelation: 0.7        # 70% max correlation
  maxVolumePerTrade: 1.0     # 1.0 lot max
  
  # Entry Rules
  minRiskReward: 2.0         # 1:2 minimum R:R
  minConfidence: 60           # Signal confidence
  
  # Account
  maxLeverage: 100            # 100:1 max
  minMarginLevel: 150         # 150% minimum
  
  # Trailing Stop
  trailingStop: true
  trailingStep: 15           # 15 pips
```

---

## Quick Reference

### Risk Calculation Formula

```typescript
// Lot Size
lotSize = (account × risk%) / (pips × pipValue)

// Risk Amount
riskAmount = pips × pipValue × lotSize

// Margin Required
margin = (lotSize × contractSize × price) / leverage

// Drawdown
drawdown% = (peak - current) / peak × 100
```

### Decision Matrix

| Condition | Action |
|-----------|--------|
| Validation Errors | Block Trade |
| Validation Warnings < 2 | Allow Trade |
| Drawdown > 10% | Block Trade |
| Correlation > 0.7 | Warning |
| Margin Level < 150% | Warning |
| Daily Risk > 3% | Block Trade |

---

## Summary

| Feature | Status | Function |
|---------|--------|----------|
| Position Sizing | ✅ | `calculatePositionSize()` |
| ATR Stop Loss | ✅ | `calculateATRStopLoss()` |
| Risk Validation | ✅ | `validateTrade()` |
| Trade Assessment | ✅ | `assessTrade()` |
| Drawdown Protection | ✅ | `getDrawdownState()` |
| Correlation Check | ✅ | `checkCorrelations()` |
| Currency Exposure | ✅ | `getCurrencyExposures()` |
| Risk Metrics | ✅ | `getRiskMetrics()` |
| Risk Summary | ✅ | `getRiskSummary()` |
| Position Tracking | ✅ | `updatePositions()` |
| Result Recording | ✅ | `recordTradeResult()` |

---

*Last updated: 2026-06-25*
