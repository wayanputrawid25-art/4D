# ForexOS Pattern Detection Engine

**Last Updated:** 2026-06-25

Complete guide for ForexOS chart pattern detection - automated recognition of technical trading patterns.

---

## Table of Contents

1. [Overview](#overview)
2. [Pattern Categories](#pattern-categories)
3. [Chart Patterns](#chart-patterns)
4. [Candlestick Patterns](#candlestick-patterns)
5. [Support & Resistance](#support--resistance)
6. [Confidence Scoring](#confidence-scoring)
7. [Usage Examples](#usage-examples)
8. [API Reference](#api-reference)
9. [Configuration](#configuration)

---

## Overview

### What Are Chart Patterns?

Chart patterns are distinct formations on price charts that traders use to predict future price movements. They are based on the principle that certain recurring shapes in price data indicate predictable market behavior.

### Pattern Detection Library

```
packages/engine/src/patterns/
├── types.ts           # Type definitions
├── chart.ts          # Chart pattern detectors
└── candlestick.ts    # Candlestick pattern detectors
```

### Key Components

| Component | Lines | Description |
|-----------|-------|-------------|
| `chart.ts` | ~1000 | Chart pattern detection |
| `candlestick.ts` | ~538 | Single/multiple candle patterns |
| `types.ts` | ~110 | Type definitions |

---

## Pattern Categories

### Reversal Patterns

Signals a change in trend direction.

| Pattern | Direction | Type |
|---------|----------|------|
| Double Top | Bearish | Reversal |
| Double Bottom | Bullish | Reversal |
| Head & Shoulders | Bearish | Reversal |
| Inverse H&S | Bullish | Reversal |
| Triple Top | Bearish | Reversal |
| Triple Bottom | Bullish | Reversal |

### Continuation Patterns

Signals a pause in trend before resuming.

| Pattern | Direction | Type |
|---------|----------|------|
| Bull Flag | Bullish | Continuation |
| Bear Flag | Bearish | Continuation |
| Ascending Triangle | Bullish | Continuation |
| Descending Triangle | Bearish | Continuation |
| Symmetrical Triangle | Neutral | Continuation |

### Wedge Patterns

Converging lines indicating potential breakout.

| Pattern | Direction | Type |
|---------|----------|------|
| Rising Wedge | Bearish | Reversal |
| Falling Wedge | Bullish | Reversal |

### Other Patterns

| Pattern | Direction | Type |
|---------|----------|------|
| Cup & Handle | Bullish | Continuation |
| Parallel Channel | Any | Range |

---

## Chart Patterns

### Double Top

**Description:** Two peaks at approximately the same level, indicating resistance rejection.

```typescript
import { detectDoubleTop } from '@forexos/engine';

const result = detectDoubleTop(candles);

// Result
{
  pattern: {
    id: 'double_top_45',
    type: 'double_top',
    name: 'Double Top',
    direction: 'bearish',
    strength: 'strong',
    confidence: 85,
    priceTargets: {
      support: 1.0820,  // Neckline
      resistance: 1.0900, // Peak level
    }
  },
  confidence: 85,
  formed: true
}
```

**Detection Criteria:**
1. Two swing highs at similar levels (±0.5%)
2. Decline between peaks
3. Break below neckline confirms pattern

**Confidence Factors:**
- Base: 65%
- Peaks within 0.25% of each other: +15%
- Volume increase on second peak: +10%
- Pattern confirmed (break below neckline): +10%

---

### Double Bottom

**Description:** Two troughs at approximately the same level, indicating support acceptance.

```typescript
import { detectDoubleBottom } from '@forexos/engine';

const result = detectDoubleBottom(candles);
```

**Detection Criteria:**
1. Two swing lows at similar levels (±0.5%)
2. Rally between troughs
3. Break above neckline confirms pattern

**Confidence Factors:**
- Base: 65%
- Troughs within 0.25% of each other: +15%
- Volume increase on second trough: +10%
- Pattern confirmed: +10%

---

### Head and Shoulders

**Description:** Three peaks with middle peak highest, forming a "head" with two "shoulders."

```typescript
import { detectHeadAndShoulders } from '@forexos/engine';

const result = detectHeadAndShoulders(candles);

// Pattern Structure:
//        Right Shoulder
//     /                  \
//    /      HEAD          \
// Left Shoulder           Neckline
```

**Detection Criteria:**
1. Three swing highs (left shoulder, head, right shoulder)
2. Head is highest peak
3. Shoulders roughly equal in height (±3%)
4. Neckline connects the lows between shoulders

**Confidence Factors:**
- Base: 70%
- Head height > 2× neckline depth: +15%
- Head height > neckline depth: +10%
- Pattern confirmed: +10%

**Inverse Head and Shoulders:**
```typescript
import { detectInverseHeadAndShoulders } from '@forexos/engine';

const result = detectInverseHeadAndShoulders(candles);
```

---

### Triangles

**Ascending Triangle:**
- Horizontal resistance line
- Rising support line
- **Bullish continuation**

```typescript
import { detectTriangle } from '@forexos/engine';

// Triangle type auto-detected
const result = detectTriangle(candles);

if (result.pattern?.type === 'ascending_triangle') {
  console.log('Bullish triangle detected');
}
```

**Descending Triangle:**
- Falling resistance line
- Horizontal support line
- **Bearish continuation**

**Symmetrical Triangle:**
- Converging trend lines
- Neutral - breakout direction uncertain
- Price typically continues in original direction

**Detection Criteria:**
1. At least 4 swing points (2 highs, 2 lows)
2. Lines converge toward apex
3. Price trades within boundaries

---

### Flags

**Bull Flag:**
- Strong upward move (pole)
- Slight downward consolidation (flag)
- **Bullish continuation**

```typescript
import { detectBullFlag } from '@forexos/engine';

const result = detectBullFlag(candles);
```

**Bear Flag:**
- Strong downward move (pole)
- Slight upward consolidation (flag)
- **Bearish continuation**

```typescript
import { detectBearFlag } from '@forexos/engine';

const result = detectBearFlag(candles);
```

**Detection Criteria:**
1. Strong directional move (pole)
2. Flag retraces 20-50% of pole
3. Flag has slight counter-trend slope

**Ideal Flag Characteristics:**
- Retracement: 25-38% of pole (Fibonacci)
- Pole move: >5% of starting price
- Flag duration: 5-15 bars

---

### Wedges

**Rising Wedge:**
- Converging upward-sloping lines
- Lower lows and higher lows (but lows rise faster)
- **Bearish reversal**

```typescript
import { detectRisingWedge } from '@forexos/engine';

const result = detectRisingWedge(candles);
```

**Falling Wedge:**
- Converging downward-sloping lines
- Lower highs and higher lows (but highs fall faster)
- **Bullish reversal**

```typescript
import { detectFallingWedge } from '@forexos/engine';

const result = detectFallingWedge(candles);
```

**Detection Criteria:**
1. At least 4 swing points
2. Both lines slope in same direction
3. Converging toward apex

---

### Cup and Handle

**Description:** U-shaped cup followed by small pullback (handle).

```typescript
import { detectCupAndHandle } from '@forexos/engine';

const result = detectCupAndHandle(candles);

// Pattern Structure:
//     /\          /\
//    /  \   /\   /
//   /    \_/  \_/
//  /      Handle
```

**Detection Criteria:**
1. Two similar-height rims (peaks)
2. Rounded bottom (cup depth 10-50% of rim height)
3. Small pullback after cup (handle)

**Ideal Characteristics:**
- Cup depth: 15-35% of rim height
- Handle retraces: <50% of cup depth
- U-shape vs V-shape preferred

---

### Parallel Channels

**Description:** Price trades between parallel support and resistance lines.

```typescript
import { detectChannel } from '@forexos/engine';

const result = detectChannel(candles);

// Returns direction and boundaries
if (result.pattern) {
  console.log(`Direction: ${result.pattern.direction}`);
  console.log(`Upper: ${result.priceTargets?.resistance}`);
  console.log(`Lower: ${result.priceTargets?.support}`);
}
```

**Types:**
- **Bullish Channel:** Both lines slope upward
- **Bearish Channel:** Both lines slope downward
- **Horizontal Channel:** Lines are flat (range-bound)

**Detection Criteria:**
1. At least 4 touch points (2 each side)
2. Parallel trend lines
3. Price respects boundaries

---

## Candlestick Patterns

### Single Candle Patterns

**Doji:**
```typescript
import { detectDoji } from '@forexos/engine';

const result = detectDoji(candles[candles.length - 1]);
// Indicates indecision
```

**Hammer:**
```typescript
import { detectHammer } from '@forexos/engine';

const result = detectHammer(candles);
// Bullish reversal signal
```

**Shooting Star:**
```typescript
import { detectShootingStar } from '@forexos/engine';

const result = detectShootingStar(candles);
// Bearish reversal signal
```

### Multiple Candle Patterns

**Engulfing:**
```typescript
import { detectEngulfing } from '@forexos/engine';

const result = detectEngulfing(candles);
// Bullish or bearish engulfing detected
```

**Morning/Evening Star:**
```typescript
import { detectStar } from '@forexos/engine';

const result = detectStar(candles);
// 3-candle reversal patterns
```

**Piercing Line:**
```typescript
import { detectPiercingLine } from '@forexos/engine';

const result = detectPiercingLine(candles);
// Bullish reversal
```

---

## Support & Resistance

### Calculate S/R Levels

```typescript
import { calculateSupportResistance } from '@forexos/engine';

const levels = calculateSupportResistance(candles);

console.log('Support levels:', levels.support);
console.log('Resistance levels:', levels.resistance);

// Example output:
// Support levels: [1.0820, 1.0780, 1.0750]
// Resistance levels: [1.0950, 1.0920, 1.0880]
```

### How It Works

1. Find all swing highs (potential resistance)
2. Find all swing lows (potential support)
3. Group nearby levels (within 0.5% tolerance)
4. Rank by touch count (strength)
5. Return top 3 levels each

### Swing Point Detection

```typescript
import { findSwingPoints } from '@forexos/engine';

const swingPoints = findSwingPoints(candles, 5);
// lookback=5 means checking 5 candles on each side
```

**Swing Point Structure:**
```typescript
interface SwingPoint {
  index: number;
  price: number;
  type: 'swing_high' | 'swing_low';
  strength: number; // Based on prominence
}
```

---

## Confidence Scoring

### How Confidence Is Calculated

Confidence scores range from 0-100%, combining multiple factors:

| Factor | Contribution | Description |
|--------|-------------|-------------|
| Base Score | 50-70% | Initial pattern recognition |
| Pattern Precision | +10-20% | How closely pattern matches ideal |
| Volume Confirmation | +10% | Volume supporting the pattern |
| Formation Status | +10% | Pattern complete vs forming |
| Price Action | +10-20% | Current price position |

### Confidence Thresholds

| Confidence | Signal Strength | Interpretation |
|-----------|----------------|----------------|
| >85% | Very Strong | High-probability setup |
| 70-85% | Strong | Reliable signal |
| 60-70% | Moderate | Watch for confirmation |
| 55-60% | Weak | Requires more evidence |
| <55% | No Signal | Pattern not significant |

### Pattern Strength Classification

```typescript
interface Pattern {
  // ...
  strength: 'strong' | 'moderate' | 'weak';
  confidence: number; // 0-100
  // ...
}
```

### Example: Double Top Confidence

```typescript
const result = detectDoubleTop(candles);

// Base score: 65%
// Peak similarity < 0.25%: +15% (total: 80%)
// Volume confirmation: +10% (total: 90%)
// Pattern confirmed: +10% (total: 100%, capped)

// result.pattern.strength = 'strong'
// result.pattern.confidence = 90
```

---

## Usage Examples

### Basic Pattern Detection

```typescript
import { 
  detectDoubleTop,
  detectDoubleBottom,
  detectHeadAndShoulders,
  detectTriangle,
  detectBullFlag,
  detectBearFlag,
  detectRisingWedge,
  detectFallingWedge,
  detectCupAndHandle,
  detectChannel 
} from '@forexos/engine';

// Detect specific pattern
const doubleTop = detectDoubleTop(candles);

if (doubleTop.pattern && doubleTop.confidence > 70) {
  console.log(`Double Top detected with ${doubleTop.confidence}% confidence`);
  
  // Get price targets
  if (doubleTop.priceTargets) {
    console.log(`Support: ${doubleTop.priceTargets.support}`);
    console.log(`Resistance: ${doubleTop.priceTargets.resistance}`);
  }
}
```

### Detect All Patterns

```typescript
import { detectAllChartPatterns } from '@forexos/engine';

const signals = detectAllChartPatterns(candles);

// Sort by confidence
signals.sort((a, b) => b.pattern.confidence - a.pattern.confidence);

// Filter high-confidence signals
const highConfidenceSignals = signals.filter(s => s.pattern.confidence > 70);

for (const signal of highConfidenceSignals) {
  console.log(`${signal.pattern.name}: ${signal.pattern.confidence}%`);
  console.log(`Direction: ${signal.pattern.direction}`);
  console.log(`Status: ${signal.formed ? 'Complete' : 'Forming'}`);
}
```

### Detect All Candlestick Patterns

```typescript
import { detectAllCandlestickPatterns } from '@forexos/engine';

const candleSignals = detectAllCandlestickPatterns(candles);

for (const signal of candleSignals) {
  if (signal.pattern.confidence > 60) {
    console.log(`${signal.pattern.name} at ${signal.pattern.startTime}`);
  }
}
```

### Combined Analysis

```typescript
import { 
  detectAllChartPatterns, 
  detectAllCandlestickPatterns,
  calculateSupportResistance 
} from '@forexos/engine';

function analyzePatterns(candles: Candle[]) {
  const results = {
    chartPatterns: detectAllChartPatterns(candles),
    candlePatterns: detectAllCandlestickPatterns(candles),
    levels: calculateSupportResistance(candles),
  };
  
  // Count bullish vs bearish signals
  let bullishCount = 0;
  let bearishCount = 0;
  
  for (const pattern of results.chartPatterns) {
    if (pattern.pattern.direction === 'bullish') bullishCount++;
    else if (pattern.pattern.direction === 'bearish') bearishCount++;
  }
  
  console.log(`Bullish signals: ${bullishCount}`);
  console.log(`Bearish signals: ${bearishCount}`);
  
  // Check for confluence with S/R
  const currentPrice = candles[candles.length - 1].close;
  
  for (const level of results.levels.resistance) {
    if (Math.abs(currentPrice - level) < level * 0.005) {
      console.log('Price at resistance confluence!');
    }
  }
  
  return results;
}
```

### Trading Signals

```typescript
interface TradingSignal {
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  patterns: Pattern[];
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskReward?: number;
}

function generatePatternSignal(candles: Candle[]): TradingSignal {
  const patterns = detectAllChartPatterns(candles);
  const currentPrice = candles[candles.length - 1].close;
  
  // Filter high-confidence complete patterns
  const actionablePatterns = patterns.filter(
    p => p.formed && p.pattern.confidence > 70
  );
  
  if (actionablePatterns.length === 0) {
    return { action: 'hold', confidence: 0, patterns: [] };
  }
  
  // Sort by confidence
  actionablePatterns.sort((a, b) => b.pattern.confidence - a.pattern.confidence);
  
  const primaryPattern = actionablePatterns[0];
  
  let action: 'buy' | 'sell' | 'hold';
  let entryPrice = currentPrice;
  let stopLoss: number;
  let takeProfit: number;
  
  if (primaryPattern.pattern.direction === 'bullish') {
    action = 'buy';
    stopLoss = primaryPattern.priceTargets?.support || currentPrice * 0.99;
    takeProfit = primaryPattern.priceTargets?.resistance || currentPrice * 1.02;
  } else if (primaryPattern.pattern.direction === 'bearish') {
    action = 'sell';
    stopLoss = primaryPattern.priceTargets?.resistance || currentPrice * 1.01;
    takeProfit = primaryPattern.priceTargets?.support || currentPrice * 0.98;
  } else {
    action = 'hold';
    stopLoss = takeProfit = currentPrice;
  }
  
  const riskAmount = Math.abs(entryPrice - stopLoss);
  const rewardAmount = Math.abs(takeProfit - entryPrice);
  const riskReward = riskAmount > 0 ? rewardAmount / riskAmount : 0;
  
  return {
    action,
    confidence: primaryPattern.pattern.confidence,
    patterns: actionablePatterns,
    entryPrice,
    stopLoss,
    takeProfit,
    riskReward,
  };
}
```

---

## API Reference

### Chart Pattern Detection

```typescript
// Double Top (Bearish Reversal)
detectDoubleTop(candles: Candle[]): ChartPatternResult

// Double Bottom (Bullish Reversal)
detectDoubleBottom(candles: Candle[]): ChartPatternResult

// Head and Shoulders (Bearish Reversal)
detectHeadAndShoulders(candles: Candle[]): ChartPatternResult

// Inverse Head and Shoulders (Bullish Reversal)
detectInverseHeadAndShoulders(candles: Candle[]): ChartPatternResult

// Triangle (Auto-detects type)
detectTriangle(candles: Candle[]): ChartPatternResult
// Returns: ascending_triangle | descending_triangle | symmetrical_triangle

// Bull Flag (Bullish Continuation)
detectBullFlag(candles: Candle[]): ChartPatternResult

// Bear Flag (Bearish Continuation)
detectBearFlag(candles: Candle[]): ChartPatternResult

// Rising Wedge (Bearish Reversal)
detectRisingWedge(candles: Candle[]): ChartPatternResult

// Falling Wedge (Bullish Reversal)
detectFallingWedge(candles: Candle[]): ChartPatternResult

// Cup and Handle (Bullish Continuation)
detectCupAndHandle(candles: Candle[]): ChartPatternResult

// Parallel Channel
detectChannel(candles: Candle[]): ChartPatternResult

// Detect all patterns at once
detectAllChartPatterns(candles: Candle[]): PatternSignal[]
```

### Candlestick Pattern Detection

```typescript
// Single candle patterns
detectDoji(candle: Candle): CandlestickPatternResult
detectHammer(candles: Candle[]): CandlestickPatternResult
detectShootingStar(candles: Candle[]): CandlestickPatternResult
detectSpinningTop(candles: Candle[]): CandlestickPatternResult
detectMarubozu(candles: Candle[]): CandlestickPatternResult

// Multiple candle patterns
detectEngulfing(candles: Candle[]): CandlestickPatternResult
detectStar(candles: Candle[]): CandlestickPatternResult
detectPiercingLine(candles: Candle[]): CandlestickPatternResult

// Detect all candlestick patterns
detectAllCandlestickPatterns(candles: Candle[]): PatternSignal[]
```

### Support & Resistance

```typescript
// Find swing points
findSwingPoints(candles: Candle[], lookback?: number): SwingPoint[]

// Calculate S/R levels
calculateSupportResistance(candles: Candle[]): {
  support: number[];
  resistance: number[];
}
```

### Result Types

```typescript
interface ChartPatternResult {
  pattern: Pattern | null;
  confidence: number;
  formed: boolean;
  priceTargets?: {
    support?: number;
    resistance?: number;
  };
}

interface Pattern {
  id: string;
  type: PatternType;
  name: string;
  direction: PatternDirection;
  strength: PatternStrength;
  confidence: number;
  symbol: string;
  timeframe: Timeframe;
  startTime: number;
  endTime: number;
  priceTargets?: {
    support?: number;
    resistance?: number;
  };
}

interface PatternSignal {
  id: string;
  pattern: Pattern;
  candles: Candle[];
  formed: boolean;
  timestamp: number;
}
```

### Enums

```typescript
type PatternType = 
  | 'double_top'
  | 'double_bottom'
  | 'head_and_shoulders'
  | 'inverse_head_and_shoulders'
  | 'ascending_triangle'
  | 'descending_triangle'
  | 'symmetrical_triangle'
  | 'rising_wedge'
  | 'falling_wedge'
  | 'bull_flag'
  | 'bear_flag'
  | 'cup_and_handle'
  | 'channel';

type PatternDirection = 'bullish' | 'bearish' | 'neutral';

type PatternStrength = 'strong' | 'moderate' | 'weak';
```

---

## Configuration

### Trading Config

```yaml
# config/trading.yaml
patterns:
  minConfidence: 50           # Minimum confidence threshold
  candlestick:
    enabled: true
    patterns:
      - doji
      - hammer
      - bullish_engulfing
      - bearish_engulfing
      - morning_star
      - evening_star
  chart:
    enabled: true
    patterns:
      - double_top
      - double_bottom
      - head_and_shoulders
      - ascending_triangle
      - descending_triangle
      - bull_flag
      - bear_flag
      - rising_wedge
      - falling_wedge
      - cup_and_handle
  confluence:
    bullishThreshold: 0.65
    bearishThreshold: 0.35
    minPatternsForSignal: 2
```

---

## Quick Reference

### Pattern Summary

| Pattern | Direction | Type | Min Candles |
|---------|----------|------|------------|
| Double Top | Bearish | Reversal | 20 |
| Double Bottom | Bullish | Reversal | 20 |
| Head & Shoulders | Bearish | Reversal | 50 |
| Inverse H&S | Bullish | Reversal | 50 |
| Ascending Triangle | Bullish | Continuation | 40 |
| Descending Triangle | Bearish | Continuation | 40 |
| Symmetrical Triangle | Neutral | Either | 40 |
| Bull Flag | Bullish | Continuation | 20 |
| Bear Flag | Bearish | Continuation | 20 |
| Rising Wedge | Bearish | Reversal | 30 |
| Falling Wedge | Bullish | Reversal | 30 |
| Cup & Handle | Bullish | Continuation | 40 |
| Parallel Channel | Any | Range | 20 |

### Pattern Detection Status

All requested patterns are implemented:

| Pattern | Status | Function |
|---------|--------|----------|
| ✅ Double Top | Complete | `detectDoubleTop` |
| ✅ Double Bottom | Complete | `detectDoubleBottom` |
| ✅ Head & Shoulders | Complete | `detectHeadAndShoulders` |
| ✅ Triangles | Complete | `detectTriangle` |
| ✅ Flags | Complete | `detectBullFlag`, `detectBearFlag` |
| ✅ Channels | Complete | `detectChannel` |
| ✅ Wedges | Complete | `detectRisingWedge`, `detectFallingWedge` |
| ✅ Cup & Handle | Complete | `detectCupAndHandle` |
| ✅ Support/Resistance | Complete | `calculateSupportResistance` |
| ✅ Confidence Scoring | Complete | Built into each detector |

---

*Last updated: 2026-06-25*
