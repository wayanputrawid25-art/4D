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
