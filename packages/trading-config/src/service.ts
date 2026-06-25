// Configuration Service - Singleton service for accessing trading configuration
import { TradingConfig, RiskConfig, SymbolSpec, PatternsConfig, IndicatorsConfig, DecisionConfig, ExecutionConfig, BacktestConfig, OptimizationConfig, LoggingConfig, EnvironmentConfig } from './schema';
import { ConfigLoader } from './loader';

/**
 * Configuration Service
 * 
 * This is the single source of truth for all trading configuration.
 * All modules must read their settings from this service.
 * No hardcoded values allowed in trading modules.
 */
export class ConfigService {
  private static instance: ConfigService | null = null;
  private config: TradingConfig;
  private loader: ConfigLoader;
  private initialized: boolean = false;

  private constructor() {
    this.loader = new ConfigLoader();
    this.config = ConfigLoader.getDefaults();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Initialize configuration - call this on app startup
   * Will fail fast if configuration is invalid
   */
  initialize(configPath?: string): void {
    if (this.initialized) {
      throw new Error('Configuration already initialized. Call reload() to refresh.');
    }

    const loader = new ConfigLoader(configPath);
    this.config = loader.load();
    this.initialized = true;
    
    // Validate critical settings
    this.validateCriticalSettings();
  }

  /**
   * Validate critical settings that would cause issues if wrong
   */
  private validateCriticalSettings(): void {
    const errors: string[] = [];

    // Check required symbols
    const requiredSymbols = ['EURUSD', 'GBPUSD', 'USDJPY'];
    for (const symbol of requiredSymbols) {
      if (!this.config.symbols[symbol]) {
        errors.push(`Missing required symbol configuration: ${symbol}`);
      }
    }

    // Check risk settings
    if (this.config.risk.minRiskReward > this.config.risk.maxRiskPerTrade) {
      errors.push('minRiskReward cannot be greater than maxRiskPerTrade');
    }

    // Check decision weights sum to 1
    const weightSum = 
      this.config.decision.weights.pattern +
      this.config.decision.weights.indicator +
      this.config.decision.weights.confluence;
    if (Math.abs(weightSum - 1) > 0.001) {
      errors.push(`Decision weights must sum to 1, got ${weightSum}`);
    }

    if (errors.length > 0) {
      throw new Error(`Critical configuration errors:\n${errors.join('\n')}`);
    }
  }

  /**
   * Reload configuration from file
   */
  reload(configPath?: string): void {
    this.initialized = false;
    this.initialize(configPath);
  }

  /**
   * Get full configuration
   */
  getConfig(): TradingConfig {
    this.ensureInitialized();
    return this.config;
  }

  /**
   * Get risk configuration
   */
  getRisk(): RiskConfig {
    this.ensureInitialized();
    return this.config.risk;
  }

  /**
   * Get symbol specification
   */
  getSymbol(symbol: string): SymbolSpec | undefined {
    this.ensureInitialized();
    return this.config.symbols[symbol];
  }

  /**
   * Get all symbol names
   */
  getSymbolNames(): string[] {
    this.ensureInitialized();
    return Object.keys(this.config.symbols);
  }

  /**
   * Get patterns configuration
   */
  getPatterns(): PatternsConfig {
    this.ensureInitialized();
    return this.config.patterns;
  }

  /**
   * Get indicators configuration
   */
  getIndicators(): IndicatorsConfig {
    this.ensureInitialized();
    return this.config.indicators;
  }

  /**
   * Get decision engine configuration
   */
  getDecision(): DecisionConfig {
    this.ensureInitialized();
    return this.config.decision;
  }

  /**
   * Get execution configuration
   */
  getExecution(): ExecutionConfig {
    this.ensureInitialized();
    return this.config.execution;
  }

  /**
   * Get backtest configuration
   */
  getBacktest(): BacktestConfig {
    this.ensureInitialized();
    return this.config.backtest;
  }

  /**
   * Get optimization configuration
   */
  getOptimization(): OptimizationConfig {
    this.ensureInitialized();
    return this.config.optimization;
  }

  /**
   * Get logging configuration
   */
  getLogging(): LoggingConfig {
    this.ensureInitialized();
    return this.config.logging;
  }

  /**
   * Get environment configuration
   */
  getEnvironment(): EnvironmentConfig {
    this.ensureInitialized();
    return this.config.environment;
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: keyof EnvironmentConfig['features']): boolean {
    this.ensureInitialized();
    return this.config.environment.features[feature];
  }

  /**
   * Get MT5 connection settings
   */
  getMT5Config() {
    this.ensureInitialized();
    return this.config.execution.mt5;
  }

  /**
   * Get order execution settings
   */
  getOrderConfig() {
    this.ensureInitialized();
    return this.config.execution.order;
  }

  /**
   * Get position management settings
   */
  getPositionConfig() {
    this.ensureInitialized();
    return this.config.execution.position;
  }

  /**
   * Get execution controls
   */
  getExecutionControls() {
    this.ensureInitialized();
    return this.config.execution.controls;
  }

  /**
   * Get trailing stop configuration
   */
  getTrailingStopConfig() {
    this.ensureInitialized();
    return this.config.execution.position.trailingStop;
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    this.ensureInitialized();
    return this.config.environment.mode === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    this.ensureInitialized();
    return this.config.environment.mode === 'development';
  }

  /**
   * Check if auto trading is enabled
   */
  isAutoTradingEnabled(): boolean {
    this.ensureInitialized();
    return this.config.environment.features.autoTrading;
  }

  /**
   * Get RSI overbought threshold
   */
  getRSIOverbought(): number {
    return this.config.indicators.momentum.rsi.overbought;
  }

  /**
   * Get RSI oversold threshold
   */
  getRSIOversold(): number {
    return this.config.indicators.momentum.rsi.oversold;
  }

  /**
   * Get MACD settings
   */
  getMACDSettings() {
    return this.config.indicators.momentum.macd;
  }

  /**
   * Get Stochastic settings
   */
  getStochasticSettings() {
    return this.config.indicators.momentum.stoch;
  }

  /**
   * Get Bollinger Bands settings
   */
  getBollingerSettings() {
    return this.config.indicators.volatility.bollingerBands;
  }

  /**
   * Get ATR period
   */
  getATRPeriod(): number {
    return this.config.indicators.volatility.atr.defaultPeriod;
  }

  /**
   * Get confidence threshold for signal strength
   */
  getConfidenceThreshold(strength: 'high' | 'medium' | 'low'): number {
    return this.config.decision.confidenceThresholds[strength];
  }

  /**
   * Get enabled timeframes
   */
  getEnabledTimeframes(): string[] {
    return this.config.decision.timeframes;
  }

  /**
   * Check if trading session is active
   */
  isTradingSessionActive(session: 'london' | 'newYork' | 'tokyo', hour: number): boolean {
    const sessionConfig = this.config.decision.tradingSessions[session];
    if (!sessionConfig.enabled) return false;
    
    if (sessionConfig.startHour <= sessionConfig.endHour) {
      return hour >= sessionConfig.startHour && hour <= sessionConfig.endHour;
    } else {
      // Handle overnight sessions
      return hour >= sessionConfig.startHour || hour <= sessionConfig.endHour;
    }
  }

  /**
   * Ensure configuration is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'Configuration not initialized. Call ConfigService.getInstance().initialize() in your app startup.'
      );
    }
  }

  /**
   * Reset instance (for testing)
   */
  static reset(): void {
    ConfigService.instance = null;
  }
}

// Singleton export
export const configService = ConfigService.getInstance();
export default configService;
