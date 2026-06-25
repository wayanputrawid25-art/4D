// Configuration Schema - Zod validation schemas for trading configuration
import { z } from 'zod';

// =============================================================================
// RISK MANAGEMENT
// =============================================================================
export const RiskConfigSchema = z.object({
  maxRiskPerTrade: z.number().min(0.1).max(10),
  maxDailyRisk: z.number().min(0.5).max(50),
  maxOpenPositions: z.number().int().min(1).max(20),
  maxCorrelation: z.number().min(0).max(1),
  minRiskReward: z.number().min(0.5).max(5),
  maxDrawdownLimit: z.number().min(5).max(100),
  maxConsecutiveLosses: z.number().int().min(1).max(20),
  positionSizingMethod: z.enum(['fixed', 'kelly', 'adaptive']),
  kellyFraction: z.number().min(0.01).max(1),
  fixedFractional: z.number().min(0.001).max(0.5),
  maxPositionSize: z.number().min(0.01).max(100),
  minPositionSize: z.number().min(0.01).max(1),
});

// =============================================================================
// SYMBOL CONFIGURATION
// =============================================================================
export const SymbolSpecSchema = z.object({
  contractSize: z.number().positive(),
  pipDecimal: z.number().positive(),
  pipValue: z.number().positive(),
  minLot: z.number().positive(),
  maxLot: z.number().positive(),
  lotStep: z.number().positive(),
  minSpread: z.number().int().nonnegative(),
  maxSpread: z.number().int().positive(),
  marginHedge: z.number().min(0).max(1),
  swapLong: z.number(),
  swapShort: z.number(),
});

export const SymbolsConfigSchema = z.record(SymbolSpecSchema);

// =============================================================================
// PATTERN DETECTION
// =============================================================================
export const CandlestickPatternsSchema = z.enum([
  'doji', 'hammer', 'inverted_hammer', 'bullish_engulfing', 'bearish_engulfing',
  'morning_star', 'evening_star', 'piercing_line', 'dark_cloud_cover',
  'harami', 'shooting_star', 'spinning_top', 'marubozu'
]);

export const ChartPatternsSchema = z.enum([
  'head_and_shoulders', 'inverse_head_and_shoulders', 'double_top', 'double_bottom',
  'triple_top', 'triple_bottom', 'ascending_triangle', 'descending_triangle',
  'symmetrical_triangle', 'rising_wedge', 'falling_wedge', 'bull_flag',
  'bear_flag', 'pennant_bullish', 'pennant_bearish'
]);

export const CandlestickConfigSchema = z.object({
  enabled: z.boolean(),
  patterns: z.array(CandlestickPatternsSchema).optional(),
});

export const ChartConfigSchema = z.object({
  enabled: z.boolean(),
  patterns: z.array(ChartPatternsSchema).optional(),
});

export const ConfluenceConfigSchema = z.object({
  bullishThreshold: z.number().min(0.3).max(0.8),
  bearishThreshold: z.number().min(0.2).max(0.7),
  minPatternsForSignal: z.number().int().min(1).max(10),
});

export const PatternsConfigSchema = z.object({
  minConfidence: z.number().int().min(0).max(100),
  candlestick: CandlestickConfigSchema,
  chart: ChartConfigSchema,
  confluence: ConfluenceConfigSchema,
});

// =============================================================================
// INDICATORS
// =============================================================================
export const SMAConfigSchema = z.object({
  defaultPeriod: z.number().int().positive(),
  enabled: z.boolean(),
});

export const EMAConfigSchema = z.object({
  defaultPeriod: z.number().int().positive(),
  enabled: z.boolean(),
});

export const WMAConfigSchema = z.object({
  defaultPeriod: z.number().int().positive(),
  enabled: z.boolean(),
});

export const DEMAConfigSchema = z.object({
  defaultPeriod: z.number().int().positive(),
  enabled: z.boolean(),
});

export const TEMAConfigSchema = z.object({
  defaultPeriod: z.number().int().positive(),
  enabled: z.boolean(),
});

export const VWAPConfigSchema = z.object({
  enabled: z.boolean(),
});

export const IchimokuConfigSchema = z.object({
  enabled: z.boolean(),
  tenkanPeriod: z.number().int().positive(),
  kijunPeriod: z.number().int().positive(),
  senkouPeriod: z.number().int().positive(),
});

export const TrendIndicatorsConfigSchema = z.object({
  sma: SMAConfigSchema,
  ema: EMAConfigSchema,
  wma: WMAConfigSchema,
  dema: DEMAConfigSchema,
  tema: TEMAConfigSchema,
  vwap: VWAPConfigSchema,
  ichimoku: IchimokuConfigSchema,
});

export const RSIConfigSchema = z.object({
  defaultPeriod: z.number().int().positive(),
  overbought: z.number().min(50).max(100),
  oversold: z.number().min(0).max(50),
  enabled: z.boolean(),
});

export const MACDConfigSchema = z.object({
  fastPeriod: z.number().int().positive(),
  slowPeriod: z.number().int().positive(),
  signalPeriod: z.number().int().positive(),
  enabled: z.boolean(),
});

export const StochasticConfigSchema = z.object({
  kPeriod: z.number().int().positive(),
  dPeriod: z.number().int().positive(),
  smoothK: z.number().int().positive(),
  overbought: z.number().min(50).max(100),
  oversold: z.number().min(0).max(50),
  enabled: z.boolean(),
});

export const ADXConfigSchema = z.object({
  defaultPeriod: z.number().int().positive(),
  trendThreshold: z.number().min(10).max(50),
  enabled: z.boolean(),
});

export const MomentumConfigSchema = z.object({
  defaultPeriod: z.number().int().positive(),
  enabled: z.boolean(),
});

export const ROCConfigSchema = z.object({
  defaultPeriod: z.number().int().positive(),
  enabled: z.boolean(),
});

export const MomentumIndicatorsConfigSchema = z.object({
  rsi: RSIConfigSchema,
  macd: MACDConfigSchema,
  stoch: StochasticConfigSchema,
  adx: ADXConfigSchema,
  momentum: MomentumConfigSchema,
  roc: ROCConfigSchema,
});

export const BollingerBandsConfigSchema = z.object({
  period: z.number().int().positive(),
  stdDev: z.number().positive(),
  enabled: z.boolean(),
});

export const ATRConfigSchema = z.object({
  defaultPeriod: z.number().int().positive(),
  enabled: z.boolean(),
});

export const StdDevConfigSchema = z.object({
  defaultPeriod: z.number().int().positive(),
  enabled: z.boolean(),
});

export const KeltnerConfigSchema = z.object({
  emaPeriod: z.number().int().positive(),
  atrPeriod: z.number().int().positive(),
  multiplier: z.number().positive(),
  enabled: z.boolean(),
});

export const VolatilityIndicatorsConfigSchema = z.object({
  bollingerBands: BollingerBandsConfigSchema,
  atr: ATRConfigSchema,
  stddev: StdDevConfigSchema,
  keltner: KeltnerConfigSchema,
});

export const OBVConfigSchema = z.object({
  enabled: z.boolean(),
});

export const VWAPVolConfigSchema = z.object({
  enabled: z.boolean(),
});

export const ADLConfigSchema = z.object({
  enabled: z.boolean(),
});

export const CMFConfigSchema = z.object({
  period: z.number().int().positive(),
  enabled: z.boolean(),
});

export const VPTConfigSchema = z.object({
  enabled: z.boolean(),
});

export const VolumeIndicatorsConfigSchema = z.object({
  obv: OBVConfigSchema,
  vwap: VWAPVolConfigSchema,
  adl: ADLConfigSchema,
  cmf: CMFConfigSchema,
  vpt: VPTConfigSchema,
});

export const IndicatorsConfigSchema = z.object({
  trend: TrendIndicatorsConfigSchema,
  momentum: MomentumIndicatorsConfigSchema,
  volatility: VolatilityIndicatorsConfigSchema,
  volume: VolumeIndicatorsConfigSchema,
});

// =============================================================================
// DECISION ENGINE
// =============================================================================
export const WeightsConfigSchema = z.object({
  pattern: z.number().min(0).max(1),
  indicator: z.number().min(0).max(1),
  confluence: z.number().min(0).max(1),
});

export const ConfidenceThresholdsSchema = z.object({
  high: z.number().int().min(50).max(100),
  medium: z.number().int().min(25).max(75),
  low: z.number().int().min(0).max(50),
});

export const TimeframesConfigSchema = z.array(
  z.enum(['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'])
);

export const TradingSessionSchema = z.object({
  enabled: z.boolean(),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23),
});

export const TrendAlignmentConfigSchema = z.object({
  requireUpwardTrend: z.boolean(),
  requireDownwardTrend: z.boolean(),
});

export const NewsFilterConfigSchema = z.object({
  enabled: z.boolean(),
  blacklistHours: z.number().int().nonnegative(),
});

export const DecisionConfigSchema = z.object({
  minConfirmingIndicators: z.number().int().min(1).max(10),
  weights: WeightsConfigSchema,
  confidenceThresholds: ConfidenceThresholdsSchema,
  multiTimeframeConfirm: z.boolean(),
  timeframes: TimeframesConfigSchema,
  trendAlignment: TrendAlignmentConfigSchema,
  tradingSessions: z.object({
    london: TradingSessionSchema,
    newYork: TradingSessionSchema,
    tokyo: TradingSessionSchema,
  }),
  newsFilter: NewsFilterConfigSchema,
});

// =============================================================================
// EXECUTION
// =============================================================================
export const MT5ConfigSchema = z.object({
  host: z.string(),
  port: z.number().int().positive(),
  reconnectInterval: z.number().int().positive(),
  maxRetries: z.number().int().nonnegative(),
  timeout: z.number().int().positive(),
  useDemo: z.boolean(),
});

export const OrderConfigSchema = z.object({
  maxSlippage: z.number().int().nonnegative(),
  marketOnly: z.boolean(),
  allowLimitOrders: z.boolean(),
  allowStopOrders: z.boolean(),
  defaultType: z.enum(['market', 'limit', 'stop']),
  maxDeviation: z.number().int().nonnegative(),
});

export const TrailingStopConfigSchema = z.object({
  enabled: z.boolean(),
  triggerPips: z.number().nonnegative(),
  stepPips: z.number().nonnegative(),
});

export const PositionConfigSchema = z.object({
  breakevenTriggerPips: z.number().nonnegative(),
  breakevenOffsetPips: z.number().nonnegative(),
  trailingStop: TrailingStopConfigSchema,
});

export const ExecutionControlsSchema = z.object({
  blockTradesDuringDrawdown: z.boolean(),
  drawdownThreshold: z.number().nonnegative(),
  maxOrdersPerMinute: z.number().int().positive(),
  manualConfirmThreshold: z.number().positive(),
});

export const ExecutionConfigSchema = z.object({
  mt5: MT5ConfigSchema,
  order: OrderConfigSchema,
  position: PositionConfigSchema,
  controls: ExecutionControlsSchema,
});

// =============================================================================
// BACKTEST
// =============================================================================
export const SpreadConfigSchema = z.object({
  useRealisticSpread: z.boolean(),
  additionalSpread: z.number().nonnegative(),
});

export const SlippageConfigSchema = z.object({
  enabled: z.boolean(),
  pips: z.number().nonnegative(),
});

export const PeriodsConfigSchema = z.object({
  inSampleStart: z.string(),
  inSampleEnd: z.string(),
  outOfSampleStart: z.string(),
  outOfSampleEnd: z.string(),
});

export const OptimizationBacktestConfigSchema = z.object({
  monteCarloSimulations: z.number().int().positive(),
  walkForwardWindows: z.number().int().positive(),
  walkForwardInSample: z.number().min(0.1).max(0.9),
});

export const BacktestConfigSchema = z.object({
  initialBalance: z.number().positive(),
  leverage: z.number().int().positive(),
  commissionPerLot: z.number().nonnegative(),
  spread: SpreadConfigSchema,
  slippage: SlippageConfigSchema,
  periods: PeriodsConfigSchema,
  optimization: OptimizationBacktestConfigSchema,
});

// =============================================================================
// OPTIMIZATION
// =============================================================================
export const GridSearchConfigSchema = z.object({
  maxCombinations: z.number().int().positive(),
  parallel: z.boolean(),
});

export const GeneticConfigSchema = z.object({
  populationSize: z.number().int().positive(),
  generations: z.number().int().positive(),
  mutationRate: z.number().min(0).max(1),
  crossoverRate: z.number().min(0).max(1),
  elitismCount: z.number().int().nonnegative(),
  tournamentSize: z.number().int().positive(),
});

export const WalkForwardConfigSchema = z.object({
  steps: z.number().int().positive(),
  inSamplePercent: z.number().min(0.1).max(0.9),
  outOfSamplePercent: z.number().min(0.1).max(0.9),
  windowType: z.enum(['rolling', 'expanding', 'fixed']),
});

export const BayesianConfigSchema = z.object({
  iterations: z.number().int().positive(),
  explorationWeight: z.number().min(0).max(1),
});

export const FitnessConfigSchema = z.object({
  primary: z.enum(['profit_factor', 'sharpe_ratio', 'sortino_ratio', 'net_profit', 'win_rate']),
  secondary: z.array(z.enum(['sharpe_ratio', 'sortino_ratio', 'win_rate', 'max_drawdown', 'profit_factor'])),
  minTrades: z.number().int().positive(),
  maxDrawdown: z.number().nonnegative(),
});

export const OptimizationConstraintsSchema = z.object({
  maxDrawdownPercent: z.number().nonnegative(),
  minTrades: z.number().int().positive(),
  minWinRate: z.number().min(0).max(100),
  maxConsecutiveLosses: z.number().int().positive(),
});

export const OptimizationConfigSchema = z.object({
  method: z.enum(['grid_search', 'genetic', 'bayesian', 'walk_forward']),
  gridSearch: GridSearchConfigSchema,
  genetic: GeneticConfigSchema,
  walkForward: WalkForwardConfigSchema,
  bayesian: BayesianConfigSchema,
  fitness: FitnessConfigSchema,
  constraints: OptimizationConstraintsSchema,
});

// =============================================================================
// LOGGING
// =============================================================================
export const ConsoleDestinationSchema = z.object({
  enabled: z.boolean(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
});

export const FileDestinationSchema = z.object({
  enabled: z.boolean(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  path: z.string(),
  maxSize: z.string(),
  maxFiles: z.number().int().positive(),
});

export const DatabaseDestinationSchema = z.object({
  enabled: z.boolean(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
});

export const DestinationsConfigSchema = z.object({
  console: ConsoleDestinationSchema,
  file: FileDestinationSchema,
  database: DatabaseDestinationSchema,
});

export const LoggingIncludeSchema = z.object({
  trades: z.boolean(),
  signals: z.boolean(),
  errors: z.boolean(),
  configuration: z.boolean(),
  performance: z.boolean(),
});

export const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']),
  format: z.enum(['json', 'text']),
  destinations: DestinationsConfigSchema,
  include: LoggingIncludeSchema,
});

// =============================================================================
// ENVIRONMENT
// =============================================================================
export const FeaturesConfigSchema = z.object({
  aiDecisionSynthesis: z.boolean(),
  autoTrading: z.boolean(),
  socialTrading: z.boolean(),
  notifications: z.boolean(),
});

export const EnvironmentConfigSchema = z.object({
  mode: z.enum(['development', 'staging', 'production']),
  region: z.string(),
  features: FeaturesConfigSchema,
});

// =============================================================================
// ROOT CONFIG
// =============================================================================
export const TradingConfigSchema = z.object({
  risk: RiskConfigSchema,
  symbols: SymbolsConfigSchema,
  patterns: PatternsConfigSchema,
  indicators: IndicatorsConfigSchema,
  decision: DecisionConfigSchema,
  execution: ExecutionConfigSchema,
  backtest: BacktestConfigSchema,
  optimization: OptimizationConfigSchema,
  logging: LoggingConfigSchema,
  environment: EnvironmentConfigSchema,
});

export type TradingConfig = z.infer<typeof TradingConfigSchema>;
export type RiskConfig = z.infer<typeof RiskConfigSchema>;
export type SymbolSpec = z.infer<typeof SymbolSpecSchema>;
export type SymbolsConfig = z.infer<typeof SymbolsConfigSchema>;
export type PatternsConfig = z.infer<typeof PatternsConfigSchema>;
export type IndicatorsConfig = z.infer<typeof IndicatorsConfigSchema>;
export type DecisionConfig = z.infer<typeof DecisionConfigSchema>;
export type ExecutionConfig = z.infer<typeof ExecutionConfigSchema>;
export type BacktestConfig = z.infer<typeof BacktestConfigSchema>;
export type OptimizationConfig = z.infer<typeof OptimizationConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
