// Trend Engine Types
import type { Candle, Timeframe } from '@forexos/types';

/**
 * Trend Direction
 */
export type TrendDirection = 'bullish' | 'bearish' | 'neutral' | 'ranging';

/**
 * Trend Phase (Lifecycle)
 */
export type TrendPhase = 'early' | 'mature' | 'weakening' | 'reversal';

/**
 * Trend Strength Classification
 */
export type TrendStrength = 'strong' | 'moderate' | 'weak';

/**
 * Trend Analysis Result
 */
export interface TrendAnalysis {
  direction: TrendDirection;
  strength: TrendStrength;
  strengthScore: number; // 0-100
  phase: TrendPhase;
  adx: number;
  slope: number; // Price change per bar
  slopePercent: number; // Percentage change per bar
  currentPrice: number;
  startPrice: number;
  changePercent: number;
  volatility: number;
  momentum: number; // -100 to 100
  timeframe: Timeframe;
  symbol: string;
  startTime: number;
  endTime: number;
  duration: number; // bars
}

/**
 * Multi-Timeframe Trend
 */
export interface MultiTimeframeTrend {
  primary: TrendAnalysis; // User's chosen timeframe
  higher: TrendAnalysis | null; // Next higher TF
  lower: TrendAnalysis | null; // Next lower TF
  alignment: 'aligned' | 'conflicting' | 'neutral';
  alignmentScore: number; // 0-100
  signals: string[]; // List of alignment signals
}

/**
 * Trend Signal
 */
export interface TrendSignal {
  type: 'crossover' | 'breakout' | 'reversal' | 'continuation' | 'divergence';
  direction: TrendDirection;
  strength: number;
  description: string;
  price?: number;
  timestamp: number;
}

/**
 * Trend Line
 */
export interface TrendLine {
  type: 'resistance' | 'support';
  slope: number;
  intercept: number;
  touchPoints: number;
  currentDistance: number; // Distance from current price
  valid: boolean;
}

/**
 * Price Channel
 */
export interface PriceChannel {
  upper: TrendLine;
  lower: TrendLine;
  middle: number; // Average of upper and lower
  width: number; // Distance between lines
  widthPercent: number; // Width as percentage of price
  contained: boolean; // Price within channel
}

/**
 * Trend Confluence
 */
export interface TrendConfluence {
  indicator: string;
  direction: TrendDirection;
  score: number;
  weight: number;
}

/**
 * Trend Summary
 */
export interface TrendSummary {
  primary: TrendAnalysis;
  multiTimeframe: MultiTimeframeTrend | null;
  signals: TrendSignal[];
  confluences: TrendConfluence[];
  timestamp: number;
}

/**
 * Trend Detection Options
 */
export interface TrendOptions {
  minADX?: number; // Minimum ADX for strong trend
  lookbackPeriod?: number;
  confirmWithVolume?: boolean;
  multiTimeframe?: boolean;
}
