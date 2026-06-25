# ForexOS Trend Engine

**Last Updated:** 2026-06-25

Complete guide for ForexOS Trend Engine - multi-timeframe trend analysis and signal generation.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Trend Analysis](#trend-analysis)
4. [Trend Strength](#trend-strength)
5. [Trend Phases](#trend-phases)
6. [Multi-Timeframe Analysis](#multi-timeframe-analysis)
7. [Trend Signals](#trend-signals)
8. [Price Channels](#price-channels)
9. [Confluence Scoring](#confluence-scoring)
10. [API Reference](#api-reference)
11. [Usage Examples](#usage-examples)

---

## Overview

### What Is Trend Analysis?

Trend analysis is the foundation of technical trading. The Trend Engine provides:

- **Direction Detection**: Identify uptrends, downtrends, and ranging markets
- **Strength Measurement**: Quantify trend strength using ADX and momentum
- **Phase Recognition**: Detect trend lifecycle stages (early, mature, weakening)
- **Multi-Timeframe Analysis**: Align trends across timeframes
- **Signal Generation**: Detect crossovers, breakouts, and reversals

### Key Features

| Feature | Description |
|---------|-------------|
| Trend Direction | Bullish, Bearish, Neutral, Ranging |
| Trend Strength | Strong, Moderate, Weak (0-100 score) |
| Trend Phase | Early, Mature, Weakening, Reversal |
| Multi-Timeframe | H1, H4, D1 alignment |
| Signals | Crossovers, Breakouts, Reversals |
| Price Channels | Support/Resistance boundaries |

---

## Architecture

### Trend Engine Structure

```
packages/engine/src/trend/
├── types.ts    # Type definitions
└── engine.ts   # Trend analysis implementation
```

### Core Components

| Component | Purpose |
|-----------|---------|
| `analyzeTrend()` | Single timeframe trend analysis |
| `analyzeMultiTimeframeTrend()` | Multi-TF trend alignment |
| `detectTrendSignals()` | Crossover and breakout detection |
| `calculatePriceChannel()` | Channel boundaries |
| `generateTrendSummary()` | Comprehensive analysis |

---

## Trend Analysis

### Trend Direction

```typescript
import { analyzeTrend } from '@forexos/engine';

const trend = analyzeTrend(candles);

// Trend directions
type TrendDirection = 'bullish' | 'bearish' | 'neutral' | 'ranging';

console.log(`Direction: ${trend.direction}`);
console.log(`Strength: ${trend.strength}`);
```

### How Direction Is Determined

Direction is calculated using multiple indicators:

| Signal | Bullish | Bearish |
|---------|----------|----------|
| Price > EMA20 | +1 | -1 |
| Price > EMA50 | +1 | -1 |
| Price > EMA200 | +1 | -1 |
| EMA20 > EMA50 | +1 | -1 |
| EMA50 > EMA200 | +1 | -1 |
| Positive Slope | +1 | -1 |

**Direction Rules:**
- **Bullish**: ≥4 bullish signals
- **Bearish**: ≥4 bearish signals
- **Ranging**: ≤3 total signals
- **Neutral**: Mixed signals

### Analysis Output

```typescript
interface TrendAnalysis {
  direction: TrendDirection;
  strength: TrendStrength;
  strengthScore: number;     // 0-100
  phase: TrendPhase;
  adx: number;               // 0-100
  slope: number;               // Price change per bar
  slopePercent: number;       // Percentage
  currentPrice: number;
  startPrice: number;
  changePercent: number;
  volatility: number;         // As percentage
  momentum: number;            // -100 to 100
  timeframe: Timeframe;
  symbol: string;
  startTime: number;
  endTime: number;
  duration: number;            // Bars
}
```

---

## Trend Strength

### Strength Classification

```typescript
// Strength thresholds
if (trend.strengthScore >= 70) {
  console.log('Strong trend');
} else if (trend.strengthScore >= 40) {
  console.log('Moderate trend');
} else {
  console.log('Weak trend');
}
```

### Strength Components

| Component | Weight | Description |
|-----------|--------|-------------|
| ADX | 60% | Directional movement strength |
| Direction Consistency | 40% | Alignment of indicators |

### ADX Interpretation

| ADX Value | Interpretation |
|-----------|----------------|
| 0-20 | Weak/Non-existent trend |
| 20-40 | Emerging trend |
| 40-60 | Strong trend |
| 60-80 | Very strong trend |
| 80-100 | Extreme trend |

### Momentum

Momentum measures rate of price change (-100 to +100):

```typescript
// Momentum interpretation
if (trend.momentum > 30) {
  console.log('Strong bullish momentum');
} else if (trend.momentum > 0) {
  console.log('Mild bullish momentum');
} else if (trend.momentum > -30) {
  console.log('Mild bearish momentum');
} else {
  console.log('Strong bearish momentum');
}
```

---

## Trend Phases

### Lifecycle Stages

```typescript
type TrendPhase = 'early' | 'mature' | 'weakening' | 'reversal';
```

### Phase Characteristics

| Phase | Description | Indicators |
|-------|-------------|------------|
| **Early** | Trend just beginning, accelerating | Slope increasing |
| **Mature** | Established trend, stable | Consistent slope |
| **Weakening** | Trend losing momentum | Slope decreasing |
| **Reversal** | Trend changing direction | Momentum opposite to direction |

### Phase Detection

```typescript
// Phase detection based on slope and momentum
if (trend.phase === 'early') {
  // Trend is accelerating - good entry point
}

if (trend.phase === 'mature') {
  // Trend established - confirm with other signals
}

if (trend.phase === 'weakening') {
  // Consider taking profits or tightening stops
}

if (trend.phase === 'reversal') {
  // Prepare for potential reversal setup
}
```

---

## Multi-Timeframe Analysis

### Alignment Concept

```
D1 (Daily)     ████████████  (Major trend)
H4 (4-Hour)    ██████████    (Intermediate)
H1 (1-Hour)    ████████      (Short-term)
```

### Benefits

| Benefit | Description |
|---------|-------------|
| Confirms Direction | Higher TF validates trend |
| Better Entries | Lower TF provides entry timing |
| Filters Noise | Reduces false signals |
| Risk Management | Aligns stop placement |

### Alignment Types

```typescript
type Alignment = 'aligned' | 'conflicting' | 'neutral';
```

### Alignment Rules

| Alignment | Condition | Trading Action |
|-----------|-----------|----------------|
| **Aligned Bullish** | All TFs bullish | Strong buy signals |
| **Aligned Bearish** | All TFs bearish | Strong sell signals |
| **Conflicting** | Mixed directions | Wait for clarity |
| **Neutral** | All mixed/no trend | No trades |

### Multi-Timeframe Example

```typescript
import { analyzeMultiTimeframeTrend } from '@forexos/engine';

const mtfTrend = analyzeMultiTimeframeTrend(candles, {
  multiTimeframe: true
});

// Check alignment
console.log(`Alignment: ${mtfTrend.alignment}`);
console.log(`Score: ${mtfTrend.alignmentScore}%`);

// Access individual timeframes
console.log(`Primary: ${mtfTrend.primary.direction}`);
console.log(`Higher TF: ${mtfTrend.higher?.direction}`);
console.log(`Lower TF: ${mtfTrend.lower?.direction}`);

// Read signals
for (const signal of mtfTrend.signals) {
  console.log(`- ${signal}`);
}
```

---

## Trend Signals

### Signal Types

```typescript
type TrendSignalType = 'crossover' | 'breakout' | 'reversal' | 'continuation' | 'divergence';
```

### EMA Crossover Signals

```typescript
import { detectTrendSignals } from '@forexos/engine';

const signals = detectTrendSignals(candles);

// Golden Cross: EMA20 crosses above EMA50
if (signals.some(s => s.type === 'crossover' && s.direction === 'bullish')) {
  console.log('Bullish crossover detected');
}

// Death Cross: EMA20 crosses below EMA50
if (signals.some(s => s.type === 'crossover' && s.direction === 'bearish')) {
  console.log('Bearish crossover detected');
}
```

### Breakout Signals

```typescript
// Price breakout above recent high
if (signals.some(s => s.type === 'breakout' && s.direction === 'bullish')) {
  // Strong bullish breakout
}

// Price breakdown below recent low
if (signals.some(s => s.type === 'breakout' && s.direction === 'bearish')) {
  // Strong bearish breakdown
}
```

### Signal Structure

```typescript
interface TrendSignal {
  type: 'crossover' | 'breakout' | 'reversal' | 'continuation' | 'divergence';
  direction: TrendDirection;
  strength: number;
  description: string;
  price?: number;
  timestamp: number;
}
```

---

## Price Channels

### Channel Detection

```typescript
import { calculatePriceChannel } from '@forexos/engine';

const channel = calculatePriceChannel(candles);

if (channel) {
  console.log(`Upper: ${channel.upper}`);
  console.log(`Lower: ${channel.lower}`);
  console.log(`Middle: ${channel.middle}`);
  console.log(`Width: ${channel.widthPercent}%`);
  console.log(`Contained: ${channel.contained}`);
}
```

### Channel Properties

| Property | Description |
|----------|-------------|
| `upper` | Resistance trend line |
| `lower` | Support trend line |
| `middle` | Average of upper and lower |
| `width` | Distance between lines |
| `widthPercent` | Width as % of price |
| `contained` | Price within boundaries |

### Channel Trading

```typescript
// Price near upper resistance
if (channel && !channel.contained && currentPrice > channel.upper) {
  // Consider short or take profit
}

// Price near lower support
if (channel && !channel.contained && currentPrice < channel.lower) {
  // Consider long or stop out
}

// Price in middle
if (channel && channel.contained) {
  // Wait for direction or trade range
}
```

---

## Confluence Scoring

### Confluence Concept

Confluence combines multiple indicators to validate signals:

```typescript
interface TrendConfluence {
  indicator: string;
  direction: TrendDirection;
  score: number;
  weight: number;
}
```

### Default Confluences

| Indicator | Weight | Score Range |
|-----------|--------|-------------|
| EMA Cross | 30% | 40-80 |
| ADX Strength | 20% | 0-100 |
| Momentum | 25% | -100 to 100 |
| Volume | 25% | 0-100 |

### Calculating Total Score

```typescript
function calculateConfluenceScore(confluences: TrendConfluence[]): number {
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const c of confluences) {
    totalWeightedScore += c.score * c.weight;
    totalWeight += c.weight;
  }
  
  return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}
```

---

## API Reference

### Core Functions

```typescript
// Analyze single timeframe trend
analyzeTrend(
  candles: Candle[],
  options?: TrendOptions
): TrendAnalysis

// Multi-timeframe trend analysis
analyzeMultiTimeframeTrend(
  candles: Candle[],
  options?: TrendOptions
): MultiTimeframeTrend

// Detect trend signals
detectTrendSignals(
  candles: Candle[],
  options?: TrendOptions
): TrendSignal[]

// Calculate price channel
calculatePriceChannel(candles: Candle[]): PriceChannel | null

// Generate comprehensive summary
generateTrendSummary(
  candles: Candle[],
  options?: TrendOptions
): TrendSummary
```

### Types

```typescript
// Trend Direction
type TrendDirection = 'bullish' | 'bearish' | 'neutral' | 'ranging';

// Trend Phase
type TrendPhase = 'early' | 'mature' | 'weakening' | 'reversal';

// Trend Strength
type TrendStrength = 'strong' | 'moderate' | 'weak';

// Trend Options
interface TrendOptions {
  minADX?: number;
  lookbackPeriod?: number;
  confirmWithVolume?: boolean;
  multiTimeframe?: boolean;
}
```

---

## Usage Examples

### Basic Trend Analysis

```typescript
import { analyzeTrend } from '@forexos/engine';

// Get candles
const candles = await mt5Service.getCandles('EURUSD', 'H1', undefined, undefined, 200);

// Analyze trend
const trend = analyzeTrend(candles, {
  lookbackPeriod: 50,
  minADX: 25,
});

console.log(`EURUSD H1 Trend:`);
console.log(`  Direction: ${trend.direction}`);
console.log(`  Strength: ${trend.strength} (${trend.strengthScore}%)`);
console.log(`  Phase: ${trend.phase}`);
console.log(`  ADX: ${trend.adx.toFixed(1)}`);
console.log(`  Momentum: ${trend.momentum.toFixed(1)}`);
console.log(`  Change: ${trend.changePercent.toFixed(2)}%`);
```

### Trading Decision

```typescript
import { analyzeTrend, detectTrendSignals } from '@forexos/engine';

function shouldTrade(candles: Candle[]): boolean {
  const trend = analyzeTrend(candles);
  const signals = detectTrendSignals(candles);
  
  // Only trade in strong trends
  if (trend.strengthScore < 40) return false;
  
  // Require bullish alignment
  if (trend.direction !== 'bullish') return false;
  
  // Check for recent crossover signal
  const hasSignal = signals.some(s => 
    s.type === 'crossover' && 
    s.direction === 'bullish' &&
    Date.now() - s.timestamp < 3600000 // Within 1 hour
  );
  
  return hasSignal;
}
```

### Multi-Timeframe Entry

```typescript
import { analyzeMultiTimeframeTrend, analyzeTrend } from '@forexos/engine';

async function findEntry(candles: Candle[]) {
  const mtf = analyzeMultiTimeframeTrend(candles);
  
  // Higher TF must be bullish
  if (mtf.higher && mtf.higher.direction !== 'bullish') {
    return null;
  }
  
  // Primary TF should be showing strength
  if (mtf.primary.strengthScore < 50) {
    return null;
  }
  
  // Lower TF should have recent signal
  if (mtf.lower) {
    const lowerSignals = detectTrendSignals(
      aggregateToCandles(candles, 'M15'),
      { lookbackPeriod: 20 }
    );
    
    const recentBullish = lowerSignals.some(s => 
      s.type === 'crossover' && s.direction === 'bullish'
    );
    
    if (!recentBullish) return null;
  }
  
  return {
    direction: mtf.primary.direction,
    confidence: mtf.alignmentScore,
    entry: mtf.primary.currentPrice,
  };
}
```

### Trend Summary Report

```typescript
import { generateTrendSummary } from '@forexos/engine';

function printTrendReport(candles: Candle[]) {
  const summary = generateTrendSummary(candles);
  
  console.log('=== TREND REPORT ===');
  console.log(`Time: ${new Date(summary.timestamp).toISOString()}`);
  console.log('');
  
  console.log('Primary Trend:');
  console.log(`  Symbol: ${summary.primary.symbol}`);
  console.log(`  Timeframe: ${summary.primary.timeframe}`);
  console.log(`  Direction: ${summary.primary.direction}`);
  console.log(`  Strength: ${summary.primary.strength} (${summary.primary.strengthScore}%)`);
  console.log(`  Phase: ${summary.primary.phase}`);
  console.log('');
  
  if (summary.multiTimeframe) {
    console.log('Multi-Timeframe:');
    console.log(`  Alignment: ${summary.multiTimeframe.alignment}`);
    console.log(`  Score: ${summary.multiTimeframe.alignmentScore}%`);
    for (const signal of summary.multiTimeframe.signals) {
      console.log(`  - ${signal}`);
    }
    console.log('');
  }
  
  if (summary.signals.length > 0) {
    console.log('Recent Signals:');
    for (const signal of summary.signals.slice(0, 5)) {
      console.log(`  [${signal.type}] ${signal.direction}: ${signal.description}`);
    }
    console.log('');
  }
  
  console.log('Confluences:');
  for (const c of summary.confluences) {
    console.log(`  ${c.indicator}: ${c.direction} (${c.score}%)`);
  }
}
```

---

## Configuration

### Trading Config

```yaml
# config/trading.yaml
decision:
  minConfirmingIndicators: 2
  
  weights:
    pattern: 0.3
    indicator: 0.5
    confluence: 0.2
  
  confidenceThresholds:
    high: 75
    medium: 50
    low: 25
  
  multiTimeframeConfirm: true
  timeframes:
    - H1                        # Primary
    - H4                        # Higher
    - M15                       # Lower
  
  tradingSessions:
    london:
      enabled: true
      startHour: 8
      endHour: 12
    newYork:
      enabled: true
      startHour: 13
      endHour: 17
```

---

## Quick Reference

### Trend Decision Matrix

| Direction | Strength | Phase | Action |
|-----------|----------|-------|--------|
| Bullish | Strong | Early/Mature | Buy |
| Bullish | Strong | Weakening | Hold/Tighten Stop |
| Bullish | Moderate | Any | Wait for Signal |
| Bearish | Strong | Early/Mature | Sell |
| Bearish | Strong | Weakening | Cover/Tighten Stop |
| Bearish | Moderate | Any | Wait for Signal |
| Neutral | Any | Any | No Trade |
| Ranging | Any | Any | No Trade |

### ADX Thresholds

| Value | Meaning | Action |
|-------|---------|--------|
| <20 | No Trend | Avoid |
| 20-25 | Weak | Require Confirmation |
| 25-40 | Moderate | Trade With Trend |
| 40-60 | Strong | Strong Signal |
| 60-80 | Very Strong | High Confidence |
| >80 | Extreme | Caution |

---

## Summary

| Feature | Status | Function |
|---------|--------|----------|
| Trend Identification | ✅ | `analyzeTrend()` |
| Trend Strength | ✅ | ADX + score |
| Trend Signals | ✅ | `detectTrendSignals()` |
| Multi-Timeframe | ✅ | `analyzeMultiTimeframeTrend()` |
| Trend Phases | ✅ | Early/Mature/Weakening/Reversal |
| Price Channels | ✅ | `calculatePriceChannel()` |
| Confluence | ✅ | `generateTrendSummary()` |

---

*Last updated: 2026-06-25*
