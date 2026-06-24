// Grid Search Optimizer
import type { 
  OptimizationParameter, 
  ParameterSet, 
  GridSearchConfig,
  FitnessMetrics,
  OptimizationFitness
} from './types';
import { calculateMetrics } from './metrics';

export interface GridSearchResult {
  results: OptimizationFitness[];
  totalCombinations: number;
  testedCombinations: number;
  bestParams: ParameterSet;
  executionTime: number;
}

export class GridSearchOptimizer {
  private config: GridSearchConfig;
  
  constructor(config?: Partial<GridSearchConfig>) {
    this.config = {
      metric: config?.metric || 'profit',
      maximize: config?.maximize ?? true,
      maxResults: config?.maxResults || 100,
      parallel: config?.parallel ?? false,
    };
  }

  /**
   * Generate all parameter combinations
   */
  generateCombinations(params: OptimizationParameter[]): ParameterSet[] {
    const combinations: ParameterSet[] = [];
    
    // Generate values for each parameter
    const valueSets = params.map(p => {
      const values: number[] = [];
      for (let v = p.min; v <= p.max; v += p.step) {
        values.push(p.type === 'int' ? Math.round(v) : v);
      }
      return values;
    });

    // Cartesian product
    const generate = (index: number, current: ParameterSet): void => {
      if (index === params.length) {
        combinations.push({ ...current });
        return;
      }

      for (const value of valueSets[index]) {
        current[params[index].name] = value;
        generate(index + 1, current);
      }
    };

    generate(0, {});
    return combinations;
  }

  /**
   * Calculate total combinations without generating all
   */
  calculateTotalCombinations(params: OptimizationParameter[]): number {
    return params.reduce((total, p) => {
      const count = Math.floor((p.max - p.min) / p.step) + 1;
      return total * count;
    }, 1);
  }

  /**
   * Optimize using grid search
   */
  async optimize(
    params: OptimizationParameter[],
    fitnessFunction: (params: ParameterSet, candles: Candle[]) => Promise<FitnessMetrics>,
    candles: Candle[]
  ): Promise<GridSearchResult> {
    const startTime = Date.now();
    const combinations = this.generateCombinations(params);
    const results: OptimizationFitness[] = [];
    
    // Limit combinations if too many
    const maxCombinations = this.config.maxResults * 10;
    const combinationsToTest = combinations.length > maxCombinations
      ? this.sampleCombinations(combinations, maxCombinations)
      : combinations;

    const totalCombinations = combinationsToTest.length;
    let testedCount = 0;

    // Test each combination
    for (const paramSet of combinationsToTest) {
      try {
        const metrics = await fitnessFunction(paramSet, candles);
        const fitness = this.evaluateFitness(metrics);
        
        results.push({
          params: paramSet,
          metrics,
          rank: 0,
        });
      } catch (error) {
        // Skip failed combinations
        console.error(`Failed to evaluate ${JSON.stringify(paramSet)}:`, error);
      }

      testedCount++;
      
      // Report progress
      if (testedCount % 100 === 0) {
        console.log(`Grid search progress: ${testedCount}/${totalCombinations}`);
      }
    }

    // Sort results
    results.sort((a, b) => {
      const fitnessA = this.getMetricValue(a.metrics);
      const fitnessB = this.getMetricValue(b.metrics);
      return this.config.maximize ? fitnessB - fitnessA : fitnessA - fitnessB;
    });

    // Assign ranks
    results.forEach((r, i) => r.rank = i + 1);

    // Return top results
    const topResults = results.slice(0, this.config.maxResults);

    return {
      results: topResults,
      totalCombinations,
      testedCombinations: testedCount,
      bestParams: topResults[0]?.params || {},
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Sample combinations evenly
   */
  private sampleCombinations(combinations: ParameterSet[], max: number): ParameterSet[] {
    if (combinations.length <= max) return combinations;
    
    const step = Math.ceil(combinations.length / max);
    return combinations.filter((_, i) => i % step === 0);
  }

  /**
   * Get metric value based on config
   */
  private getMetricValue(metrics: FitnessMetrics): number {
    switch (this.config.metric) {
      case 'profit':
        return metrics.netProfit;
      case 'sharpe':
        return metrics.sharpeRatio;
      case 'sortino':
        return metrics.sortinoRatio;
      case 'win_rate':
        return metrics.winRate;
      case 'profit_factor':
        return metrics.profitFactor;
      default:
        return metrics.netProfit;
    }
  }

  /**
   * Calculate overall fitness
   */
  private evaluateFitness(metrics: FitnessMetrics): number {
    // Weighted combination of metrics
    let score = 0;
    
    // Net profit (primary)
    score += metrics.netProfit * 0.3;
    
    // Sharpe ratio
    score += metrics.sharpeRatio * 100 * 0.2;
    
    // Win rate
    score += metrics.winRate * 0.15;
    
    // Profit factor
    score += metrics.profitFactor * 50 * 0.15;
    
    // Drawdown penalty
    score -= metrics.maxDrawdownPercent * 0.1;
    
    // Minimum trades bonus
    if (metrics.totalTrades >= 30) score += 10;
    
    return score;
  }
}
