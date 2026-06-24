// Genetic Algorithm Optimizer
import type { 
  OptimizationParameter, 
  ParameterSet, 
  GeneticConfig,
  Chromosome,
  FitnessMetrics
} from './types';

const DEFAULT_CONFIG: GeneticConfig = {
  populationSize: 50,
  generations: 100,
  mutationRate: 0.1,
  crossoverRate: 0.8,
  elitismCount: 5,
  tournamentSize: 3,
};

export interface GeneticResult {
  bestChromosome: Chromosome;
  bestFitness: number;
  generation: number;
  history: {
    generation: number;
    bestFitness: number;
    avgFitness: number;
  }[];
  executionTime: number;
}

export class GeneticOptimizer {
  private config: GeneticConfig;
  private parameters: OptimizationParameter[];

  constructor(config: Partial<GeneticConfig>, parameters: OptimizationParameter[]) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.parameters = parameters;
  }

  /**
   * Create random chromosome
   */
  private createRandomChromosome(): Chromosome {
    const genes: ParameterSet = {};
    
    for (const param of this.parameters) {
      const range = param.max - param.min;
      const value = param.min + Math.random() * range;
      genes[param.name] = param.type === 'int' ? Math.round(value) : value;
    }

    return { genes, fitness: 0 };
  }

  /**
   * Initialize population
   */
  private initializePopulation(): Chromosome[] {
    const population: Chromosome[] = [];
    
    for (let i = 0; i < this.config.populationSize; i++) {
      population.push(this.createRandomChromosome());
    }

    return population;
  }

  /**
   * Evaluate fitness for all chromosomes
   */
  private async evaluatePopulation(
    population: Chromosome[],
    fitnessFunction: (params: ParameterSet, candles: import('./types').default['candles'] extends infer T ? T : never) => Promise<FitnessMetrics>,
    candles: Parameters<typeof fitnessFunction>[1]
  ): Promise<void> {
    for (const chromosome of population) {
      try {
        const metrics = await fitnessFunction(chromosome.genes, candles);
        chromosome.fitness = this.calculateFitness(metrics);
      } catch (error) {
        chromosome.fitness = -Infinity;
      }
    }
  }

  /**
   * Tournament selection
   */
  private tournamentSelect(population: Chromosome[]): Chromosome {
    const tournament: Chromosome[] = [];
    
    for (let i = 0; i < this.config.tournamentSize; i++) {
      const idx = Math.floor(Math.random() * population.length);
      tournament.push(population[idx]);
    }

    // Return best in tournament
    return tournament.reduce((best, current) => 
      current.fitness > best.fitness ? current : best
    );
  }

  /**
   * Crossover two chromosomes
   */
  private crossover(parent1: Chromosome, parent2: Chromosome): [Chromosome, Chromosome] {
    if (Math.random() > this.config.crossoverRate) {
      return [parent1, parent2];
    }

    const child1: Chromosome = { genes: { ...parent1.genes }, fitness: 0 };
    const child2: Chromosome = { genes: { ...parent2.genes }, fitness: 0 };

    // Single point crossover
    const paramNames = this.parameters.map(p => p.name);
    const crossoverPoint = Math.floor(Math.random() * paramNames.length);

    for (let i = 0; i < paramNames.length; i++) {
      if (i >= crossoverPoint) {
        child1.genes[paramNames[i]] = parent2.genes[paramNames[i]];
        child2.genes[paramNames[i]] = parent1.genes[paramNames[i]];
      }
    }

    return [child1, child2];
  }

  /**
   * Mutate chromosome
   */
  private mutate(chromosome: Chromosome): void {
    for (const param of this.parameters) {
      if (Math.random() < this.config.mutationRate) {
        const range = param.max - param.min;
        const mutation = (Math.random() - 0.5) * range * 0.2; // ±10% of range
        let newValue = (chromosome.genes[param.name] as number) + mutation;
        
        // Clamp to bounds
        newValue = Math.max(param.min, Math.min(param.max, newValue));
        chromosome.genes[param.name] = param.type === 'int' ? Math.round(newValue) : newValue;
      }
    }
  }

  /**
   * Calculate fitness score
   */
  private calculateFitness(metrics: FitnessMetrics): number {
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
    
    // Penalty for too few trades
    if (metrics.totalTrades < 10) score -= 50;

    return score;
  }

  /**
   * Main optimization loop
   */
  async optimize(
    fitnessFunction: (params: ParameterSet, candles: Parameters<typeof fitnessFunction>[1]) => Promise<FitnessMetrics>,
    candles: Parameters<typeof fitnessFunction>[1],
    onProgress?: (generation: number, bestFitness: number) => void
  ): Promise<GeneticResult> {
    const startTime = Date.now();
    let population = this.initializePopulation();
    const history: { generation: number; bestFitness: number; avgFitness: number }[] = [];

    // Evaluate initial population
    await this.evaluatePopulation(population, fitnessFunction as any, candles);

    let bestChromosome = this.getBestChromosome(population);

    for (let gen = 0; gen < this.config.generations; gen++) {
      // Sort by fitness
      population.sort((a, b) => b.fitness - a.fitness);

      // Track history
      const avgFitness = population.reduce((sum, c) => sum + c.fitness, 0) / population.length;
      history.push({
        generation: gen,
        bestFitness: population[0].fitness,
        avgFitness,
      });

      // Progress callback
      if (onProgress) {
        onProgress(gen, population[0].fitness);
      }

      // Create new population
      const newPopulation: Chromosome[] = [];

      // Elitism - keep best chromosomes
      for (let i = 0; i < this.config.elitismCount; i++) {
        newPopulation.push({ ...population[i], genes: { ...population[i].genes } });
      }

      // Generate rest through crossover and mutation
      while (newPopulation.length < this.config.populationSize) {
        const parent1 = this.tournamentSelect(population);
        const parent2 = this.tournamentSelect(population);
        const [child1, child2] = this.crossover(parent1, parent2);
        
        this.mutate(child1);
        this.mutate(child2);

        newPopulation.push(child1);
        if (newPopulation.length < this.config.populationSize) {
          newPopulation.push(child2);
        }
      }

      population = newPopulation;

      // Evaluate new population
      await this.evaluatePopulation(population, fitnessFunction as any, candles);

      // Track best
      const currentBest = this.getBestChromosome(population);
      if (currentBest.fitness > bestChromosome.fitness) {
        bestChromosome = currentBest;
      }
    }

    return {
      bestChromosome,
      bestFitness: bestChromosome.fitness,
      generation: this.config.generations,
      history,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Get best chromosome from population
   */
  private getBestChromosome(population: Chromosome[]): Chromosome {
    return population.reduce((best, current) => 
      current.fitness > best.fitness ? current : best
    );
  }
}
