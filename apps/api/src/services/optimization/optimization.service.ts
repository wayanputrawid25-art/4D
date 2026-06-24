// Optimization Service
import type { Candle } from '@forexos/types';
import type { 
  OptimizationParameter, 
  ParameterSet, 
  FitnessMetrics,
  OptimizationResult,
  OptimizationMethod,
  GridSearchConfig,
  GeneticConfig,
  WalkForwardConfig
} from '../../../../packages/engine/src/optimization/types';
import { GridSearchOptimizer } from '../../../../packages/engine/src/optimization/grid-search';
import { GeneticOptimizer } from '../../../../packages/engine/src/optimization/genetic';
import { WalkForwardAnalyzer } from '../../../../packages/engine/src/optimization/walk-forward';
import { simulateStrategy, calculateMetrics } from '../../../../packages/engine/src/optimization/metrics';

export interface OptimizationConfig {
  method: OptimizationMethod;
  metric: 'profit' | 'sharpe' | 'sortino' | 'win_rate' | 'profit_factor';
  maxResults?: number;
}

export class OptimizationService {
  private results: Map<string, OptimizationResult> = new Map();

  /**
   * Run optimization
   */
  async optimize(
    id: string,
    candles: Candle[],
    parameters: OptimizationParameter[],
    config: OptimizationConfig
  ): Promise<OptimizationResult> {
    const result: OptimizationResult = {
      id,
      method: config.method,
      status: 'running',
      progress: 0,
      startedAt: Date.now(),
      totalTests: 0,
      testedCount: 0,
      allResults: [],
    };

    this.results.set(id, result);

    try {
      // Define fitness function
      const fitnessFunction = async (params: ParameterSet): Promise<FitnessMetrics> => {
        const trades = simulateStrategy(candles, params);
        return calculateMetrics(trades);
      };

      let optimizationResult;

      switch (config.method) {
        case 'grid_search':
          optimizationResult = await this.runGridSearch(
            parameters,
            candles,
            fitnessFunction,
            result
          );
          break;
        
        case 'genetic':
          optimizationResult = await this.runGenetic(
            parameters,
            candles,
            fitnessFunction,
            result
          );
          break;
        
        case 'walk_forward':
          optimizationResult = await this.runWalkForward(
            parameters,
            candles,
            fitnessFunction,
            result
          );
          break;
        
        default:
          throw new Error(`Unknown optimization method: ${config.method}`);
      }

      // Update result
      result.status = 'completed';
      result.completedAt = Date.now();
      result.bestResult = optimizationResult.bestResult;
      result.allResults = optimizationResult.allResults;
      result.totalTests = optimizationResult.totalTests || optimizationResult.totalCombinations || 0;
      result.testedCount = result.totalTests;
      result.progress = 100;

      if (optimizationResult.walkForwardResults) {
        result.walkForwardResults = optimizationResult.walkForwardResults;
      }

    } catch (error) {
      result.status = 'failed';
      console.error(`Optimization ${id} failed:`, error);
    }

    this.results.set(id, result);
    return result;
  }

  /**
   * Run grid search optimization
   */
  private async runGridSearch(
    parameters: OptimizationParameter[],
    candles: Candle[],
    fitnessFunction: (params: ParameterSet) => Promise<FitnessMetrics>,
    result: OptimizationResult
  ): Promise<{
    bestResult: { params: ParameterSet; metrics: FitnessMetrics; rank: number };
    allResults: { params: ParameterSet; metrics: FitnessMetrics; rank: number }[];
    totalCombinations: number;
  }> {
    const optimizer = new GridSearchOptimizer({
      maxResults: 100,
      metric: 'profit',
      maximize: true,
    });

    const gridResult = await optimizer.optimize(parameters, fitnessFunction, candles);

    result.progress = 100;

    return {
      bestResult: gridResult.results[0] || { params: {}, metrics: {} as FitnessMetrics, rank: 0 },
      allResults: gridResult.results,
      totalCombinations: gridResult.totalCombinations,
    };
  }

  /**
   * Run genetic algorithm optimization
   */
  private async runGenetic(
    parameters: OptimizationParameter[],
    candles: Candle[],
    fitnessFunction: (params: ParameterSet) => Promise<FitnessMetrics>,
    result: OptimizationResult
  ): Promise<{
    bestResult: { params: ParameterSet; metrics: FitnessMetrics; rank: number };
    allResults: { params: ParameterSet; metrics: FitnessMetrics; rank: number }[];
    totalTests: number;
  }> {
    const config: Partial<GeneticConfig> = {
      populationSize: 50,
      generations: 50,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      elitismCount: 5,
    };

    const optimizer = new GeneticOptimizer(config, parameters);

    const genResult = await optimizer.optimize(
      fitnessFunction as any,
      candles,
      (gen, fitness) => {
        result.progress = Math.round((gen / 50) * 100);
        this.results.set(result.id, result);
      }
    );

    // Convert to standard format
    const bestResult = {
      params: genResult.bestChromosome.genes,
      metrics: {} as FitnessMetrics, // Would need to recalculate
      rank: 1,
    };

    return {
      bestResult,
      allResults: [bestResult],
      totalTests: config.generations! * config.populationSize!,
    };
  }

  /**
   * Run walk-forward analysis
   */
  private async runWalkForward(
    parameters: OptimizationParameter[],
    candles: Candle[],
    fitnessFunction: (params: ParameterSet) => Promise<FitnessMetrics>,
    result: OptimizationResult
  ): Promise<{
    bestResult: { params: ParameterSet; metrics: FitnessMetrics; rank: number };
    allResults: { params: ParameterSet; metrics: FitnessMetrics; rank: number }[];
    totalTests: number;
    walkForwardResults: OptimizationResult['walkForwardResults'];
  }> {
    const analyzer = new WalkForwardAnalyzer({
      steps: 5,
      inSamplePercent: 0.7,
      outOfSamplePercent: 0.3,
      stepType: 'rolling',
    });

    const wfResult = await analyzer.analyze(candles, parameters, fitnessFunction);

    result.walkForwardResults = wfResult.results.map(r => ({
      inSample: r.inSample,
      outOfSample: r.outOfSample,
      robustness: r.robustness,
    }));

    // Use recommended params as best
    const bestResult = {
      params: wfResult.recommendedParams,
      metrics: wfResult.results[0]?.inSample.metrics || {} as FitnessMetrics,
      rank: 1,
    };

    return {
      bestResult,
      allResults: [bestResult],
      totalTests: wfResult.results.length * 100, // Estimated
      walkForwardResults: result.walkForwardResults,
    };
  }

  /**
   * Get optimization result
   */
  getResult(id: string): OptimizationResult | null {
    return this.results.get(id) || null;
  }

  /**
   * Get all results
   */
  getAllResults(): OptimizationResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Cancel optimization
   */
  cancel(id: string): boolean {
    const result = this.results.get(id);
    if (result && result.status === 'running') {
      result.status = 'cancelled';
      this.results.set(id, result);
      return true;
    }
    return false;
  }

  /**
   * Clear old results
   */
  clearOldResults(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [id, result] of this.results) {
      if (result.completedAt && now - result.completedAt > maxAge) {
        this.results.delete(id);
      }
    }
  }

  /**
   * Calculate sample size recommendation
   */
  calculateSampleSize(
    avgBarsInTrade: number,
    targetConfidence: number = 0.95
  ): number {
    // Rule of thumb: 30 trades per parameter being optimized
    // Plus additional for statistical significance
    const baseSample = 30 * 5; // Assuming 5 parameters
    const confidenceFactor = Math.ceil(targetConfidence * 10);
    return baseSample * confidenceFactor;
  }
}

export const optimizationService = new OptimizationService();
export default OptimizationService;
