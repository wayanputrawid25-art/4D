// Walk Forward Analysis
import type { 
  Candle,
  ParameterSet, 
  FitnessMetrics,
  WalkForwardResult
} from './types';
import { GridSearchOptimizer } from './grid-search';

export interface WalkForwardConfig {
  inSamplePercent: number; // e.g., 0.7 = 70% in-sample
  outOfSamplePercent: number; // e.g., 0.3 = 30% out-of-sample
  steps: number; // Number of walk-forward windows
  stepType: 'fixed' | 'expanding' | 'rolling';
  minInSampleCandles: number;
  minOutOfSampleCandles: number;
}

const DEFAULT_CONFIG: WalkForwardConfig = {
  inSamplePercent: 0.7,
  outOfSamplePercent: 0.3,
  steps: 5,
  stepType: 'rolling',
  minInSampleCandles: 500,
  minOutOfSampleCandles: 100,
};

export interface WalkForwardAnalysis {
  results: WalkForwardResult[];
  overall: {
    avgInSampleProfit: number;
    avgOutOfSampleProfit: number;
    consistencyRatio: number; // OOS / IS profit
    robustnessScore: number; // 0-100
  };
  recommendedParams: ParameterSet;
}

export class WalkForwardAnalyzer {
  private config: WalkForwardConfig;

  constructor(config?: Partial<WalkForwardConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Split candles into in-sample and out-of-sample
   */
  splitCandles(
    candles: Candle[],
    startIndex: number,
    endIndex: number
  ): { inSample: Candle[]; outOfSample: Candle[] } {
    const totalCandles = endIndex - startIndex;
    const inSampleSize = Math.floor(totalCandles * this.config.inSamplePercent);
    
    const inSample = candles.slice(startIndex, startIndex + inSampleSize);
    const outOfSample = candles.slice(startIndex + inSampleSize, endIndex);

    return { inSample, outOfSample };
  }

  /**
   * Get window indices based on step type
   */
  getWindows(candles: Candle[]): { start: number; end: number }[] {
    const windows: { start: number; end: number }[] = [];
    const totalCandles = candles.length;
    const windowSize = Math.floor(totalCandles / this.config.steps);
    
    for (let step = 0; step < this.config.steps; step++) {
      let start: number;
      let end: number;

      switch (this.config.stepType) {
        case 'expanding':
          start = 0;
          end = Math.min((step + 1) * windowSize, totalCandles);
          break;
        
        case 'rolling':
          start = step * windowSize;
          end = Math.min(start + windowSize * 2, totalCandles);
          break;
        
        case 'fixed':
        default:
          start = step * windowSize;
          end = Math.min(start + windowSize, totalCandles);
          break;
      }

      // Ensure minimum sizes
      const inSampleCandles = Math.floor((end - start) * this.config.inSamplePercent);
      const outOfSampleCandles = end - start - inSampleCandles;

      if (inSampleCandles >= this.config.minInSampleCandles &&
          outOfSampleCandles >= this.config.minOutOfSampleCandles) {
        windows.push({ start, end });
      }
    }

    return windows;
  }

  /**
   * Run walk-forward analysis
   */
  async analyze(
    candles: Candle[],
    parameters: import('./types').OptimizationParameter[],
    fitnessFunction: (params: ParameterSet, candles: Candle[]) => Promise<FitnessMetrics>
  ): Promise<WalkForwardAnalysis> {
    const windows = this.getWindows(candles);
    const results: WalkForwardResult[] = [];
    const allBestParams: ParameterSet[] = [];

    console.log(`Starting walk-forward analysis with ${windows.length} windows`);

    for (let i = 0; i < windows.length; i++) {
      const { start, end } = windows[i];
      const { inSample, outOfSample } = this.splitCandles(candles, start, end);

      console.log(`Window ${i + 1}/${windows.length}: IS=${inSample.length}, OOS=${outOfSample.length}`);

      // Optimize on in-sample data
      const optimizer = new GridSearchOptimizer({ maxResults: 50 });
      const isResult = await optimizer.optimize(parameters, fitnessFunction, inSample);
      
      const bestParams = isResult.bestParams;
      allBestParams.push(bestParams);

      // Evaluate on out-of-sample data
      let oosMetrics: FitnessMetrics;
      try {
        oosMetrics = await fitnessFunction(bestParams, outOfSample);
      } catch {
        oosMetrics = this.getEmptyMetrics();
      }

      // Calculate robustness metrics
      const consistencyScore = this.calculateConsistencyScore(isResult.results[0]?.metrics, oosMetrics);
      const stabilityScore = this.calculateStabilityScore(oosMetrics);

      results.push({
        inSample: {
          startDate: inSample[0].timestamp,
          endDate: inSample[inSample.length - 1].timestamp,
          metrics: isResult.results[0]?.metrics || this.getEmptyMetrics(),
          bestParams,
        },
        outOfSample: {
          startDate: outOfSample[0]?.timestamp || 0,
          endDate: outOfSample[outOfSample.length - 1]?.timestamp || 0,
          metrics: oosMetrics,
        },
        robustness: {
          consistencyScore,
          stabilityScore,
        },
      });
    }

    // Calculate overall metrics
    const avgInSampleProfit = results.reduce((sum, r) => sum + r.inSample.metrics.netProfit, 0) / results.length;
    const avgOutOfSampleProfit = results.reduce((sum, r) => sum + r.outOfSample.metrics.netProfit, 0) / results.length;
    const consistencyRatio = avgInSampleProfit !== 0 ? avgOutOfSampleProfit / avgInSampleProfit : 0;
    const robustnessScore = this.calculateRobustnessScore(results);

    // Find most common parameter values (for recommendation)
    const recommendedParams = this.getMostCommonParams(allBestParams);

    return {
      results,
      overall: {
        avgInSampleProfit,
        avgOutOfSampleProfit,
        consistencyRatio,
        robustnessScore,
      },
      recommendedParams,
    };
  }

  /**
   * Calculate consistency score between IS and OOS
   */
  private calculateConsistencyScore(
    isMetrics: FitnessMetrics | undefined,
    oosMetrics: FitnessMetrics
  ): number {
    if (!isMetrics) return 0;

    // Compare profit direction
    const isProfit = isMetrics.netProfit > 0;
    const oosProfit = oosMetrics.netProfit > 0;
    
    // Compare win rate (within 20% tolerance)
    const winRateDiff = Math.abs(isMetrics.winRate - oosMetrics.winRate);
    const winRateScore = Math.max(0, 1 - winRateDiff / 20) * 50;
    
    // Compare profit factor (within 50% tolerance)
    const pfDiff = Math.abs(isMetrics.profitFactor - oosMetrics.profitFactor);
    const pfScore = Math.max(0, 1 - pfDiff / 2) * 50;
    
    // Bonus if both profitable
    const profitBonus = isProfit && oosProfit ? 20 : 0;
    
    return Math.min(100, winRateScore + pfScore + profitBonus);
  }

  /**
   * Calculate stability score based on OOS metrics
   */
  private calculateStabilityScore(metrics: FitnessMetrics): number {
    let score = 50; // Base score

    // Positive profit
    if (metrics.netProfit > 0) score += 20;
    else score -= 30;

    // Good win rate
    if (metrics.winRate >= 45 && metrics.winRate <= 65) score += 10;

    // Good profit factor
    if (metrics.profitFactor >= 1.2) score += 10;

    // Low drawdown
    if (metrics.maxDrawdownPercent < 20) score += 10;

    // Enough trades
    if (metrics.totalTrades >= 20) score += 5;
    else score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate overall robustness score
   */
  private calculateRobustnessScore(results: WalkForwardResult[]): number {
    if (results.length === 0) return 0;

    // Average consistency
    const avgConsistency = results.reduce((sum, r) => sum + r.robustness.consistencyScore, 0) / results.length;
    
    // Average stability
    const avgStability = results.reduce((sum, r) => sum + r.robustness.stabilityScore, 0) / results.length;
    
    // Consistency ratio (OOS profit / IS profit)
    const avgConsistencyRatio = this.calculateAverageConsistencyRatio(results);

    // Combined score
    const robustnessScore = (avgConsistency * 0.4) + (avgStability * 0.4) + (avgConsistencyRatio * 0.2);

    return Math.round(robustnessScore);
  }

  /**
   * Calculate average consistency ratio
   */
  private calculateAverageConsistencyRatio(results: WalkForwardResult[]): number {
    const ratios = results
      .filter(r => r.inSample.metrics.netProfit !== 0)
      .map(r => r.outOfSample.metrics.netProfit / r.inSample.metrics.netProfit);

    if (ratios.length === 0) return 0;

    const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    
    // Map to 0-100 (1.0 = 100, 0.5 = 50, etc.)
    return Math.max(0, Math.min(100, avgRatio * 100));
  }

  /**
   * Get most common parameter values
   */
  private getMostCommonParams(allParams: ParameterSet[]): ParameterSet {
    if (allParams.length === 0) return {};

    const result: ParameterSet = {};
    const paramNames = Object.keys(allParams[0]);

    for (const name of paramNames) {
      const values = allParams.map(p => p[name]);
      
      // Find most common value
      const counts: Record<number, number> = {};
      for (const v of values) {
        counts[v] = (counts[v] || 0) + 1;
      }

      let maxCount = 0;
      let mostCommon = values[0];
      for (const [v, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          mostCommon = parseFloat(v);
        }
      }

      result[name] = mostCommon;
    }

    return result;
  }

  /**
   * Get empty metrics
   */
  private getEmptyMetrics(): FitnessMetrics {
    return {
      netProfit: 0,
      grossProfit: 0,
      grossLoss: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      avgWin: 0,
      avgLoss: 0,
      avgTrade: 0,
      avgBarsInTrade: 0,
      recoveryFactor: 0,
      payoffRatio: 0,
    };
  }
}
