# ForexOS Decision Engine

**Last Updated:** 2026-06-25

Complete guide for ForexOS Decision Engine - the main orchestrator that generates final BUY/SELL/HOLD decisions.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Decision Flow](#decision-flow)
4. [Signal Aggregation](#signal-aggregation)
5. [Risk Integration](#risk-integration)
6. [Decision Output](#decision-output)
7. [Execution Plan](#execution-plan)
8. [API Reference](#api-reference)
9. [Usage Examples](#usage-examples)

---

## Overview

### What Is the Decision Engine?

The Decision Engine is the **main orchestrator** that combines all analysis modules to generate final trading decisions:

- **Combines** all signal sources (indicators, patterns, trend)
- **Validates** against risk parameters
- **Calculates** entry, stop loss, take profit
- **Generates** final BUY/SELL/HOLD decision

### Decision Components

```
Decision Engine
├── Signal Aggregator     → Combines all indicators
├── Risk Calculator       → Validates risk parameters
├── Trend Analysis        → Direction confirmation
├── Pattern Detection     → Chart pattern signals
└── Risk Engine          → Position sizing
```

---

## Architecture

### Module Structure

```
packages/engine/src/decision/
├── types.ts       # Type definitions
├── engine.ts      # Main decision orchestrator
├── aggregator.ts  # Signal aggregation
├── risk.ts       # Risk calculations
└── index.ts      # Module exports
```

### Core Classes

| Class | Purpose |
|-------|---------|
| `DecisionEngine` | Main orchestrator, generates decisions |
| `SignalAggregator` | Combines all indicator signals |
| `RiskCalculator` | Validates trades, calculates position size |

---

## Decision Flow

### Decision Pipeline

```
1. Receive Candles + Context
         ↓
2. Signal Aggregator analyzes all indicators
   - Trend (EMA alignment)
   - Momentum (RSI, MACD, Stochastic, ADX)
   - Volatility (Bollinger Bands, ATR)
         ↓
3. Calculate weighted score (-100 to +100)
         ↓
4. Determine direction (bullish/bearish/neutral)
         ↓
5. Calculate entry, SL, TP (ATR-based)
         ↓
6. Risk validation
   - Position sizing
   - Margin check
   - Daily risk check
         ↓
7. Generate TradingDecision
```

---

## Signal Aggregation

### Indicator Weights

```typescript
const INDICATOR_WEIGHTS = {
  trend: 0.25,       // 25%
  momentum: 0.35,    // 35%
  volatility: 0.20,  // 20%
  volume: 0.20,      // 20%
};
```

### Signal Sources

| Category | Indicators | Weight |
|----------|-----------|--------|
| **Trend** | EMA20, EMA Crossover, EMA Alignment | 25% |
| **Momentum** | RSI, MACD, Stochastic, ADX | 35% |
| **Volatility** | Bollinger Bands, ATR | 20% |

### Signal Scoring

```typescript
// Each signal contributes to final score
// Score range: -100 (strong bearish) to +100 (strong bullish)

// Example signals:
// RSI < 30 → +60 to +100
// RSI > 70 → -60 to -100
// MACD bullish crossover → +40
// EMA alignment → +30
```

---

## Risk Integration

### Risk Parameters

```typescript
interface DecisionEngineConfig {
  minConfidenceScore: number;  // Minimum score to trade
  defaultRiskPerTrade: number; // Default risk %
  minRiskReward: number;     // Minimum R:R ratio
  confidenceThresholds: {
    high: 60;    // Score >= 60
    medium: 30;  // Score >= 30
    low: 20;    // Score >= 20
  };
}
```

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
  minConfidenceScore: 20,
  defaultRiskPerTrade: 2,
  minRiskReward: 1.5,
  confidenceThresholds: {
    high: 60,
    medium: 30,
    low: 20,
  },
};
```

---

## Decision Output

### Trading Decision Structure

```typescript
interface TradingDecision {
  id: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;  // 0-100
  reason: 'indicator' | 'pattern' | 'confluence' | 'risk' | 'multi';
  reasons: string[];        // Human-readable reasons
  symbol: string;
  timeframe: Timeframe;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  rewardAmount: number;
  riskRewardRatio: number;
  positionSize?: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

### Decision Types

| Action | Conditions |
|--------|------------|
| **BUY** | Direction = bullish AND score > minConfidence |
| **SELL** | Direction = bearish AND score < -minConfidence |
| **HOLD** | Direction = neutral OR score insufficient |

---

## Execution Plan

### Execution Plan Structure

```typescript
interface ExecutionPlan {
  decision: TradingDecision;
  positionSize: {
    lotSize: number;
    units: number;
    riskAmount: number;
    pipValue: number;
    marginRequired: number;
  };
  orderType: OrderType;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}
```

### Order Types

| Order Type | Use Case |
|------------|----------|
| `buy` | Long positions |
| `sell` | Short positions |
| `market` | Hold decision |

---

## API Reference

### DecisionEngine

```typescript
class DecisionEngine {
  constructor(config?: Partial<DecisionEngineConfig>);
  
  // Generate trading decision
  decide(context: DecisionContext): TradingDecision | null;
  
  // Generate execution plan with position sizing
  createExecutionPlan(context: DecisionContext): ExecutionPlan | null;
  
  // Quick analysis without full decision
  quickAnalyze(candles: Candle[]): QuickAnalysis;
  
  // Configuration
  updateConfig(config: Partial<DecisionEngineConfig>): void;
  getConfig(): DecisionEngineConfig;
}
```

### DecisionContext

```typescript
interface DecisionContext {
  candles: Candle[];
  symbol: string;
  timeframe: Timeframe;
  accountBalance: number;
  riskPerTrade: number;
  maxPositions: number;
  currentPositions: number;
}
```

### SignalAggregator

```typescript
class SignalAggregator {
  analyze(context: DecisionContext): AggregatedSignal;
}

interface AggregatedSignal {
  direction: 'bullish' | 'bearish' | 'neutral';
  score: number;        // -100 to 100
  signals: SignalScore[];
  confluenceCount: number;
  dominantSignals: string[];
  warnings: string[];
}
```

---

## Usage Examples

### Basic Decision

```typescript
import { DecisionEngine } from '@forexos/engine';

const decisionEngine = new DecisionEngine();

const context = {
  candles: await mt5Service.getCandles('EURUSD', 'H1', undefined, undefined, 100),
  symbol: 'EURUSD',
  timeframe: 'H1',
  accountBalance: 10000,
  riskPerTrade: 2,
  maxPositions: 5,
  currentPositions: 2,
};

const decision = decisionEngine.decide(context);

if (decision) {
  console.log(`Action: ${decision.action.toUpperCase()}`);
  console.log(`Confidence: ${decision.confidence}`);
  console.log(`Entry: ${decision.entryPrice}`);
  console.log(`SL: ${decision.stopLoss}`);
  console.log(`TP: ${decision.takeProfit}`);
  console.log(`R:R: 1:${decision.riskRewardRatio}`);
}
```

### Execution Plan

```typescript
const plan = decisionEngine.createExecutionPlan(context);

if (plan && plan.validation.valid) {
  console.log('=== EXECUTION PLAN ===');
  console.log(`Action: ${plan.decision.action}`);
  console.log(`Lot Size: ${plan.positionSize.lotSize.toFixed(2)}`);
  console.log(`Risk: $${plan.positionSize.riskAmount.toFixed(2)}`);
  console.log(`Margin: $${plan.positionSize.marginRequired.toFixed(2)}`);
  
  if (plan.validation.warnings.length > 0) {
    console.log('Warnings:', plan.validation.warnings);
  }
}
```

### Quick Analysis

```typescript
const analysis = decisionEngine.quickAnalyze(candles);

console.log(`Direction: ${analysis.direction}`);
console.log(`Score: ${analysis.score}`);
console.log(`Strength: ${analysis.strength}`);
```

### Full Trading Flow

```typescript
import { DecisionEngine, RiskEngine } from '@forexos/engine';

async function tradingFlow() {
  // Initialize engines
  const decisionEngine = new DecisionEngine();
  const riskEngine = new RiskEngine({ accountBalance: 10000 });
  
  // Get market data
  const candles = await mt5Service.getCandles('EURUSD', 'H1', undefined, undefined, 100);
  
  // Generate decision
  const decision = decisionEngine.decide({
    candles,
    symbol: 'EURUSD',
    timeframe: 'H1',
    accountBalance: 10000,
    riskPerTrade: 1,
    maxPositions: 5,
    currentPositions: 0,
  });
  
  if (!decision) {
    console.log('No decision generated');
    return;
  }
  
  // Check if should trade
  if (decision.action === 'hold') {
    console.log('Hold - reasons:', decision.reasons);
    return;
  }
  
  // Validate with risk engine
  const assessment = riskEngine.assessTrade({
    symbol: decision.symbol,
    direction: decision.action,
    entryPrice: decision.entryPrice!,
    stopLoss: decision.stopLoss!,
    takeProfit: decision.takeProfit!,
  });
  
  if (!assessment.validation.valid) {
    console.log('Trade blocked:', assessment.validation.errors);
    return;
  }
  
  // Execute
  console.log(`Executing ${decision.action.toUpperCase()}`);
  console.log(`Entry: ${decision.entryPrice}`);
  console.log(`SL: ${decision.stopLoss}`);
  console.log(`TP: ${decision.takeProfit}`);
  console.log(`Lots: ${assessment.lotSize}`);
}
```

### Pre-Decision Checklist

```typescript
function preDecisionCheck(context: DecisionContext): boolean {
  // Check 1: Enough candles
  if (context.candles.length < 50) {
    console.log('Insufficient candles');
    return false;
  }
  
  // Check 2: Market hours
  const hour = new Date().getUTCHours();
  if (hour < 8 || hour > 17) {
    console.log('Outside trading hours');
    // Can still trade but with caution
  }
  
  // Check 3: News event (would check economic calendar)
  // if (isHighImpactNews()) return false;
  
  return true;
}

// Usage
if (!preDecisionCheck(context)) {
  return;
}

const decision = decisionEngine.decide(context);
```

### Multi-Symbol Analysis

```typescript
async function analyzeMultiplePairs(pairs: string[]): Promise<TradingDecision[]> {
  const decisionEngine = new DecisionEngine();
  const decisions: TradingDecision[] = [];
  
  for (const pair of pairs) {
    const candles = await mt5Service.getCandles(pair, 'H1', undefined, undefined, 100);
    
    const decision = decisionEngine.decide({
      candles,
      symbol: pair,
      timeframe: 'H1',
      accountBalance: 10000,
      riskPerTrade: 1,
      maxPositions: 5,
      currentPositions: 0,
    });
    
    if (decision && decision.action !== 'hold') {
      decisions.push(decision);
    }
  }
  
  // Sort by confidence
  decisions.sort((a, b) => b.confidenceScore - a.confidenceScore);
  
  return decisions;
}

// Usage
const topDecisions = await analyzeMultiplePairs([
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'
]);

console.log('Best opportunities:');
topDecisions.slice(0, 3).forEach(d => {
  console.log(`  ${d.symbol}: ${d.action} (${d.confidenceScore}%)`);
});
```

### Signal Debugging

```typescript
function debugSignals(context: DecisionContext): void {
  const aggregator = new SignalAggregator();
  const signal = aggregator.analyze(context);
  
  console.log('=== SIGNAL ANALYSIS ===');
  console.log(`Direction: ${signal.direction}`);
  console.log(`Score: ${signal.score}`);
  console.log(`Confluence: ${signal.confluenceCount}`);
  console.log(`Dominant: ${signal.dominantSignals.join(', ')}`);
  
  console.log('\nAll Signals:');
  signal.signals.forEach(s => {
    console.log(`  ${s.indicator}: ${s.direction} (${s.score.toFixed(1)})`);
  });
  
  if (signal.warnings.length > 0) {
    console.log('\nWarnings:');
    signal.warnings.forEach(w => console.log(`  - ${w}`));
  }
}
```

---

## Configuration

### Trading Config

```yaml
# config/trading.yaml
decision:
  # Thresholds
  minConfidenceScore: 20
  defaultRiskPerTrade: 2.0
  minRiskReward: 1.5
  
  # Confidence Levels
  confidenceThresholds:
    high: 60
    medium: 30
    low: 20
  
  # Signal Weights
  weights:
    trend: 0.25
    momentum: 0.35
    volatility: 0.20
    volume: 0.20
  
  # Indicators
  indicators:
    ema:
      periods: [20, 50]
    rsi:
      period: 14
      oversold: 30
      overbought: 70
    macd:
      fastPeriod: 12
      slowPeriod: 26
      signalPeriod: 9
    stochastic:
      kPeriod: 14
      dPeriod: 3
      smoothK: 3
    adx:
      period: 14
      strongTrend: 25
```

---

## Quick Reference

### Decision Matrix

| Signal Score | Direction | Action |
|-------------|-----------|--------|
| >+20 | Bullish | BUY |
| -20 to +20 | Neutral | HOLD |
| <-20 | Bearish | SELL |

### Confidence Thresholds

| Level | Score | Meaning |
|-------|-------|---------|
| HIGH | >= 60 | Strong signal |
| MEDIUM | >= 30 | Moderate signal |
| LOW | >= 20 | Weak signal |
| NONE | < 20 | No trade |

### ATR Multipliers

| Parameter | Value | Description |
|-----------|-------|-------------|
| Stop Loss | 1.5x ATR | 1.5× Average True Range |
| Take Profit | 3.0x ATR | 3.0× ATR (1:2 R:R) |

---

## Integration Summary

### All Engines Working Together

```
┌─────────────────────────────────────────────────────────┐
│                    DECISION ENGINE                        │
│                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   SIGNAL    │    │    RISK     │    │    TREND    │ │
│  │  AGGREGATOR │    │  CALCULATOR │    │   ENGINE    │ │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘ │
│         │                   │                   │         │
│         └───────────────────┼─────────────────┘         │
│                             ↓                              │
│                   ┌─────────────────┐                     │
│                   │  FINAL DECISION  │                     │
│                   │  BUY/SELL/HOLD  │                     │
│                   └────────┬────────┘                     │
└────────────────────────────┼─────────────────────────────┘
                             ↓
              ┌──────────────────────────────┐
              │      TRADING EXECUTION        │
              │                              │
              │  - Entry Price              │
              │  - Stop Loss               │
              │  - Take Profit             │
              │  - Position Size           │
              │  - Risk Amount             │
              └──────────────────────────────┘
```

---

## Summary

| Component | Status | Location |
|-----------|--------|----------|
| Decision Engine | ✅ | `src/decision/engine.ts` |
| Signal Aggregator | ✅ | `src/decision/aggregator.ts` |
| Risk Calculator | ✅ | `src/decision/risk.ts` |
| Trend Engine | ✅ | `src/trend/engine.ts` |
| Signal Engine | ✅ | `src/signals/engine.ts` |
| Risk Engine | ✅ | `src/risk/engine.ts` |

### Key Functions

| Function | Purpose |
|----------|---------|
| `decide()` | Generate trading decision |
| `createExecutionPlan()` | Full execution with sizing |
| `quickAnalyze()` | Fast direction check |
| `analyze()` | Aggregate signals |

---

*Last updated: 2026-06-25*
