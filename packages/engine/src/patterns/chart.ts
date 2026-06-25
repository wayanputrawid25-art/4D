// Chart Pattern Detector
import type { Candle, Timeframe } from '@forexos/types';
import type { 
  Pattern, 
  PatternSignal, 
  PatternDirection, 
  PatternStrength,
  PatternType,
  SwingPoint
} from './types';

export interface ChartPatternResult {
  pattern: Pattern | null;
  confidence: number;
  formed: boolean;
  priceTargets?: {
    support?: number;
    resistance?: number;
  };
}

// Find local extrema (swing highs/lows)
export function findSwingPoints(
  candles: Candle[],
  lookback: number = 5
): SwingPoint[] {
  const points: SwingPoint[] = [];
  
  for (let i = lookback; i < candles.length - lookback; i++) {
    const current = candles[i];
    const prevCandles = candles.slice(i - lookback, i);
    const nextCandles = candles.slice(i + 1, i + lookback + 1);
    
    // Check if this is a swing high
    const isSwingHigh = prevCandles.every(c => c.high <= current.high) &&
                        nextCandles.every(c => c.high <= current.high);
    
    // Check if this is a swing low
    const isSwingLow = prevCandles.every(c => c.low >= current.low) &&
                       nextCandles.every(c => c.low >= current.low);
    
    if (isSwingHigh) {
      // Calculate strength based on prominence
      const avgRange = [...prevCandles, ...nextCandles]
        .reduce((sum, c) => sum + (c.high - c.low), 0) / (prevCandles.length + nextCandles.length);
      const prominence = (current.high - Math.max(...prevCandles.map(c => c.high), ...nextCandles.map(c => c.high))) / avgRange;
      
      points.push({
        index: i,
        price: current.high,
        type: 'swing_high',
        strength: Math.min(prominence, 3), // Cap at 3
      });
    }
    
    if (isSwingLow) {
      const avgRange = [...prevCandles, ...nextCandles]
        .reduce((sum, c) => sum + (c.high - c.low), 0) / (prevCandles.length + nextCandles.length);
      const prominence = (Math.min(...prevCandles.map(c => c.low), ...nextCandles.map(c => c.low)) - current.low) / avgRange;
      
      points.push({
        index: i,
        price: current.low,
        type: 'swing_low',
        strength: Math.min(prominence, 3),
      });
    }
  }
  
  return points;
}

// Calculate price volatility
function calculateVolatility(candles: Candle[]): number {
  if (candles.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < candles.length; i++) {
    returns.push(Math.abs(candles[i].close - candles[i - 1].close) / candles[i - 1].close);
  }
  
  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
}

// Double Top Pattern
export function detectDoubleTop(candles: Candle[]): ChartPatternResult {
  if (candles.length < 20) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const swingPoints = findSwingPoints(candles.slice(0, -1), 5);
  const swingHighs = swingPoints.filter(p => p.type === 'swing_high');
  
  if (swingHighs.length < 2) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Find the last two significant highs
  const lastHighs = swingHighs.slice(-2);
  if (lastHighs.length < 2) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const [first, second] = lastHighs;
  const priceDiff = Math.abs(first.price - second.price);
  const avgPrice = (first.price + second.price) / 2;
  const tolerance = avgPrice * 0.005; // 0.5% tolerance
  
  if (priceDiff > tolerance) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Check for confirmation: price breaks below the neckline
  const necklinePrice = candles.slice(first.index, second.index + 1)
    .reduce((min, c) => Math.min(min, c.low), Infinity);
  
  const lastCandle = candles[candles.length - 1];
  const isConfirmed = lastCandle.close < necklinePrice;
  
  let confidence = 65;
  
  // Higher confidence if peaks are similar in height
  if (priceDiff < tolerance * 0.5) confidence += 15;
  
  // Higher confidence if volume increased on second peak (or confirmation)
  const volumeRatio = calculateVolumeRatio(candles, first.index, second.index);
  if (volumeRatio > 1.2) confidence += 10;
  
  // Higher confidence if pattern is formed
  if (isConfirmed) confidence += 10;
  
  return {
    pattern: {
      id: `double_top_${second.index}`,
      type: 'double_top',
      name: 'Double Top',
      direction: 'bearish',
      strength: confidence > 85 ? 'strong' : confidence > 70 ? 'moderate' : 'weak',
      confidence,
      symbol: candles[0].symbol,
      timeframe: candles[0].timeframe,
      startTime: candles[first.index].timestamp,
      endTime: lastCandle.timestamp,
      priceTargets: {
        support: necklinePrice,
        resistance: avgPrice,
      },
    },
    confidence,
    formed: isConfirmed || confidence > 80,
    priceTargets: {
      support: necklinePrice,
      resistance: avgPrice,
    },
  };
}

// Double Bottom Pattern
export function detectDoubleBottom(candles: Candle[]): ChartPatternResult {
  if (candles.length < 20) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const swingPoints = findSwingPoints(candles.slice(0, -1), 5);
  const swingLows = swingPoints.filter(p => p.type === 'swing_low');
  
  if (swingLows.length < 2) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const lastLows = swingLows.slice(-2);
  if (lastLows.length < 2) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const [first, second] = lastLows;
  const priceDiff = Math.abs(first.price - second.price);
  const avgPrice = (first.price + second.price) / 2;
  const tolerance = avgPrice * 0.005;
  
  if (priceDiff > tolerance) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Check for confirmation: price breaks above the neckline
  const necklinePrice = candles.slice(first.index, second.index + 1)
    .reduce((max, c) => Math.max(max, c.high), -Infinity);
  
  const lastCandle = candles[candles.length - 1];
  const isConfirmed = lastCandle.close > necklinePrice;
  
  let confidence = 65;
  
  if (priceDiff < tolerance * 0.5) confidence += 15;
  
  const volumeRatio = calculateVolumeRatio(candles, first.index, second.index);
  if (volumeRatio > 1.2) confidence += 10;
  
  if (isConfirmed) confidence += 10;
  
  return {
    pattern: {
      id: `double_bottom_${second.index}`,
      type: 'double_bottom',
      name: 'Double Bottom',
      direction: 'bullish',
      strength: confidence > 85 ? 'strong' : confidence > 70 ? 'moderate' : 'weak',
      confidence,
      symbol: candles[0].symbol,
      timeframe: candles[0].timeframe,
      startTime: candles[first.index].timestamp,
      endTime: lastCandle.timestamp,
      priceTargets: {
        resistance: necklinePrice,
        support: avgPrice,
      },
    },
    confidence,
    formed: isConfirmed || confidence > 80,
    priceTargets: {
      resistance: necklinePrice,
      support: avgPrice,
    },
  };
}

// Triangle Patterns
function detectTriangle(candles: Candle[]): ChartPatternResult {
  if (candles.length < 40) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const recentCandles = candles.slice(-40);
  const swingPoints = findSwingPoints(recentCandles, 3);
  
  if (swingPoints.length < 4) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const highs = swingPoints.filter(p => p.type === 'swing_high').map(p => p.price);
  const lows = swingPoints.filter(p => p.type === 'swing_low').map(p => p.price);
  
  if (highs.length < 2 || lows.length < 2) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Calculate trend lines
  const highsTrend = calculateTrendLine(highs);
  const lowsTrend = calculateTrendLine(lows);
  
  const lastCandle = candles[candles.length - 1];
  const volatility = calculateVolatility(candles);
  
  // Ascending Triangle: flat resistance, rising support
  const ascendingTriangle = 
    highsTrend.slope > -0.0001 && // Nearly flat highs
    lowsTrend.slope > 0.0001 && // Rising lows
    Math.abs(highsTrend.slope) < Math.abs(lowsTrend.slope); // Low trend is steeper
  
  // Descending Triangle: falling resistance, flat support
  const descendingTriangle = 
    lowsTrend.slope < 0.0001 && // Nearly flat lows
    highsTrend.slope < -0.0001 && // Falling highs
    Math.abs(lowsTrend.slope) < Math.abs(highsTrend.slope); // High trend is steeper
  
  // Symmetrical Triangle: both converging
  const symmetricalTriangle = 
    Math.abs(highsTrend.slope) > 0.0001 && 
    Math.abs(lowsTrend.slope) > 0.0001 &&
    ((highsTrend.slope < 0 && lowsTrend.slope > 0) || 
     (highsTrend.slope > 0 && lowsTrend.slope < 0));
  
  if (!ascendingTriangle && !descendingTriangle && !symmetricalTriangle) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Calculate if price is near apex
  const apexDistance = Math.abs(highs[0] - lows[0]) * 0.25;
  const currentRange = Math.abs(highs[highs.length - 1] - lows[lows.length - 1]);
  const isNearApex = currentRange < apexDistance;
  
  let confidence = 55;
  let patternType: PatternType;
  let patternName: string;
  let direction: PatternDirection;
  
  if (ascendingTriangle) {
    patternType = 'ascending_triangle';
    patternName = 'Ascending Triangle';
    direction = 'bullish';
    if (lastCandle.close > highsTrend.intercept) confidence += 20;
  } else if (descendingTriangle) {
    patternType = 'descending_triangle';
    patternName = 'Descending Triangle';
    direction = 'bearish';
    if (lastCandle.close < lowsTrend.intercept) confidence += 20;
  } else {
    patternType = 'symmetrical_triangle';
    patternName = 'Symmetrical Triangle';
    direction = 'neutral';
    confidence += 10;
  }
  
  // Stronger if narrowing range
  const initialRange = Math.abs(highs[0] - lows[0]);
  const narrowingRatio = 1 - (currentRange / initialRange);
  if (narrowingRatio > 0.5) confidence += 15;
  else if (narrowingRatio > 0.3) confidence += 10;
  
  return {
    pattern: {
      id: `${patternType}_${lastCandle.id}`,
      type: patternType,
      name: patternName,
      direction,
      strength: confidence > 80 ? 'strong' : confidence > 60 ? 'moderate' : 'weak',
      confidence,
      symbol: candles[0].symbol,
      timeframe: candles[0].timeframe,
      startTime: recentCandles[0].timestamp,
      endTime: lastCandle.timestamp,
    },
    confidence,
    formed: isNearApex || confidence > 75,
  };
}

// Head and Shoulders
export function detectHeadAndShoulders(candles: Candle[]): ChartPatternResult {
  if (candles.length < 50) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const recentCandles = candles.slice(-50);
  const swingPoints = findSwingPoints(recentCandles, 5);
  const highs = swingPoints.filter(p => p.type === 'swing_high');
  
  if (highs.length < 3) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const [leftShoulder, head, rightShoulder] = highs.slice(-3);
  
  // Head should be highest
  if (head.price <= leftShoulder.price || head.price <= rightShoulder.price) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Shoulders should be roughly equal
  const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price);
  const avgShoulder = (leftShoulder.price + rightShoulder.price) / 2;
  const shoulderTolerance = avgShoulder * 0.03; // 3%
  
  if (shoulderDiff > shoulderTolerance) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Neckline: connecting the lows between shoulders
  const necklineLows = recentCandles.slice(leftShoulder.index, rightShoulder.index + 1)
    .reduce((min, c) => Math.min(min, c.low), Infinity);
  
  const lastCandle = candles[candles.length - 1];
  const isConfirmed = lastCandle.close < necklineLows;
  
  let confidence = 70;
  
  // Head height above shoulders
  const headHeight = head.price - avgShoulder;
  const necklineDepth = avgShoulder - necklineLows;
  if (headHeight > necklineDepth * 2) confidence += 15;
  else if (headHeight > necklineDepth) confidence += 10;
  
  if (isConfirmed) confidence += 10;
  
  return {
    pattern: {
      id: `head_and_shoulders_${head.index}`,
      type: 'head_and_shoulders',
      name: 'Head and Shoulders',
      direction: 'bearish',
      strength: confidence > 85 ? 'strong' : confidence > 70 ? 'moderate' : 'weak',
      confidence,
      symbol: candles[0].symbol,
      timeframe: candles[0].timeframe,
      startTime: recentCandles[leftShoulder.index].timestamp,
      endTime: lastCandle.timestamp,
      priceTargets: {
        support: necklineLows - headHeight,
        resistance: necklineLows,
      },
    },
    confidence,
    formed: isConfirmed || confidence > 85,
    priceTargets: {
      support: necklineLows - headHeight,
      resistance: necklineLows,
    },
  };
}

// Inverse Head and Shoulders
export function detectInverseHeadAndShoulders(candles: Candle[]): ChartPatternResult {
  if (candles.length < 50) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const recentCandles = candles.slice(-50);
  const swingPoints = findSwingPoints(recentCandles, 5);
  const lows = swingPoints.filter(p => p.type === 'swing_low');
  
  if (lows.length < 3) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const [leftShoulder, head, rightShoulder] = lows.slice(-3);
  
  // Head should be lowest
  if (head.price >= leftShoulder.price || head.price >= rightShoulder.price) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price);
  const avgShoulder = (leftShoulder.price + rightShoulder.price) / 2;
  const shoulderTolerance = avgShoulder * 0.03;
  
  if (shoulderDiff > shoulderTolerance) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const necklineHighs = recentCandles.slice(leftShoulder.index, rightShoulder.index + 1)
    .reduce((max, c) => Math.max(max, c.high), -Infinity);
  
  const lastCandle = candles[candles.length - 1];
  const isConfirmed = lastCandle.close > necklineHighs;
  
  let confidence = 70;
  
  const headDepth = avgShoulder - head.price;
  const necklineHeight = necklineHighs - avgShoulder;
  if (headDepth > necklineHeight * 2) confidence += 15;
  else if (headDepth > necklineHeight) confidence += 10;
  
  if (isConfirmed) confidence += 10;
  
  return {
    pattern: {
      id: `inverse_head_and_shoulders_${head.index}`,
      type: 'inverse_head_and_shoulders',
      name: 'Inverse Head and Shoulders',
      direction: 'bullish',
      strength: confidence > 85 ? 'strong' : confidence > 70 ? 'moderate' : 'weak',
      confidence,
      symbol: candles[0].symbol,
      timeframe: candles[0].timeframe,
      startTime: recentCandles[leftShoulder.index].timestamp,
      endTime: lastCandle.timestamp,
      priceTargets: {
        resistance: necklineHighs + headDepth,
        support: necklineHighs,
      },
    },
    confidence,
    formed: isConfirmed || confidence > 85,
  };
}

// Calculate volume ratio between two periods
function calculateVolumeRatio(candles: Candle[], index1: number, index2: number): number {
  if (index2 <= index1 || index1 < 0) return 1;
  
  const period1 = candles.slice(Math.max(0, index1 - 10), index1);
  const period2 = candles.slice(Math.max(0, index2 - 10), index2);
  
  const vol1 = period1.reduce((sum, c) => sum + c.tickVolume, 0) / (period1.length || 1);
  const vol2 = period2.reduce((sum, c) => sum + c.tickVolume, 0) / (period2.length || 1);
  
  return vol2 / (vol1 || 1);
}

// Calculate trend line
function calculateTrendLine(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };
  
  const indices = values.map((_, i) => i);
  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

// Detect all chart patterns
export function detectAllChartPatterns(candles: Candle[]): PatternSignal[] {
  const signals: PatternSignal[] = [];
  
  const detectors = [
    detectDoubleTop,
    detectDoubleBottom,
    detectTriangle,
    detectHeadAndShoulders,
    detectInverseHeadAndShoulders,
    detectBullFlag,
    detectBearFlag,
    detectRisingWedge,
    detectFallingWedge,
    detectCupAndHandle,
    detectChannel,
  ];
  
  for (const detector of detectors) {
    const result = detector(candles);
    if (result.pattern && result.confidence > 55) {
      signals.push({
        id: `signal_${result.pattern.type}_${Date.now()}`,
        pattern: result.pattern,
        candles: candles.slice(-50),
        formed: result.formed,
        timestamp: Date.now(),
      });
    }
  }
  
  return signals;
}

// Bull Flag Pattern
export function detectBullFlag(candles: Candle[]): ChartPatternResult {
  if (candles.length < 20) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const recentCandles = candles.slice(-20);
  const swingPoints = findSwingPoints(recentCandles, 3);
  
  if (swingPoints.length < 4) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const highs = swingPoints.filter(p => p.type === 'swing_high');
  const lows = swingPoints.filter(p => p.type === 'swing_low');
  
  if (highs.length < 2 || lows.length < 2) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Check for strong uptrend (pole)
  const poleStart = lows[0];
  const poleEnd = highs[0];
  const poleHeight = poleEnd.price - poleStart.price;
  
  if (poleHeight < 0) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Check for slight downward consolidation (flag)
  const flagHighs = highs.slice(1);
  const flagLows = lows.slice(1);
  
  if (flagHighs.length < 1 || flagLows.length < 1) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const flagHighTrend = calculateTrendLine(flagHighs.map(h => h.price));
  const flagLowTrend = calculateTrendLine(flagLows.map(l => l.price));
  
  // Flag should slope slightly downward or be flat
  const isValidFlag = flagHighTrend.slope <= 0 && flagLowTrend.slope <= 0;
  
  if (!isValidFlag) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Flag retracement should be less than 50% of pole
  const flagHeight = poleEnd.price - (flagLows[flagLows.length - 1]?.price || flagLows[0].price);
  const retracement = flagHeight / poleHeight;
  
  if (retracement > 0.5) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  let confidence = 60;
  
  // Stronger if retracement is between 25-38%
  if (retracement > 0.25 && retracement < 0.38) confidence += 20;
  else if (retracement > 0.20 && retracement < 0.50) confidence += 10;
  
  // Pole should be strong
  const poleStrength = poleHeight / poleStart.price;
  if (poleStrength > 0.05) confidence += 10;
  
  const lastCandle = candles[candles.length - 1];
  
  return {
    pattern: {
      id: `bull_flag_${lastCandle.id}`,
      type: 'bull_flag' as PatternType,
      name: 'Bull Flag',
      direction: 'bullish',
      strength: confidence > 80 ? 'strong' : confidence > 60 ? 'moderate' : 'weak',
      confidence,
      symbol: candles[0].symbol,
      timeframe: candles[0].timeframe,
      startTime: recentCandles[0].timestamp,
      endTime: lastCandle.timestamp,
      priceTargets: {
        resistance: poleEnd.price + poleHeight,
        support: flagLows[flagLows.length - 1]?.price || flagLows[0].price,
      },
    },
    confidence,
    formed: confidence > 75,
    priceTargets: {
      resistance: poleEnd.price + poleHeight,
      support: flagLows[flagLows.length - 1]?.price || flagLows[0].price,
    },
  };
}

// Bear Flag Pattern
export function detectBearFlag(candles: Candle[]): ChartPatternResult {
  if (candles.length < 20) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const recentCandles = candles.slice(-20);
  const swingPoints = findSwingPoints(recentCandles, 3);
  
  if (swingPoints.length < 4) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const highs = swingPoints.filter(p => p.type === 'swing_high');
  const lows = swingPoints.filter(p => p.type === 'swing_low');
  
  if (highs.length < 2 || lows.length < 2) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Check for strong downtrend (pole)
  const poleStart = highs[0];
  const poleEnd = lows[0];
  const poleHeight = poleStart.price - poleEnd.price;
  
  if (poleHeight < 0) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Check for slight upward consolidation (flag)
  const flagHighs = highs.slice(1);
  const flagLows = lows.slice(1);
  
  if (flagHighs.length < 1 || flagLows.length < 1) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const flagHighTrend = calculateTrendLine(flagHighs.map(h => h.price));
  const flagLowTrend = calculateTrendLine(flagLows.map(l => l.price));
  
  // Flag should slope slightly upward or be flat
  const isValidFlag = flagHighTrend.slope >= 0 && flagLowTrend.slope >= 0;
  
  if (!isValidFlag) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Flag retracement should be less than 50% of pole
  const flagHeight = (flagHighs[flagHighs.length - 1]?.price || flagHighs[0].price) - poleEnd.price;
  const retracement = flagHeight / poleHeight;
  
  if (retracement > 0.5) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  let confidence = 60;
  
  if (retracement > 0.25 && retracement < 0.38) confidence += 20;
  else if (retracement > 0.20 && retracement < 0.50) confidence += 10;
  
  const poleStrength = poleHeight / poleStart.price;
  if (poleStrength > 0.05) confidence += 10;
  
  const lastCandle = candles[candles.length - 1];
  
  return {
    pattern: {
      id: `bear_flag_${lastCandle.id}`,
      type: 'bear_flag' as PatternType,
      name: 'Bear Flag',
      direction: 'bearish',
      strength: confidence > 80 ? 'strong' : confidence > 60 ? 'moderate' : 'weak',
      confidence,
      symbol: candles[0].symbol,
      timeframe: candles[0].timeframe,
      startTime: recentCandles[0].timestamp,
      endTime: lastCandle.timestamp,
      priceTargets: {
        support: poleEnd.price - poleHeight,
        resistance: flagHighs[flagHighs.length - 1]?.price || flagHighs[0].price,
      },
    },
    confidence,
    formed: confidence > 75,
  };
}

// Rising Wedge
export function detectRisingWedge(candles: Candle[]): ChartPatternResult {
  return detectWedgePattern(candles, 'rising');
}

// Falling Wedge
export function detectFallingWedge(candles: Candle[]): ChartPatternResult {
  return detectWedgePattern(candles, 'falling');
}

// Generic Wedge Pattern
function detectWedgePattern(candles: Candle[], type: 'rising' | 'falling'): ChartPatternResult {
  if (candles.length < 30) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const recentCandles = candles.slice(-30);
  const swingPoints = findSwingPoints(recentCandles, 3);
  
  if (swingPoints.length < 4) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const highs = swingPoints.filter(p => p.type === 'swing_high').map(p => p.price);
  const lows = swingPoints.filter(p => p.type === 'swing_low').map(p => p.price);
  
  if (highs.length < 2 || lows.length < 2) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const highTrend = calculateTrendLine(highs);
  const lowTrend = calculateTrendLine(lows);
  
  let isValid = false;
  let direction: PatternDirection = 'neutral';
  let patternType: PatternType;
  let patternName: string;
  
  if (type === 'rising') {
    // Rising wedge: both lines go up, but lows rise faster
    isValid = highTrend.slope > 0 && lowTrend.slope > 0 && lowTrend.slope > highTrend.slope;
    direction = 'bearish';
    patternType = 'rising_wedge';
    patternName = 'Rising Wedge';
  } else {
    // Falling wedge: both lines go down, but highs fall faster
    isValid = highTrend.slope < 0 && lowTrend.slope < 0 && highTrend.slope < lowTrend.slope;
    direction = 'bullish';
    patternType = 'falling_wedge';
    patternName = 'Falling Wedge';
  }
  
  if (!isValid) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  let confidence = 60;
  
  // Check if lines are converging
  const initialSpread = Math.abs(highs[0] - lows[0]);
  const finalSpread = Math.abs(highs[highs.length - 1] - lows[lows.length - 1]);
  const convergence = (initialSpread - finalSpread) / initialSpread;
  
  if (convergence > 0.3) confidence += 20;
  else if (convergence > 0.15) confidence += 10;
  
  const lastCandle = candles[candles.length - 1];
  
  return {
    pattern: {
      id: `${patternType}_${lastCandle.id}`,
      type: patternType,
      name: patternName,
      direction,
      strength: confidence > 80 ? 'strong' : confidence > 60 ? 'moderate' : 'weak',
      confidence,
      symbol: candles[0].symbol,
      timeframe: candles[0].timeframe,
      startTime: recentCandles[0].timestamp,
      endTime: lastCandle.timestamp,
    },
    confidence,
    formed: confidence > 75,
  };
}

// Cup and Handle
export function detectCupAndHandle(candles: Candle[]): ChartPatternResult {
  if (candles.length < 40) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const recentCandles = candles.slice(-40);
  const swingPoints = findSwingPoints(recentCandles, 4);
  
  const highs = swingPoints.filter(p => p.type === 'swing_high');
  const lows = swingPoints.filter(p => p.type === 'swing_low');
  
  if (highs.length < 2 || lows.length < 3) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Find cup: two similar highs with a rounded bottom between them
  const leftRim = highs[highs.length - 2];
  const rightRim = highs[highs.length - 1];
  const cupBottom = lows.slice(-2)[0];
  
  if (!leftRim || !rightRim || !cupBottom) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Check if rims are at similar levels
  const rimDiff = Math.abs(leftRim.price - rightRim.price);
  const rimAvg = (leftRim.price + rightRim.price) / 2;
  const rimTolerance = rimAvg * 0.05; // 5% tolerance
  
  if (rimDiff > rimTolerance) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Cup bottom should be significantly below rims
  const cupDepth = rimAvg - cupBottom.price;
  const depthRatio = cupDepth / rimAvg;
  
  if (depthRatio < 0.10) { // Less than 10% depth
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Check for handle (minor pullback after cup)
  const handleCandles = recentCandles.slice(rightRim.index);
  const handleHighs = findSwingPoints(handleCandles, 2).filter(p => p.type === 'swing_high');
  
  let confidence = 65;
  
  // Ideal cup has rounded U shape
  if (depthRatio > 0.15 && depthRatio < 0.35) confidence += 15;
  else if (depthRatio >= 0.10 && depthRatio <= 0.50) confidence += 10;
  
  // Handle should retrace less than 50% of cup
  if (handleCandles.length > 5) {
    const handleStartPrice = handleCandles[0].close;
    const handleEndPrice = handleCandles[handleCandles.length - 1].close;
    const handleRetracement = (handleStartPrice - handleEndPrice) / cupDepth;
    
    if (handleRetracement < 0.5) confidence += 15;
    else if (handleRetracement < 0.7) confidence += 10;
  }
  
  const lastCandle = candles[candles.length - 1];
  
  return {
    pattern: {
      id: `cup_and_handle_${lastCandle.id}`,
      type: 'cup_and_handle' as PatternType,
      name: 'Cup and Handle',
      direction: 'bullish',
      strength: confidence > 85 ? 'strong' : confidence > 70 ? 'moderate' : 'weak',
      confidence,
      symbol: candles[0].symbol,
      timeframe: candles[0].timeframe,
      startTime: recentCandles[0].timestamp,
      endTime: lastCandle.timestamp,
      priceTargets: {
        resistance: rimAvg + cupDepth,
        support: cupBottom.price,
      },
    },
    confidence,
    formed: confidence > 80,
  };
}

// Parallel Channel
export function detectChannel(candles: Candle[]): ChartPatternResult {
  if (candles.length < 20) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const recentCandles = candles.slice(-20);
  const swingPoints = findSwingPoints(recentCandles, 3);
  
  if (swingPoints.length < 4) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const highs = swingPoints.filter(p => p.type === 'swing_high').map(p => p.price);
  const lows = swingPoints.filter(p => p.type === 'swing_low').map(p => p.price);
  
  if (highs.length < 2 || lows.length < 2) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const highTrend = calculateTrendLine(highs);
  const lowTrend = calculateTrendLine(lows);
  
  // Check for parallel lines (similar slopes)
  const slopeDiff = Math.abs(highTrend.slope - lowTrend.slope);
  const avgSlope = (Math.abs(highTrend.slope) + Math.abs(lowTrend.slope)) / 2;
  
  // Lines are parallel if slope difference is small relative to slope
  if (avgSlope > 0.0001 && slopeDiff / avgSlope > 0.5) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Lines are parallel if both slopes are nearly zero (horizontal channel)
  if (avgSlope <= 0.0001 && slopeDiff > 0.0001) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  let confidence = 55;
  
  // Determine direction
  let direction: PatternDirection;
  if (highTrend.slope > 0.0001) direction = 'bullish';
  else if (highTrend.slope < -0.0001) direction = 'bearish';
  else direction = 'neutral';
  
  // Higher confidence if more touch points
  if (highs.length >= 3) confidence += 15;
  else confidence += 5;
  
  if (lows.length >= 3) confidence += 15;
  else confidence += 5;
  
  // Check if price is near boundaries
  const lastCandle = candles[candles.length - 1];
  const upperBoundary = highTrend.slope * (highs.length - 1) + highTrend.intercept;
  const lowerBoundary = lowTrend.slope * (lows.length - 1) + lowTrend.intercept;
  
  const pricePosition = (lastCandle.close - lowerBoundary) / (upperBoundary - lowerBoundary);
  
  if (pricePosition > 0.3 && pricePosition < 0.7) confidence += 10;
  
  return {
    pattern: {
      id: `channel_${lastCandle.id}`,
      type: 'channel' as PatternType,
      name: 'Parallel Channel',
      direction,
      strength: confidence > 80 ? 'strong' : confidence > 60 ? 'moderate' : 'weak',
      confidence,
      symbol: candles[0].symbol,
      timeframe: candles[0].timeframe,
      startTime: recentCandles[0].timestamp,
      endTime: lastCandle.timestamp,
      priceTargets: {
        resistance: upperBoundary,
        support: lowerBoundary,
      },
    },
    confidence,
    formed: confidence > 70,
    priceTargets: {
      resistance: upperBoundary,
      support: lowerBoundary,
    },
  };
}

// Calculate support and resistance levels
export function calculateSupportResistance(candles: Candle[]): {
  support: number[];
  resistance: number[];
} {
  const swingPoints = findSwingPoints(candles, 5);
  
  const supports: number[] = [];
  const resistances: number[] = [];
  
  for (const point of swingPoints) {
    if (point.type === 'swing_high') {
      resistances.push(point.price);
    } else {
      supports.push(point.price);
    }
  }
  
  // Sort and group nearby levels
  const tolerance = candles[candles.length - 1].close * 0.005; // 0.5%
  
  const groupedSupports = groupPriceLevels(supports, tolerance);
  const groupedResistances = groupPriceLevels(resistances, tolerance);
  
  // Return top 3 levels by strength
  return {
    support: groupedSupports.slice(0, 3).map(g => g.level),
    resistance: groupedResistances.slice(0, 3).map(g => g.level),
  };
}

// Group nearby price levels
function groupPriceLevels(levels: number[], tolerance: number): { level: number; count: number }[] {
  if (levels.length === 0) return [];
  
  const sorted = [...levels].sort((a, b) => a - b);
  const groups: { level: number; count: number }[] = [];
  
  let currentGroup = { level: sorted[0], count: 1 };
  
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i] - currentGroup.level) <= tolerance) {
      currentGroup.level = (currentGroup.level * currentGroup.count + sorted[i]) / (currentGroup.count + 1);
      currentGroup.count++;
    } else {
      groups.push(currentGroup);
      currentGroup = { level: sorted[i], count: 1 };
    }
  }
  
  groups.push(currentGroup);
  
  // Sort by strength (count)
  return groups.sort((a, b) => b.count - a.count);
}
