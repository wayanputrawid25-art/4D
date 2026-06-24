// Pattern Detection Service
import type { Candle, Timeframe } from '@forexos/types';
import type { 
  PatternSignal, 
  PatternDetectionOptions, 
  DetectionResult,
  PatternType,
  PatternDirection
} from './types';
import { 
  detectAllCandlestickPatterns 
} from './candlestick';
import { 
  detectAllChartPatterns 
} from './chart';

export class PatternDetectionService {
  private minConfidence: number = 50;
  private patternTypes?: PatternType[];

  constructor(options: PatternDetectionOptions = {}) {
    this.minConfidence = options.minConfidence ?? 50;
    this.patternTypes = options.patternTypes;
  }

  /**
   * Detect all patterns in candle data
   */
  detectPatterns(candles: Candle[]): PatternSignal[] {
    if (candles.length < 2) {
      return [];
    }

    const signals: PatternSignal[] = [];

    // Detect candlestick patterns
    if (this.shouldDetectPatternType('candlestick')) {
      const candleSignals = detectAllCandlestickPatterns(candles);
      signals.push(...candleSignals);
    }

    // Detect chart patterns (need more candles)
    if (candles.length >= 20 && this.shouldDetectPatternType('chart')) {
      const chartSignals = detectAllChartPatterns(candles);
      signals.push(...chartSignals);
    }

    // Filter by confidence
    const filteredSignals = signals.filter(
      s => s.pattern.confidence >= this.minConfidence
    );

    // Sort by confidence (highest first)
    return filteredSignals.sort((a, b) => b.pattern.confidence - a.pattern.confidence);
  }

  /**
   * Detect patterns for multiple timeframes
   */
  detectMultiTimeframe(
    candleSets: { candles: Candle[]; timeframe: Timeframe }[],
    options: PatternDetectionOptions = {}
  ): DetectionResult[] {
    const results: DetectionResult[] = [];

    for (const { candles, timeframe } of candleSets) {
      if (candles.length < 2) continue;

      const service = new PatternDetectionService({
        ...options,
        timeframes: [timeframe],
      });

      const patterns = service.detectPatterns(candles);
      
      if (patterns.length > 0) {
        results.push({
          patterns,
          symbol: candles[0].symbol,
          analyzedCandles: candles.length,
          timestamp: Date.now(),
        });
      }
    }

    return results;
  }

  /**
   * Get trading signals from patterns
   */
  generateSignals(signals: PatternSignal[]): TradingSignal[] {
    return signals
      .filter(s => s.pattern.direction !== 'neutral')
      .map(s => this.createTradingSignal(s));
  }

  /**
   * Create a trading signal from a pattern
   */
  private createTradingSignal(patternSignal: PatternSignal): TradingSignal {
    const { pattern, candles, formed } = patternSignal;
    const lastCandle = candles[candles.length - 1];
    
    const isBullish = pattern.direction === 'bullish';
    const isFormed = formed;
    
    // Calculate entry, stop loss, and take profit
    const atr = this.calculateATR(candles);
    const riskAmount = atr * 1.5;
    
    let entryPrice: number;
    let stopLoss: number;
    let takeProfit: number;
    
    if (isBullish) {
      entryPrice = lastCandle.close;
      stopLoss = entryPrice - riskAmount;
      takeProfit = entryPrice + riskAmount * 2; // 2:1 R:R
    } else {
      entryPrice = lastCandle.close;
      stopLoss = entryPrice + riskAmount;
      takeProfit = entryPrice - riskAmount * 2;
    }

    return {
      id: `trade_${pattern.id}`,
      patternType: pattern.type,
      patternName: pattern.name,
      direction: pattern.direction,
      confidence: pattern.confidence,
      strength: pattern.strength,
      entryPrice,
      stopLoss,
      takeProfit,
      riskRewardRatio: Math.abs(entryPrice - takeProfit) / Math.abs(entryPrice - stopLoss),
      formed,
      symbol: pattern.symbol,
      timeframe: pattern.timeframe,
      timestamp: Date.now(),
      metadata: pattern.metadata,
    };
  }

  /**
   * Calculate Average True Range
   */
  private calculateATR(candles: Candle[]): number {
    if (candles.length < 14) {
      return candles.length > 1 ? 
        Math.abs(candles[candles.length - 1].close - candles[0].open) / candles.length : 
        0;
    }

    const trueRanges: number[] = [];
    
    for (let i = 1; i < candles.length; i++) {
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      );
      trueRanges.push(tr);
    }

    // Use last 14 periods
    const recentTRs = trueRanges.slice(-14);
    return recentTRs.reduce((a, b) => a + b, 0) / recentTRs.length;
  }

  /**
   * Check if a pattern type should be detected
   */
  private shouldDetectPatternType(category: 'candlestick' | 'chart'): boolean {
    if (!this.patternTypes) return true;

    const categoryPatterns: PatternType[] = category === 'candlestick' ? [
      'doji', 'hammer', 'inverted_hammer', 'bullish_engulfing', 'bearish_engulfing',
      'morning_star', 'evening_star', 'piercing_line', 'dark_cloud_cover',
      'harami', 'shooting_star', 'spinning_top', 'marubozu'
    ] : [
      'head_and_shoulders', 'inverse_head_and_shoulders', 'double_top', 'double_bottom',
      'triple_top', 'triple_bottom', 'ascending_triangle', 'descending_triangle',
      'symmetrical_triangle', 'rising_wedge', 'falling_wedge', 'bull_flag', 'bear_flag'
    ];

    return this.patternTypes.some(t => categoryPatterns.includes(t));
  }

  /**
   * Analyze pattern confluence
   */
  analyzeConfluence(signals: PatternSignal[]): ConfluenceResult {
    const bullishSignals = signals.filter(s => s.pattern.direction === 'bullish');
    const bearishSignals = signals.filter(s => s.pattern.direction === 'bearish');
    
    const bullishStrength = bullishSignals.reduce((sum, s) => sum + s.pattern.confidence, 0);
    const bearishStrength = bearishSignals.reduce((sum, s) => sum + s.pattern.confidence, 0);
    
    const totalStrength = bullishStrength + bearishStrength;
    
    let bias: 'bullish' | 'bearish' | 'neutral';
    let strength: number;
    
    if (totalStrength === 0) {
      bias = 'neutral';
      strength = 0;
    } else {
      const bullishRatio = bullishStrength / totalStrength;
      
      if (bullishRatio > 0.65) {
        bias = 'bullish';
        strength = Math.round(bullishRatio * 100);
      } else if (bullishRatio < 0.35) {
        bias = 'bearish';
        strength = Math.round((1 - bullishRatio) * 100);
      } else {
        bias = 'neutral';
        strength = Math.round(50);
      }
    }

    return {
      bias,
      strength,
      bullishCount: bullishSignals.length,
      bearishCount: bearishSignals.length,
      bullishSignals: bullishSignals.slice(0, 3),
      bearishSignals: bearishSignals.slice(0, 3),
      timestamp: Date.now(),
    };
  }
}

export interface TradingSignal {
  id: string;
  patternType: PatternType;
  patternName: string;
  direction: PatternDirection;
  confidence: number;
  strength: 'strong' | 'moderate' | 'weak';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  formed: boolean;
  symbol: string;
  timeframe: Timeframe;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ConfluenceResult {
  bias: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  bullishCount: number;
  bearishCount: number;
  bullishSignals: PatternSignal[];
  bearishSignals: PatternSignal[];
  timestamp: number;
}

// Singleton instance
export const patternService = new PatternDetectionService();

export default PatternDetectionService;
