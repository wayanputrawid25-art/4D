// Trend Engine - Multi-Timeframe Trend Analysis
import type { Candle, Timeframe } from '@forexos/types';
import { ema } from '../indicators/trend';
import { adx } from '../indicators/momentum';
import { type TrendAnalysis, type TrendDirection, type TrendPhase, type TrendStrength, type TrendSignal, type TrendConfluence, type TrendOptions, type MultiTimeframeTrend, type TrendSummary, type PriceChannel } from './types';

/**
 * Analyze trend for a given set of candles
 */
export function analyzeTrend(
  candles: Candle[],
  options: TrendOptions = {}
): TrendAnalysis {
  const {
    lookbackPeriod = 50,
    minADX = 25,
  } = options;

  const recentCandles = candles.slice(-lookbackPeriod);
  
  if (recentCandles.length < 10) {
    return createNeutralAnalysis(candles);
  }

  // Calculate EMAs for trend direction
  const ema20 = ema(candles, 20);
  const ema50 = ema(candles, 50);
  const ema200 = ema(candles, 200);
  
  const currentEMA20 = ema20.values[ema20.values.length - 1];
  const currentEMA50 = ema50.values[ema50.values.length - 1];
  const currentEMA200 = ema200.values[ema200.values.length - 1];
  
  // Calculate ADX for trend strength
  const adxResult = adx(candles, 14);
  const currentADX = adxResult.values[adxResult.values.length - 1] || 0;
  
  // Calculate price change
  const firstCandle = recentCandles[0];
  const lastCandle = recentCandles[recentCandles.length - 1];
  const startPrice = firstCandle.close;
  const currentPrice = lastCandle.close;
  const changePercent = ((currentPrice - startPrice) / startPrice) * 100;
  
  // Calculate slope (linear regression)
  const slope = calculateSlope(recentCandles.map(c => c.close));
  const slopePercent = (slope / startPrice) * 100;
  
  // Calculate volatility
  const volatility = calculateVolatility(recentCandles);
  
  // Calculate momentum
  const momentum = calculateMomentum(candles);
  
  // Determine direction
  const direction = determineDirection(
    currentPrice,
    currentEMA20,
    currentEMA50,
    currentEMA200,
    slopePercent
  );
  
  // Determine strength
  const strengthScore = calculateStrengthScore(currentADX, direction, volatility);
  const strength = determineStrength(strengthScore);
  
  // Determine phase
  const phase = determinePhase(candles, direction, momentum);
  
  return {
    direction,
    strength,
    strengthScore,
    phase,
    adx: currentADX,
    slope,
    slopePercent,
    currentPrice,
    startPrice,
    changePercent,
    volatility,
    momentum,
    timeframe: candles[0].timeframe,
    symbol: candles[0].symbol,
    startTime: firstCandle.timestamp,
    endTime: lastCandle.timestamp,
    duration: recentCandles.length,
  };
}

/**
 * Determine trend direction
 */
function determineDirection(
  price: number,
  ema20: number,
  ema50: number,
  ema200: number,
  slopePercent: number
): TrendDirection {
  if (isNaN(ema20) || isNaN(ema50)) {
    return 'neutral';
  }
  
  // Count how many MAs confirm direction
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  if (price > ema20) bullishSignals++;
  else if (price < ema20) bearishSignals++;
  
  if (price > ema50) bullishSignals++;
  else if (price < ema50) bearishSignals++;
  
  if (!isNaN(ema200)) {
    if (price > ema200) bullishSignals++;
    else if (price < ema200) bearishSignals++;
  }
  
  if (ema20 > ema50) bullishSignals++;
  else if (ema20 < ema50) bearishSignals++;
  
  if (!isNaN(ema200) && !isNaN(ema50)) {
    if (ema50 > ema200) bullishSignals++;
    else if (ema50 < ema200) bearishSignals++;
  }
  
  // Slope also confirms direction
  if (slopePercent > 0.1) bullishSignals++;
  else if (slopePercent < -0.1) bearishSignals++;
  
  // Determine direction based on signals
  if (bullishSignals >= 4) return 'bullish';
  if (bearishSignals >= 4) return 'bearish';
  
  // Check if ranging (not enough alignment)
  const totalSignals = bullishSignals + bearishSignals;
  if (totalSignals <= 3) return 'ranging';
  
  return 'neutral';
}

/**
 * Calculate strength score (0-100)
 */
function calculateStrengthScore(
  adx: number,
  direction: TrendDirection,
  volatility: number
): number {
  if (direction === 'neutral' || direction === 'ranging') {
    return Math.max(0, 100 - adx);
  }
  
  // ADX contributes 60% to strength
  const adxScore = Math.min(adx, 100) * 0.6;
  
  // Direction consistency contributes 40%
  const directionScore = direction !== 'neutral' ? 40 : 0;
  
  return Math.round(adxScore + directionScore);
}

/**
 * Determine trend strength classification
 */
function determineStrength(score: number): TrendStrength {
  if (score >= 70) return 'strong';
  if (score >= 40) return 'moderate';
  return 'weak';
}

/**
 * Determine trend phase
 */
function determinePhase(
  candles: Candle[],
  direction: TrendDirection,
  momentum: number
): TrendPhase {
  if (direction === 'neutral' || direction === 'ranging') {
    return 'weakening';
  }
  
  // Get recent price action
  const recentPrices = candles.slice(-20).map(c => c.close);
  const slopes = [];
  
  for (let i = 1; i < recentPrices.length; i++) {
    slopes.push(recentPrices[i] - recentPrices[i - 1]);
  }
  
  const avgSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length;
  const recentSlope = slopes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  
  // Early trend: slope increasing
  if (recentSlope > avgSlope * 1.2) return 'early';
  
  // Weakening: slope decreasing or momentum negative
  if (recentSlope < avgSlope * 0.5 || momentum < -20) return 'weakening';
  
  // Reversal: momentum strongly opposite to direction
  if (direction === 'bullish' && momentum < -30) return 'reversal';
  if (direction === 'bearish' && momentum > 30) return 'reversal';
  
  return 'mature';
}

/**
 * Calculate linear regression slope
 */
function calculateSlope(values: number[]): number {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const indices = values.map((_, i) => i);
  
  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  return isNaN(slope) ? 0 : slope;
}

/**
 * Calculate price volatility
 */
function calculateVolatility(candles: Candle[]): number {
  if (candles.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < candles.length; i++) {
    returns.push(Math.abs(candles[i].close - candles[i - 1].close) / candles[i - 1].close);
  }
  
  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;
  
  return Math.sqrt(variance) * 100; // As percentage
}

/**
 * Calculate momentum (-100 to 100)
 */
function calculateMomentum(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 0;
  
  const current = candles[candles.length - 1].close;
  const previous = candles[candles.length - period - 1].close;
  
  const change = ((current - previous) / previous) * 100;
  
  // Normalize to -100 to 100 range
  return Math.max(-100, Math.min(100, change * 10));
}

/**
 * Create neutral analysis for insufficient data
 */
function createNeutralAnalysis(candles: Candle[]): TrendAnalysis {
  return {
    direction: 'neutral',
    strength: 'weak',
    strengthScore: 0,
    phase: 'weakening',
    adx: 0,
    slope: 0,
    slopePercent: 0,
    currentPrice: candles[candles.length - 1]?.close || 0,
    startPrice: candles[0]?.close || 0,
    changePercent: 0,
    volatility: 0,
    momentum: 0,
    timeframe: candles[0]?.timeframe || 'H1',
    symbol: candles[0]?.symbol || '',
    startTime: candles[0]?.timestamp || Date.now(),
    endTime: candles[candles.length - 1]?.timestamp || Date.now(),
    duration: candles.length,
  };
}

/**
 * Multi-timeframe trend analysis
 */
export function analyzeMultiTimeframeTrend(
  candles: Candle[],
  options: TrendOptions = {}
): MultiTimeframeTrend {
  const {
    multiTimeframe = true,
  } = options;
  
  if (!multiTimeframe) {
    const primary = analyzeTrend(candles, options);
    return {
      primary,
      higher: null,
      lower: null,
      alignment: 'neutral',
      alignmentScore: 0,
      signals: [],
    };
  }
  
  // Determine timeframe
  const tf = candles[0].timeframe;
  const higherTf = getHigherTimeframe(tf);
  const lowerTf = getLowerTimeframe(tf);
  
  // For demo, we'll aggregate candles to simulate different timeframes
  // In production, you'd fetch actual data for each timeframe
  const primaryCandles = candles;
  const higherCandles = aggregateToTimeframe(candles, higherTf);
  const lowerCandles = aggregateToTimeframe(candles, lowerTf as Timeframe);
  
  const primary = analyzeTrend(primaryCandles, options);
  const higher = higherCandles.length >= 10 ? analyzeTrend(higherCandles, options) : null;
  const lower = lowerCandles.length >= 10 ? analyzeTrend(lowerCandles, options) : null;
  
  // Calculate alignment
  const { alignment, alignmentScore, signals } = calculateAlignment(primary, higher, lower);
  
  return {
    primary,
    higher,
    lower,
    alignment,
    alignmentScore,
    signals,
  };
}

/**
 * Get higher timeframe
 */
function getHigherTimeframe(tf: Timeframe): Timeframe {
  const timeframes: Timeframe[] = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];
  const index = timeframes.indexOf(tf);
  return index < timeframes.length - 1 ? timeframes[index + 1] : 'W1';
}

/**
 * Get lower timeframe
 */
function getLowerTimeframe(tf: Timeframe): Timeframe {
  const timeframes: Timeframe[] = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];
  const index = timeframes.indexOf(tf);
  return index > 0 ? timeframes[index - 1] : 'M1';
}

/**
 * Aggregate candles to a higher timeframe
 */
function aggregateToTimeframe(candles: Candle[], targetTf: Timeframe): Candle[] {
  // Simple aggregation: take every Nth candle
  const tfMinutes: Record<Timeframe, number> = {
    M1: 1, M5: 5, M15: 15, M30: 30, H1: 60, H4: 240, D1: 1440, W1: 10080,
  };
  
  const candleTf = candles[0]?.timeframe || 'H1';
  const ratio = tfMinutes[targetTf] / tfMinutes[candleTf];
  
  if (ratio <= 1) return candles;
  
  // Take every Nth candle
  const aggregated: Candle[] = [];
  for (let i = 0; i < candles.length; i += Math.floor(ratio)) {
    if (i < candles.length) {
      aggregated.push(candles[i]);
    }
  }
  
  return aggregated;
}

/**
 * Calculate alignment between timeframes
 */
function calculateAlignment(
  primary: TrendAnalysis,
  higher: TrendAnalysis | null,
  lower: TrendAnalysis | null
): { alignment: string; alignmentScore: number; signals: string[] } {
  const signals: string[] = [];
  let bullishCount = 0;
  let bearishCount = 0;
  
  // Count directions
  if (primary.direction === 'bullish') bullishCount += 2;
  else if (primary.direction === 'bearish') bearishCount += 2;
  
  if (higher && higher.direction === 'bullish') bullishCount++;
  else if (higher && higher.direction === 'bearish') bearishCount++;
  
  if (lower && lower.direction === 'bullish') bullishCount++;
  else if (lower && lower.direction === 'bearish') bearishCount++;
  
  // Calculate alignment score
  const total = bullishCount + bearishCount;
  let alignmentScore = 0;
  let alignment: string;
  
  if (total === 0) {
    alignment = 'neutral';
    alignmentScore = 50;
  } else if (bullishCount === bearishCount) {
    alignment = 'neutral';
    alignmentScore = 50;
  } else if (bullishCount > bearishCount) {
    alignment = 'aligned';
    alignmentScore = (bullishCount / (bullishCount + bearishCount)) * 100;
    signals.push(`Bullish alignment across ${bullishCount} timeframes`);
  } else {
    alignment = 'conflicting';
    alignmentScore = (bearishCount / (bullishCount + bearishCount)) * 100;
    signals.push(`Bearish alignment across ${bearishCount} timeframes`);
  }
  
  // Add specific signals
  if (higher && primary.direction === higher.direction) {
    signals.push(`Higher TF confirms ${primary.direction} trend`);
  } else if (higher && primary.direction !== higher.direction) {
    signals.push(`Warning: Higher TF ${higher.direction}, primary TF ${primary.direction}`);
  }
  
  if (lower && primary.direction === lower.direction) {
    signals.push(`Lower TF confirms ${primary.direction} trend`);
  }
  
  return { alignment, alignmentScore, signals };
}

/**
 * Detect trend signals (crossovers, breakouts, etc.)
 */
export function detectTrendSignals(
  candles: Candle[],
  options: TrendOptions = {}
): TrendSignal[] {
  const signals: TrendSignal[] = [];
  
  if (candles.length < 50) return signals;
  
  // Calculate EMAs
  const ema20 = ema(candles, 20);
  const ema50 = ema(candles, 50);
  
  const values20 = ema20.values;
  const values50 = ema50.values;
  
  // Detect EMA crossover
  for (let i = 2; i < values20.length; i++) {
    const prev20 = values20[i - 1];
    const curr20 = values20[i];
    const prev50 = values50[i - 1];
    const curr50 = values50[i];
    
    if (isNaN(prev20) || isNaN(curr20) || isNaN(prev50) || isNaN(curr50)) continue;
    
    // Bullish crossover: EMA20 crosses above EMA50
    if (prev20 <= prev50 && curr20 > curr50) {
      signals.push({
        type: 'crossover',
        direction: 'bullish',
        strength: 70,
        description: 'EMA20 crossed above EMA50 (Golden Cross)',
        price: candles[i].close,
        timestamp: candles[i].timestamp,
      });
    }
    
    // Bearish crossover: EMA20 crosses below EMA50
    if (prev20 >= prev50 && curr20 < curr50) {
      signals.push({
        type: 'crossover',
        direction: 'bearish',
        strength: 70,
        description: 'EMA20 crossed below EMA50 (Death Cross)',
        price: candles[i].close,
        timestamp: candles[i].timestamp,
      });
    }
  }
  
  // Detect price breakout
  const trend = analyzeTrend(candles, options);
  const recentHighs = candles.slice(-20).map(c => c.high);
  const recentLows = candles.slice(-20).map(c => c.low);
  const maxHigh = Math.max(...recentHighs);
  const minLow = Math.min(...recentLows);
  
  const currentPrice = candles[candles.length - 1].close;
  
  if (currentPrice > maxHigh && trend.direction === 'bullish') {
    signals.push({
      type: 'breakout',
      direction: 'bullish',
      strength: 80,
      description: 'Price breakout above recent high',
      price: maxHigh,
      timestamp: Date.now(),
    });
  }
  
  if (currentPrice < minLow && trend.direction === 'bearish') {
    signals.push({
      type: 'breakout',
      direction: 'bearish',
      strength: 80,
      description: 'Price breakdown below recent low',
      price: minLow,
      timestamp: Date.now(),
    });
  }
  
  return signals;
}

/**
 * Calculate price channel
 */
export function calculatePriceChannel(candles: Candle[]): PriceChannel | null {
  if (candles.length < 20) return null;
  
  const swingPoints = findSwingPoints(candles, 5);
  
  if (swingPoints.length < 4) return null;
  
  const highs = swingPoints.filter(p => p.type === 'swing_high').map(p => p.price);
  const lows = swingPoints.filter(p => p.type === 'swing_low').map(p => p.price);
  
  if (highs.length < 2 || lows.length < 2) return null;
  
  const highTrend = calculateTrendLine(highs);
  const lowTrend = calculateTrendLine(lows);
  
  const currentPrice = candles[candles.length - 1].close;
  
  // Calculate channel width
  const upperPrice = highTrend.slope * (highs.length - 1) + highTrend.intercept;
  const lowerPrice = lowTrend.slope * (lows.length - 1) + lowTrend.intercept;
  const width = upperPrice - lowerPrice;
  const widthPercent = (width / currentPrice) * 100;
  
  // Check if price is contained
  const contained = currentPrice >= lowerPrice && currentPrice <= upperPrice;
  
  return {
    upper: {
      type: 'resistance',
      slope: highTrend.slope,
      intercept: highTrend.intercept,
      touchPoints: highs.length,
      currentDistance: upperPrice - currentPrice,
      valid: highs.length >= 3,
    },
    lower: {
      type: 'support',
      slope: lowTrend.slope,
      intercept: lowTrend.intercept,
      touchPoints: lows.length,
      currentDistance: currentPrice - lowerPrice,
      valid: lows.length >= 3,
    },
    middle: (upperPrice + lowerPrice) / 2,
    width,
    widthPercent,
    contained,
  };
}

/**
 * Find swing points
 */
function findSwingPoints(candles: Candle[], lookback: number = 5): { type: 'swing_high' | 'swing_low'; price: number }[] {
  const points: { type: 'swing_high' | 'swing_low'; price: number }[] = [];
  
  for (let i = lookback; i < candles.length - lookback; i++) {
    const current = candles[i];
    const prevCandles = candles.slice(i - lookback, i);
    const nextCandles = candles.slice(i + 1, i + lookback + 1);
    
    const isSwingHigh = prevCandles.every(c => c.high <= current.high) &&
                        nextCandles.every(c => c.high <= current.high);
    
    const isSwingLow = prevCandles.every(c => c.low >= current.low) &&
                       nextCandles.every(c => c.low >= current.low);
    
    if (isSwingHigh) {
      points.push({ type: 'swing_high', price: current.high });
    }
    
    if (isSwingLow) {
      points.push({ type: 'swing_low', price: current.low });
    }
  }
  
  return points;
}

/**
 * Calculate trend line
 */
function calculateTrendLine(values: number[]): { slope: number; intercept: number } {
  return { slope: calculateSlope(values), intercept: values[0] || 0 };
}

/**
 * Generate comprehensive trend summary
 */
export function generateTrendSummary(
  candles: Candle[],
  options: TrendOptions = {}
): TrendSummary {
  const trend = analyzeTrend(candles, options);
  const mtfTrend = analyzeMultiTimeframeTrend(candles, options);
  const signals = detectTrendSignals(candles, options);
  
  // Calculate confluences
  const confluences = calculateConfluences(candles, trend);
  
  return {
    primary: trend,
    multiTimeframe: mtfTrend,
    signals,
    confluences,
    timestamp: Date.now(),
  };
}

/**
 * Calculate indicator confluences
 */
function calculateConfluences(
  candles: Candle[],
  trend: TrendAnalysis
): TrendConfluence[] {
  const confluences: TrendConfluence[] = [];
  
  // EMA confluence
  const ema20 = ema(candles, 20).values;
  const ema50 = ema(candles, 50).values;
  const currentPrice = candles[candles.length - 1].close;
  
  if (!isNaN(ema20[ema20.length - 1]) && !isNaN(ema50[ema50.length - 1])) {
    const emaConfluence: TrendConfluence = {
      indicator: 'EMA_Cross',
      direction: currentPrice > ema20[ema20.length - 1] ? 'bullish' : 'bearish',
      score: currentPrice > ema20[ema20.length - 1] && ema20[ema20.length - 1] > ema50[ema50.length - 1] ? 80 : 40,
      weight: 0.3,
    };
    confluences.push(emaConfluence);
  }
  
  // ADX strength
  confluences.push({
    indicator: 'ADX',
    direction: trend.adx > 25 ? (trend.direction === 'bullish' ? 'bullish' : trend.direction === 'bearish' ? 'bearish' : 'neutral') : 'neutral',
    score: Math.min(trend.adx, 100),
    weight: 0.2,
  });
  
  return confluences;
}
