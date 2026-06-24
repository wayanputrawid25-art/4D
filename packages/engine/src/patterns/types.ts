// Pattern Detection Types
import type { Candle, Timeframe } from '@forexos/types';

export type PatternType = 
  // Single Candlestick Patterns
  | 'doji'
  | 'hammer'
  | 'inverted_hammer'
  | 'bullish_engulfing'
  | 'bearish_engulfing'
  | 'morning_star'
  | 'evening_star'
  | 'piercing_line'
  | 'dark_cloud_cover'
  | 'harami'
  | 'shooting_star'
  | 'spinning_top'
  | 'marubozu'
  // Chart Patterns
  | 'head_and_shoulders'
  | 'inverse_head_and_shoulders'
  | 'double_top'
  | 'double_bottom'
  | 'triple_top'
  | 'triple_bottom'
  | 'ascending_triangle'
  | 'descending_triangle'
  | 'symmetrical_triangle'
  | 'rising_wedge'
  | 'falling_wedge'
  | 'bull_flag'
  | 'bear_flag'
  | 'pennant_bullish'
  | 'pennant_bearish';

export type PatternDirection = 'bullish' | 'bearish' | 'neutral';
export type PatternStrength = 'strong' | 'moderate' | 'weak';

export interface Pattern {
  id: string;
  type: PatternType;
  name: string;
  direction: PatternDirection;
  strength: PatternStrength;
  confidence: number; // 0-100
  symbol: string;
  timeframe: Timeframe;
  startTime: number;
  endTime: number;
  priceTargets?: {
    support?: number;
    resistance?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface PatternSignal {
  id: string;
  pattern: Pattern;
  candles: Candle[];
  formed: boolean; // True if pattern is complete
  currentPrice?: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskRewardRatio?: number;
  timestamp: number;
}

export interface PatternDetectionOptions {
  minConfidence?: number;
  timeframes?: Timeframe[];
  patternTypes?: PatternType[];
}

export interface DetectionResult {
  patterns: PatternSignal[];
  symbol: string;
  analyzedCandles: number;
  timestamp: number;
}

// Candlestick pattern indicators
export interface CandleIndicators {
  body: number;
  upperWick: number;
  lowerWick: number;
  bodyToWickRatio: number;
  isBullish: boolean;
  isDoji: boolean;
  isHammer: boolean;
}

// Support/Resistance levels
export interface SwingPoint {
  index: number;
  price: number;
  type: 'swing_high' | 'swing_low';
  strength: number;
}

// Pattern configuration
export interface PatternConfig {
  type: PatternType;
  name: string;
  direction: PatternDirection;
  minCandles: number;
  maxCandles: number;
  requiredStrength?: number;
}
