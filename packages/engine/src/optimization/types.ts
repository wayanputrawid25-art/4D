// Optimization Types
import type { Candle } from '@forexos/types';

// Parameter Types
export interface OptimizationParameter {
  name: string;
  min: number;
  max: number;
  step: number;
  type: 'int' | 'float';
}

export interface ParameterSet {
  [key: string]: number;
}

// Optimization Types
export type OptimizationMethod = 'grid_search' | 'genetic' | 'bayesian' | 'walk_forward';
export type FitnessMetric = 'profit' | 'sharpe' | 'sortino' | 'win_rate' | 'profit_factor' | 'custom';

// Optimization Results
export interface OptimizationResult {
  id: string;
  method: OptimizationMethod;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  startedAt: number;
  completedAt?: number;
  totalTests: number;
  testedCount: number;
  bestResult?: OptimizationFitness;
  allResults: OptimizationFitness[];
  walkForwardResults?: WalkForwardResult[];
}

export interface OptimizationFitness {
  params: ParameterSet;
  metrics: FitnessMetrics;
  rank: number;
}

export interface FitnessMetrics {
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  avgWin: number;
  avgLoss: number;
  avgTrade: number;
  avgBarsInTrade: number;
  recoveryFactor: number;
  payoffRatio: number;
}

// Walk Forward Analysis
export interface WalkForwardResult {
  inSample: {
    startDate: number;
    endDate: number;
    metrics: FitnessMetrics;
    bestParams: ParameterSet;
  };
  outOfSample: {
    startDate: number;
    endDate: number;
    metrics: FitnessMetrics;
  };
  robustness: {
    consistencyScore: number; // How well OOS matches IS
    stabilityScore: number;
  };
}

// Genetic Algorithm Types
export interface GeneticConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismCount: number;
  tournamentSize: number;
}

export interface Chromosome {
  genes: ParameterSet;
  fitness: number;
}

// Grid Search Types
export interface GridSearchConfig {
  metric: FitnessMetric;
  maximize: boolean;
  maxResults: number;
  parallel: boolean;
}

// Bayesian Optimization Types
export interface BayesianConfig {
  iterations: number;
  explorationWeight: number; // Higher = more exploration
  acquisitionFunction: 'ei' | 'ucb' | 'poi';
}

// Progress Callback
export type ProgressCallback = (progress: OptimizationResult) => void;
export type FitnessFunction = (params: ParameterSet, candles: Candle[]) => Promise<FitnessMetrics>;

// Sensitivity Analysis
export interface SensitivityResult {
  parameter: string;
  impact: number; // Correlation with fitness
  optimalRange: { min: number; max: number };
  stability: 'stable' | 'moderate' | 'unstable';
}

// Monte Carlo Types
export interface MonteCarloConfig {
  simulations: number;
  equityStart: number;
  equityCurve: number[];
}

export interface MonteCarloResult {
  equityPercentiles: {
    p1: number;
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  drawdownPercentiles: {
    p1: number;
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  survivalRate: number; // % of simulations not hitting drawdown limit
  expectedReturn: number;
  riskOfRuin: number;
}

// Optimization Constraints
export interface OptimizationConstraints {
  maxDrawdownPercent?: number;
  minTrades?: number;
  minWinRate?: number;
  maxConsecutiveLosses?: number;
  timeOfDay?: {
    start?: number; // Hour (0-23)
    end?: number;
  };
  dayOfWeek?: number[]; // 0-6
}
