// Configuration Tests
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader } from '../src/loader';
import { ConfigService } from '../src/service';
import { TradingConfigSchema } from '../src/schema';

// Mock config data
const validConfig = {
  risk: {
    maxRiskPerTrade: 2.0,
    maxDailyRisk: 6.0,
    maxOpenPositions: 5,
    maxCorrelation: 0.5,
    minRiskReward: 1.5,
    maxDrawdownLimit: 20.0,
    maxConsecutiveLosses: 5,
    positionSizingMethod: 'adaptive' as const,
    kellyFraction: 0.25,
    fixedFractional: 0.02,
    maxPositionSize: 10.0,
    minPositionSize: 0.01,
  },
  symbols: {
    EURUSD: {
      contractSize: 100000,
      pipDecimal: 0.0001,
      pipValue: 10.0,
      minLot: 0.01,
      maxLot: 100.0,
      lotStep: 0.01,
      minSpread: 1,
      maxSpread: 50,
      marginHedge: 0.5,
      swapLong: -5.0,
      swapShort: -5.0,
    },
  },
  patterns: {
    minConfidence: 50,
    candlestick: {
      enabled: true,
      patterns: ['doji', 'hammer'],
    },
    chart: {
      enabled: true,
      patterns: ['head_and_shoulders'],
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
    timeframes: ['H1', 'H4', 'D1'] as const,
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
      defaultType: 'market' as const,
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
    method: 'walk_forward' as const,
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
      windowType: 'rolling' as const,
    },
    bayesian: { iterations: 50, explorationWeight: 0.1 },
    fitness: {
      primary: 'profit_factor' as const,
      secondary: ['sharpe_ratio', 'win_rate', 'max_drawdown'] as const,
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
    level: 'info' as const,
    format: 'json' as const,
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
    mode: 'production' as const,
    region: 'sin1',
    features: {
      aiDecisionSynthesis: true,
      autoTrading: false,
      socialTrading: false,
      notifications: true,
    },
  },
};

describe('TradingConfigSchema', () => {
  it('should validate a complete valid configuration', () => {
    const result = TradingConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should fail validation for invalid maxRiskPerTrade', () => {
    const invalidConfig = {
      ...validConfig,
      risk: {
        ...validConfig.risk,
        maxRiskPerTrade: 15, // Invalid: max is 10
      },
    };
    const result = TradingConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('should validate valid symbol configuration', () => {
    const result = TradingConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.symbols.EURUSD).toBeDefined();
      expect(result.data.symbols.EURUSD.pipValue).toBe(10.0);
    }
  });

  it('should validate indicator configurations', () => {
    const result = TradingConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.indicators.momentum.rsi.overbought).toBe(70);
      expect(result.data.indicators.momentum.rsi.oversold).toBe(30);
    }
  });

  it('should validate MT5 configuration', () => {
    const result = TradingConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.execution.mt5.host).toBe('localhost');
      expect(result.data.execution.mt5.port).toBe(8888);
    }
  });
});

describe('ConfigLoader', () => {
  const testConfigPath = path.join(__dirname, 'test-trading.yaml');
  const testConfigContent = `
risk:
  maxRiskPerTrade: 2.0
  maxDailyRisk: 6.0
  maxOpenPositions: 5
  maxCorrelation: 0.5
  minRiskReward: 1.5
  maxDrawdownLimit: 20.0
  maxConsecutiveLosses: 5
  positionSizingMethod: adaptive
  kellyFraction: 0.25
  fixedFractional: 0.02
  maxPositionSize: 10.0
  minPositionSize: 0.01

symbols:
  EURUSD:
    contractSize: 100000
    pipDecimal: 0.0001
    pipValue: 10.0
    minLot: 0.01
    maxLot: 100.0
    lotStep: 0.01
    minSpread: 1
    maxSpread: 50
    marginHedge: 0.5
    swapLong: -5.0
    swapShort: -5.0

patterns:
  minConfidence: 50
  candlestick:
    enabled: true
    patterns:
      - doji
      - hammer
  chart:
    enabled: true
    patterns:
      - head_and_shoulders
  confluence:
    bullishThreshold: 0.65
    bearishThreshold: 0.35
    minPatternsForSignal: 2

indicators:
  trend:
    sma:
      defaultPeriod: 20
      enabled: true
    ema:
      defaultPeriod: 12
      enabled: true
    wma:
      defaultPeriod: 20
      enabled: true
    dema:
      defaultPeriod: 20
      enabled: true
    tema:
      defaultPeriod: 20
      enabled: true
    vwap:
      enabled: true
    ichimoku:
      enabled: true
      tenkanPeriod: 9
      kijunPeriod: 26
      senkouPeriod: 52
  momentum:
    rsi:
      defaultPeriod: 14
      overbought: 70
      oversold: 30
      enabled: true
    macd:
      fastPeriod: 12
      slowPeriod: 26
      signalPeriod: 9
      enabled: true
    stoch:
      kPeriod: 14
      dPeriod: 3
      smoothK: 3
      overbought: 80
      oversold: 20
      enabled: true
    adx:
      defaultPeriod: 14
      trendThreshold: 25
      enabled: true
    momentum:
      defaultPeriod: 14
      enabled: true
    roc:
      defaultPeriod: 14
      enabled: true
  volatility:
    bollingerBands:
      period: 20
      stdDev: 2.0
      enabled: true
    atr:
      defaultPeriod: 14
      enabled: true
    stddev:
      defaultPeriod: 20
      enabled: true
    keltner:
      emaPeriod: 20
      atrPeriod: 10
      multiplier: 2.0
      enabled: true
  volume:
    obv:
      enabled: true
    vwap:
      enabled: true
    adl:
      enabled: true
    cmf:
      period: 20
      enabled: true
    vpt:
      enabled: true

decision:
  minConfirmingIndicators: 2
  weights:
    pattern: 0.3
    indicator: 0.5
    confluence: 0.2
  confidenceThresholds:
    high: 75
    medium: 50
    low: 25
  multiTimeframeConfirm: true
  timeframes:
    - H1
    - H4
    - D1
  trendAlignment:
    requireUpwardTrend: true
    requireDownwardTrend: true
  tradingSessions:
    london:
      enabled: true
      startHour: 8
      endHour: 12
    newYork:
      enabled: true
      startHour: 13
      endHour: 17
    tokyo:
      enabled: false
      startHour: 0
      endHour: 6
  newsFilter:
    enabled: true
    blacklistHours: 1

execution:
  mt5:
    host: localhost
    port: 8888
    reconnectInterval: 5000
    maxRetries: 3
    timeout: 30000
    useDemo: false
  order:
    maxSlippage: 3
    marketOnly: false
    allowLimitOrders: true
    allowStopOrders: true
    defaultType: market
    maxDeviation: 5
  position:
    breakevenTriggerPips: 10
    breakevenOffsetPips: 2
    trailingStop:
      enabled: true
      triggerPips: 15
      stepPips: 5
  controls:
    blockTradesDuringDrawdown: true
    drawdownThreshold: 10.0
    maxOrdersPerMinute: 3
    manualConfirmThreshold: 1.0

backtest:
  initialBalance: 10000
  leverage: 100
  commissionPerLot: 7.0
  spread:
    useRealisticSpread: true
    additionalSpread: 1.0
  slippage:
    enabled: true
    pips: 1.0
  periods:
    inSampleStart: "2020-01-01"
    inSampleEnd: "2022-12-31"
    outOfSampleStart: "2023-01-01"
    outOfSampleEnd: "2024-12-31"
  optimization:
    monteCarloSimulations: 1000
    walkForwardWindows: 5
    walkForwardInSample: 0.7

optimization:
  method: walk_forward
  gridSearch:
    maxCombinations: 10000
    parallel: true
  genetic:
    populationSize: 50
    generations: 100
    mutationRate: 0.1
    crossoverRate: 0.8
    elitismCount: 5
    tournamentSize: 3
  walkForward:
    steps: 5
    inSamplePercent: 0.7
    outOfSamplePercent: 0.3
    windowType: rolling
  bayesian:
    iterations: 50
    explorationWeight: 0.1
  fitness:
    primary: profit_factor
    secondary:
      - sharpe_ratio
      - win_rate
      - max_drawdown
    minTrades: 30
    maxDrawdown: 20.0
  constraints:
    maxDrawdownPercent: 20.0
    minTrades: 30
    minWinRate: 40.0
    maxConsecutiveLosses: 8

logging:
  level: info
  format: json
  destinations:
    console:
      enabled: true
      level: info
    file:
      enabled: true
      level: debug
      path: ./logs/trading.log
      maxSize: 10mb
      maxFiles: 5
    database:
      enabled: false
      level: warn
  include:
    trades: true
    signals: true
    errors: true
    configuration: true
    performance: true

environment:
  mode: production
  region: sin1
  features:
    aiDecisionSynthesis: true
    autoTrading: false
    socialTrading: false
    notifications: true
`;

  beforeEach(() => {
    // Write test config file
    fs.writeFileSync(testConfigPath, testConfigContent);
  });

  it('should load configuration from file', () => {
    const loader = new ConfigLoader(testConfigPath);
    const config = loader.load();
    
    expect(config.risk.maxRiskPerTrade).toBe(2.0);
    expect(config.symbols.EURUSD).toBeDefined();
  });

  it('should return defaults when no file exists', () => {
    const defaults = ConfigLoader.getDefaults();
    
    expect(defaults.risk.maxRiskPerTrade).toBe(2.0);
  });

  it('should validate configuration', () => {
    const loader = new ConfigLoader(testConfigPath);
    const result = loader.validate();
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('ConfigService', () => {
  beforeEach(() => {
    // Reset singleton
    ConfigService.reset();
  });

  it('should throw if not initialized', () => {
    const service = ConfigService.getInstance();
    
    expect(() => service.getConfig()).toThrow();
  });

  it('should get singleton instance', () => {
    const instance1 = ConfigService.getInstance();
    const instance2 = ConfigService.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it('should provide access to risk configuration', () => {
    const defaults = ConfigLoader.getDefaults();
    
    expect(defaults.risk.maxRiskPerTrade).toBe(2.0);
    expect(defaults.risk.maxDailyRisk).toBe(6.0);
  });

  it('should provide access to indicator configuration', () => {
    const defaults = ConfigLoader.getDefaults();
    
    expect(defaults.indicators.momentum.rsi.overbought).toBe(70);
    expect(defaults.indicators.momentum.rsi.oversold).toBe(30);
  });

  it('should provide access to MT5 configuration', () => {
    const defaults = ConfigLoader.getDefaults();
    
    expect(defaults.execution.mt5.host).toBe('localhost');
    expect(defaults.execution.mt5.port).toBe(8888);
  });

  it('should provide access to pattern configuration', () => {
    const defaults = ConfigLoader.getDefaults();
    
    expect(defaults.patterns.minConfidence).toBe(50);
    expect(defaults.patterns.candlestick.enabled).toBe(true);
  });

  it('should provide access to optimization configuration', () => {
    const defaults = ConfigLoader.getDefaults();
    
    expect(defaults.optimization.method).toBe('walk_forward');
    expect(defaults.optimization.genetic.populationSize).toBe(50);
  });
});
