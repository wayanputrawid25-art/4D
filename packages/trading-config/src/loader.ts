// Configuration Loader - Loads and validates trading configuration
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'yaml';
import { TradingConfigSchema, TradingConfig } from './schema';

export class ConfigLoader {
  private config: TradingConfig | null = null;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || this.findConfigPath();
  }

  /**
   * Find the configuration file path
   */
  private findConfigPath(): string {
    const possiblePaths = [
      path.join(process.cwd(), 'config', 'trading.yaml'),
      path.join(process.cwd(), 'config', 'trading.yml'),
      path.join(__dirname, '..', '..', '..', 'config', 'trading.yaml'),
      path.join(__dirname, '..', '..', '..', '..', 'config', 'trading.yaml'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    throw new Error(
      `Configuration file not found. Searched paths:\n${possiblePaths.join('\n')}`
    );
  }

  /**
   * Load configuration from file
   */
  load(): TradingConfig {
    if (this.config) {
      return this.config;
    }

    try {
      const fileContent = fs.readFileSync(this.configPath, 'utf-8');
      const rawConfig = parse(fileContent);
      
      // Validate and parse
      const result = TradingConfigSchema.safeParse(rawConfig);
      
      if (!result.success) {
        const errors = result.error.errors.map(
          e => `  - ${e.path.join('.')}: ${e.message}`
        ).join('\n');
        
        throw new Error(
          `Configuration validation failed:\n${errors}\n\n` +
          `Please fix config/trading.yaml and restart.`
        );
      }

      this.config = result.data;
      return this.config;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Configuration validation failed')) {
        throw error;
      }
      throw new Error(
        `Failed to load configuration from ${this.configPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Reload configuration from file
   */
  reload(): TradingConfig {
    this.config = null;
    return this.load();
  }

  /**
   * Get current configuration
   */
  getConfig(): TradingConfig {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }

  /**
   * Validate configuration without loading
   */
  validate(configPath?: string): { valid: boolean; errors: string[] } {
    try {
      const filePath = configPath || this.configPath;
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const rawConfig = parse(fileContent);
      const result = TradingConfigSchema.safeParse(rawConfig);

      if (result.success) {
        return { valid: true, errors: [] };
      }

      const errors = result.error.errors.map(
        e => `${e.path.join('.')}: ${e.message}`
      );
      return { valid: false, errors };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Get default configuration
   */
  static getDefaults(): TradingConfig {
    return {
      risk: {
        maxRiskPerTrade: 2.0,
        maxDailyRisk: 6.0,
        maxOpenPositions: 5,
        maxCorrelation: 0.5,
        minRiskReward: 1.5,
        maxDrawdownLimit: 20.0,
        maxConsecutiveLosses: 5,
        positionSizingMethod: 'adaptive',
        kellyFraction: 0.25,
        fixedFractional: 0.02,
        maxPositionSize: 10.0,
        minPositionSize: 0.01,
      },
      symbols: {},
      patterns: {
        minConfidence: 50,
        candlestick: {
          enabled: true,
          patterns: [
            'doji', 'hammer', 'inverted_hammer', 'bullish_engulfing', 'bearish_engulfing',
            'morning_star', 'evening_star', 'piercing_line', 'dark_cloud_cover',
            'harami', 'shooting_star', 'spinning_top', 'marubozu'
          ],
        },
        chart: {
          enabled: true,
          patterns: [
            'head_and_shoulders', 'inverse_head_and_shoulders', 'double_top', 'double_bottom',
            'triple_top', 'triple_bottom', 'ascending_triangle', 'descending_triangle',
            'symmetrical_triangle', 'rising_wedge', 'falling_wedge', 'bull_flag', 'bear_flag'
          ],
        },
        confluence: {
          bullishThreshold: 0.65,
          bearishThreshold: 0.35,
          minPatternsForSignal: 2,
        },
      },
      indicators: {
        trend: {
          sma: { defaultPeriod: 20, enabled: true },
          ema: { defaultPeriod: 12, enabled: true },
          wma: { defaultPeriod: 20, enabled: true },
          dema: { defaultPeriod: 20, enabled: true },
          tema: { defaultPeriod: 20, enabled: true },
          vwap: { enabled: true },
          ichimoku: { enabled: true, tenkanPeriod: 9, kijunPeriod: 26, senkouPeriod: 52 },
        },
        momentum: {
          rsi: { defaultPeriod: 14, overbought: 70, oversold: 30, enabled: true },
          macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, enabled: true },
          stoch: { kPeriod: 14, dPeriod: 3, smoothK: 3, overbought: 80, oversold: 20, enabled: true },
          adx: { defaultPeriod: 14, trendThreshold: 25, enabled: true },
          momentum: { defaultPeriod: 14, enabled: true },
          roc: { defaultPeriod: 14, enabled: true },
        },
        volatility: {
          bollingerBands: { period: 20, stdDev: 2.0, enabled: true },
          atr: { defaultPeriod: 14, enabled: true },
          stddev: { defaultPeriod: 20, enabled: true },
          keltner: { emaPeriod: 20, atrPeriod: 10, multiplier: 2.0, enabled: true },
        },
        volume: {
          obv: { enabled: true },
          vwap: { enabled: true },
          adl: { enabled: true },
          cmf: { period: 20, enabled: true },
          vpt: { enabled: true },
        },
      },
      decision: {
        minConfirmingIndicators: 2,
        weights: { pattern: 0.3, indicator: 0.5, confluence: 0.2 },
        confidenceThresholds: { high: 75, medium: 50, low: 25 },
        multiTimeframeConfirm: true,
        timeframes: ['H1', 'H4', 'D1'],
        trendAlignment: { requireUpwardTrend: true, requireDownwardTrend: true },
        tradingSessions: {
          london: { enabled: true, startHour: 8, endHour: 12 },
          newYork: { enabled: true, startHour: 13, endHour: 17 },
          tokyo: { enabled: false, startHour: 0, endHour: 6 },
        },
        newsFilter: { enabled: true, blacklistHours: 1 },
      },
      execution: {
        mt5: {
          host: 'localhost',
          port: 8888,
          reconnectInterval: 5000,
          maxRetries: 3,
          timeout: 30000,
          useDemo: false,
        },
        order: {
          maxSlippage: 3,
          marketOnly: false,
          allowLimitOrders: true,
          allowStopOrders: true,
          defaultType: 'market',
          maxDeviation: 5,
        },
        position: {
          breakevenTriggerPips: 10,
          breakevenOffsetPips: 2,
          trailingStop: { enabled: true, triggerPips: 15, stepPips: 5 },
        },
        controls: {
          blockTradesDuringDrawdown: true,
          drawdownThreshold: 10.0,
          maxOrdersPerMinute: 3,
          manualConfirmThreshold: 1.0,
        },
      },
      backtest: {
        initialBalance: 10000,
        leverage: 100,
        commissionPerLot: 7.0,
        spread: { useRealisticSpread: true, additionalSpread: 1.0 },
        slippage: { enabled: true, pips: 1.0 },
        periods: {
          inSampleStart: '2020-01-01',
          inSampleEnd: '2022-12-31',
          outOfSampleStart: '2023-01-01',
          outOfSampleEnd: '2024-12-31',
        },
        optimization: {
          monteCarloSimulations: 1000,
          walkForwardWindows: 5,
          walkForwardInSample: 0.7,
        },
      },
      optimization: {
        method: 'walk_forward',
        gridSearch: { maxCombinations: 10000, parallel: true },
        genetic: {
          populationSize: 50,
          generations: 100,
          mutationRate: 0.1,
          crossoverRate: 0.8,
          elitismCount: 5,
          tournamentSize: 3,
        },
        walkForward: {
          steps: 5,
          inSamplePercent: 0.7,
          outOfSamplePercent: 0.3,
          windowType: 'rolling',
        },
        bayesian: { iterations: 50, explorationWeight: 0.1 },
        fitness: {
          primary: 'profit_factor',
          secondary: ['sharpe_ratio', 'win_rate', 'max_drawdown'],
          minTrades: 30,
          maxDrawdown: 20.0,
        },
        constraints: {
          maxDrawdownPercent: 20.0,
          minTrades: 30,
          minWinRate: 40.0,
          maxConsecutiveLosses: 8,
        },
      },
      logging: {
        level: 'info',
        format: 'json',
        destinations: {
          console: { enabled: true, level: 'info' },
          file: { enabled: true, level: 'debug', path: './logs/trading.log', maxSize: '10mb', maxFiles: 5 },
          database: { enabled: false, level: 'warn' },
        },
        include: {
          trades: true,
          signals: true,
          errors: true,
          configuration: true,
          performance: true,
        },
      },
      environment: {
        mode: 'production',
        region: 'sin1',
        features: {
          aiDecisionSynthesis: true,
          autoTrading: false,
          socialTrading: false,
          notifications: true,
        },
      },
    };
  }
}
