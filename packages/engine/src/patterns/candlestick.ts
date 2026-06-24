// Candlestick Pattern Detector
import type { Candle } from '@forexos/types';
import type { 
  Pattern, 
  PatternSignal, 
  PatternDirection, 
  PatternStrength,
  PatternType,
  CandleIndicators
} from './types';

export interface CandlestickPatternResult {
  pattern: Pattern | null;
  confidence: number;
  formed: boolean;
}

// Calculate candle indicators
export function calculateIndicators(candle: Candle): CandleIndicators {
  const body = Math.abs(candle.close - candle.open);
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  const totalRange = candle.high - candle.low;
  
  const bodyToWickRatio = totalRange > 0 ? body / totalRange : 0;
  const isBullish = candle.close > candle.open;
  const isDoji = body < totalRange * 0.1;
  
  // Hammer: small body at top, long lower wick (2x body), short upper wick
  const isHammer = lowerWick > body * 2 && upperWick < body * 0.5 && body > 0;
  
  return {
    body,
    upperWick,
    lowerWick,
    bodyToWickRatio,
    isBullish,
    isDoji,
    isHammer,
  };
}

// Check if pattern is bullish
function isBullish(candle: Candle): boolean {
  return candle.close > candle.open;
}

// Check if pattern is bearish
function isBearish(candle: Candle): boolean {
  return candle.close < candle.open;
}

// Doji Pattern
export function detectDoji(candle: Candle): CandlestickPatternResult {
  const { body, upperWick, lowerWick, isDoji } = calculateIndicators(candle);
  const totalRange = candle.high - candle.low;
  
  if (!isDoji || totalRange === 0) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const wickBalance = Math.abs(upperWick - lowerWick) / totalRange;
  let confidence = 50;
  
  // Higher confidence if wicks are balanced
  if (wickBalance < 0.2) confidence += 30;
  else if (wickBalance < 0.4) confidence += 15;
  
  // Higher confidence if body is very small
  if (body / totalRange < 0.05) confidence += 20;
  
  return {
    pattern: {
      id: `doji_${candle.id}`,
      type: 'doji',
      name: 'Doji',
      direction: 'neutral' as PatternDirection,
      strength: confidence > 80 ? 'strong' as PatternStrength : 
                confidence > 60 ? 'moderate' as PatternStrength : 'weak' as PatternStrength,
      confidence,
      symbol: candle.symbol,
      timeframe: candle.timeframe,
      startTime: candle.timestamp,
      endTime: candle.timestamp,
    },
    confidence,
    formed: true,
  };
}

// Hammer / Inverted Hammer
export function detectHammer(candles: Candle[]): CandlestickPatternResult {
  if (candles.length < 1) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const candle = candles[candles.length - 1];
  const { body, upperWick, lowerWick, isBullish } = calculateIndicators(candle);
  const range = candle.high - candle.low;
  
  if (range === 0 || body === 0) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const isHammerPattern = 
    lowerWick >= body * 2 && 
    upperWick < body * 0.3 &&
    body < range * 0.4;
    
  const isInvertedHammer = 
    upperWick >= body * 2 && 
    lowerWick < body * 0.3 &&
    body < range * 0.4;
  
  if (!isHammerPattern && !isInvertedHammer) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const isBullishHammer = isHammerPattern && isBullish;
  const isBearishInverted = isInvertedHammer && !isBullish;
  
  if (!isBullishHammer && !isBearishInverted) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  let confidence = 60;
  
  // Lower wick should be at least 2x body
  const lowerWickRatio = isHammerPattern ? lowerWick / body : upperWick / body;
  if (lowerWickRatio >= 3) confidence += 20;
  else if (lowerWickRatio >= 2) confidence += 10;
  
  // Body should be small relative to range
  if (body / range < 0.2) confidence += 10;
  
  const type: PatternType = isHammerPattern ? 'hammer' : 'inverted_hammer';
  const direction: PatternDirection = isHammerPattern ? 'bullish' : 'bearish';
  const name: string = isHammerPattern ? 'Hammer' : 'Inverted Hammer';
  
  return {
    pattern: {
      id: `${type}_${candle.id}`,
      type,
      name,
      direction,
      strength: confidence > 80 ? 'strong' : confidence > 60 ? 'moderate' : 'weak',
      confidence,
      symbol: candle.symbol,
      timeframe: candle.timeframe,
      startTime: candle.timestamp,
      endTime: candle.timestamp,
    },
    confidence,
    formed: true,
  };
}

// Bullish / Bearish Engulfing
export function detectEngulfing(candles: Candle[]): CandlestickPatternResult {
  if (candles.length < 2) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];
  
  const prevBodyTop = Math.max(prev.open, prev.close);
  const prevBodyBottom = Math.min(prev.open, prev.close);
  const currBodyTop = Math.max(curr.open, curr.close);
  const currBodyBottom = Math.min(curr.open, curr.close);
  
  const prevBullish = isBullish(prev);
  const currBullish = isBullish(curr);
  
  // Bullish Engulfing: Bearish first, then bullish engulfs
  const bullishEngulfing = 
    !prevBullish && // First candle is bearish
    currBullish && // Second candle is bullish
    currBodyBottom <= prevBodyBottom && // Opens at or below previous low
    currBodyTop >= prevBodyTop; // Closes above previous high
  
  // Bearish Engulfing: Bullish first, then bearish engulfs
  const bearishEngulfing = 
    prevBullish && // First candle is bullish
    !currBullish && // Second candle is bearish
    currBodyTop >= prevBodyTop && // Opens at or above previous high
    currBodyBottom <= prevBodyBottom; // Closes below previous low
  
  if (!bullishEngulfing && !bearishEngulfing) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  let confidence = 70;
  
  // Stronger if current body is much larger
  const prevBodySize = Math.abs(prev.close - prev.open);
  const currBodySize = Math.abs(curr.close - curr.open);
  if (currBodySize > prevBodySize * 1.5) confidence += 15;
  if (currBodySize > prevBodySize * 2) confidence += 10;
  
  // Stronger if engulfing is complete
  if (bullishEngulfing) {
    if (currBodyBottom < prevBodyBottom && currBodyTop > prevBodyTop) confidence += 5;
  } else {
    if (currBodyTop > prevBodyTop && currBodyBottom < prevBodyBottom) confidence += 5;
  }
  
  return {
    pattern: {
      id: `${bullishEngulfing ? 'bullish' : 'bearish'}_engulfing_${curr.id}`,
      type: bullishEngulfing ? 'bullish_engulfing' : 'bearish_engulfing',
      name: bullishEngulfing ? 'Bullish Engulfing' : 'Bearish Engulfing',
      direction: bullishEngulfing ? 'bullish' : 'bearish',
      strength: confidence > 85 ? 'strong' : confidence > 70 ? 'moderate' : 'weak',
      confidence,
      symbol: curr.symbol,
      timeframe: curr.timeframe,
      startTime: prev.timestamp,
      endTime: curr.timestamp,
    },
    confidence,
    formed: true,
  };
}

// Morning Star / Evening Star (3-candle pattern)
export function detectStar(candles: Candle[]): CandlestickPatternResult {
  if (candles.length < 3) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const first = candles[candles.length - 3];
  const second = candles[candles.length - 2];
  const third = candles[candles.length - 1];
  
  const firstBody = Math.abs(first.close - first.open);
  const secondBody = Math.abs(second.close - second.open);
  const thirdBody = Math.abs(third.close - third.open);
  
  const firstBullish = isBullish(first);
  const secondBullish = isBullish(second);
  const thirdBullish = isBullish(third);
  
  // Morning Star: Large bearish, small body, large bullish
  const morningStar = 
    !firstBullish && firstBody > (first.high - first.low) * 0.6 && // First is bearish
    Math.abs(second.close - second.open) < firstBody * 0.3 && // Second is small
    thirdBullish && thirdBody > (third.high - third.low) * 0.6 && // Third is bullish
    third.close > (first.open + first.close) / 2; // Third closes above midpoint
  
  // Evening Star: Large bullish, small body, large bearish
  const eveningStar = 
    firstBullish && firstBody > (first.high - first.low) * 0.6 && // First is bullish
    Math.abs(second.close - second.open) < firstBody * 0.3 && // Second is small
    !thirdBullish && thirdBody > (third.high - third.low) * 0.6 && // Third is bearish
    third.close < (first.open + first.close) / 2; // Third closes below midpoint
  
  if (!morningStar && !eveningStar) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  let confidence = 75;
  
  // Stronger if gap exists
  if (morningStar) {
    const gap = secondBody > 0 ? 
      (Math.min(first.close, second.open) - Math.max(first.open, second.close)) > 0 :
      second.low > first.high;
    if (gap) confidence += 10;
  } else {
    const gap = secondBody > 0 ?
      (Math.max(first.close, second.open) - Math.min(first.open, second.close)) > 0 :
      second.high < first.low;
    if (gap) confidence += 10;
  }
  
  return {
    pattern: {
      id: `${morningStar ? 'morning' : 'evening'}_star_${third.id}`,
      type: morningStar ? 'morning_star' : 'evening_star',
      name: morningStar ? 'Morning Star' : 'Evening Star',
      direction: morningStar ? 'bullish' : 'bearish',
      strength: confidence > 85 ? 'strong' : confidence > 75 ? 'moderate' : 'weak',
      confidence,
      symbol: third.symbol,
      timeframe: third.timeframe,
      startTime: first.timestamp,
      endTime: third.timestamp,
    },
    confidence,
    formed: true,
  };
}

// Piercing Line / Dark Cloud Cover
export function detectPiercingLine(candles: Candle[]): CandlestickPatternResult {
  if (candles.length < 2) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const first = candles[candles.length - 2];
  const second = candles[candles.length - 1];
  
  const firstBullish = isBullish(first);
  const secondBullish = isBullish(second);
  
  const firstMidpoint = (first.open + first.close) / 2;
  
  // Piercing Line: Bearish then bullish opens below, closes above midpoint
  const piercingLine = 
    !firstBullish && // First is bearish
    secondBullish && // Second is bullish
    second.open < first.close && // Opens below previous close
    second.close > firstMidpoint && // Closes above midpoint
    second.close < first.open; // But not above previous open
  
  // Dark Cloud Cover: Bullish then bearish opens above, closes below midpoint
  const darkCloudCover = 
    firstBullish && // First is bullish
    !secondBullish && // Second is bearish
    second.open > first.close && // Opens above previous close
    second.close < firstMidpoint && // Closes below midpoint
    second.close > first.open; // But not below previous open
  
  if (!piercingLine && !darkCloudCover) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  let confidence = 65;
  
  // Stronger if second candle has strong close
  const penetrationDepth = Math.abs(second.close - firstMidpoint) / (first.high - first.low);
  if (penetrationDepth > 0.5) confidence += 20;
  else if (penetrationDepth > 0.3) confidence += 10;
  
  return {
    pattern: {
      id: `${piercingLine ? 'piercing' : 'dark_cloud'}_${second.id}`,
      type: piercingLine ? 'piercing_line' : 'dark_cloud_cover',
      name: piercingLine ? 'Piercing Line' : 'Dark Cloud Cover',
      direction: piercingLine ? 'bullish' : 'bearish',
      strength: confidence > 85 ? 'strong' : confidence > 70 ? 'moderate' : 'weak',
      confidence,
      symbol: second.symbol,
      timeframe: second.timeframe,
      startTime: first.timestamp,
      endTime: second.timestamp,
    },
    confidence,
    formed: true,
  };
}

// Shooting Star
export function detectShootingStar(candles: Candle[]): CandlestickPatternResult {
  if (candles.length < 1) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const candle = candles[candles.length - 1];
  const { upperWick, lowerWick, body, isBearish } = calculateIndicators(candle);
  const range = candle.high - candle.low;
  
  if (range === 0 || body === 0) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Shooting star: small body at bottom, long upper wick, bearish
  const isShootingStar = 
    upperWick >= body * 2 && 
    lowerWick < body * 0.3 &&
    !isBearish &&
    body < range * 0.4;
  
  if (!isShootingStar) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  let confidence = 60;
  
  // Upper wick should be dominant
  if (upperWick / range > 0.6) confidence += 20;
  else if (upperWick / range > 0.4) confidence += 10;
  
  // Body at bottom
  if ((candle.low + body) / candle.high > 0.8) confidence += 10;
  
  return {
    pattern: {
      id: `shooting_star_${candle.id}`,
      type: 'shooting_star',
      name: 'Shooting Star',
      direction: 'bearish',
      strength: confidence > 80 ? 'strong' : confidence > 60 ? 'moderate' : 'weak',
      confidence,
      symbol: candle.symbol,
      timeframe: candle.timeframe,
      startTime: candle.timestamp,
      endTime: candle.timestamp,
    },
    confidence,
    formed: true,
  };
}

// Spinning Top
export function detectSpinningTop(candles: Candle[]): CandlestickPatternResult {
  if (candles.length < 1) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const candle = candles[candles.length - 1];
  const { body, upperWick, lowerWick, isDoji } = calculateIndicators(candle);
  const range = candle.high - candle.low;
  
  if (range === 0) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Spinning top: small body, wicks larger than body
  const isSpinningTop = 
    body < range * 0.3 && 
    (upperWick > body * 2 || lowerWick > body * 2);
  
  if (!isSpinningTop) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  let confidence = 40; // Neutral pattern, lower base confidence
  
  // Balanced wicks are better
  const wickRatio = Math.min(upperWick, lowerWick) / Math.max(upperWick, lowerWick);
  if (wickRatio > 0.7) confidence += 20;
  else if (wickRatio > 0.4) confidence += 10;
  
  return {
    pattern: {
      id: `spinning_top_${candle.id}`,
      type: 'spinning_top',
      name: 'Spinning Top',
      direction: 'neutral',
      strength: 'weak',
      confidence,
      symbol: candle.symbol,
      timeframe: candle.timeframe,
      startTime: candle.timestamp,
      endTime: candle.timestamp,
    },
    confidence,
    formed: true,
  };
}

// Marubozu (Full Body Candle)
export function detectMarubozu(candles: Candle[]): CandlestickPatternResult {
  if (candles.length < 1) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  const candle = candles[candles.length - 1];
  const { body, upperWick, lowerWick } = calculateIndicators(candle);
  const range = candle.high - candle.low;
  
  if (range === 0) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  // Marubozu: body takes almost entire range
  const isBullishMarubozu = 
    body > range * 0.9 && 
    upperWick < range * 0.02 && 
    lowerWick < range * 0.02 &&
    candle.close > candle.open;
  
  const isBearishMarubozu = 
    body > range * 0.9 && 
    upperWick < range * 0.02 && 
    lowerWick < range * 0.02 &&
    candle.close < candle.open;
  
  if (!isBullishMarubozu && !isBearishMarubozu) {
    return { pattern: null, confidence: 0, formed: false };
  }
  
  let confidence = 75;
  
  // Stronger with no wicks at all
  if (upperWick === 0 && lowerWick === 0) confidence += 15;
  else if (body > range * 0.95) confidence += 10;
  
  return {
    pattern: {
      id: `marubozu_${candle.id}`,
      type: 'marubozu',
      name: isBullishMarubozu ? 'Bullish Marubozu' : 'Bearish Marubozu',
      direction: isBullishMarubozu ? 'bullish' : 'bearish',
      strength: confidence > 85 ? 'strong' : 'moderate',
      confidence,
      symbol: candle.symbol,
      timeframe: candle.timeframe,
      startTime: candle.timestamp,
      endTime: candle.timestamp,
    },
    confidence,
    formed: true,
  };
}

// Detect all candlestick patterns
export function detectAllCandlestickPatterns(candles: Candle[]): PatternSignal[] {
  const signals: PatternSignal[] = [];
  
  const detectors = [
    detectDoji,
    detectHammer,
    detectEngulfing,
    detectStar,
    detectPiercingLine,
    detectShootingStar,
    detectSpinningTop,
    detectMarubozu,
  ];
  
  for (const detector of detectors) {
    const result = detector(candles);
    if (result.pattern && result.confidence > 50) {
      signals.push({
        id: `signal_${result.pattern.type}_${Date.now()}`,
        pattern: result.pattern,
        candles: candles.slice(-3),
        formed: result.formed,
        timestamp: Date.now(),
      });
    }
  }
  
  return signals;
}
