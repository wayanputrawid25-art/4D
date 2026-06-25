# ForexOS Configuration Guide

Complete reference for `config/trading.yaml` configuration options.

---

## Table of Contents

1. [Risk Management](#risk-management)
2. [Symbol Configuration](#symbol-configuration)
3. [Pattern Detection](#pattern-detection)
4. [Indicators](#indicators)
5. [Decision Engine](#decision-engine)
6. [Execution](#execution)
7. [Backtest](#backtest)
8. [Optimization](#optimization)
9. [Logging](#logging)
10. [Environment](#environment)

---

## Risk Management

Controls position sizing and risk limits.

```yaml
risk:
  maxRiskPerTrade: 2.0        # Max risk per trade (%)
  maxDailyRisk: 6.0           # Max daily risk (%)
  maxOpenPositions: 5           # Maximum open positions
  maxCorrelation: 0.5           # Max correlation between positions (0-1)
  minRiskReward: 1.5           # Minimum risk-reward ratio
  maxDrawdownLimit: 20.0        # Max drawdown before pause (%)
  maxConsecutiveLosses: 5       # Max losses before pause
  positionSizingMethod: adaptive # fixed | kelly | adaptive
  kellyFraction: 0.25           # Kelly fraction (0-1)
  fixedFractional: 0.02         # Fixed fractional (2%)
  maxPositionSize: 10.0         # Max lot size
  minPositionSize: 0.01         # Min lot size
```

### Position Sizing Methods

| Method | Description |
|--------|-------------|
| `fixed` | Fixed lot size |
| `kelly` | Kelly criterion based sizing |
| `adaptive` | Adapts based on confidence |

---

## Symbol Configuration

Defines trading specifications for each symbol.

```yaml
symbols:
  EURUSD:
    contractSize: 100000      # Contract size (units per lot)
    pipDecimal: 0.0001        # Pip decimal places
    pipValue: 10.0            # Pip value in account currency
    minLot: 0.01              # Minimum lot size
    maxLot: 100.0             # Maximum lot size
    lotStep: 0.01             # Lot size increment
    minSpread: 1              # Minimum spread (pips)
    maxSpread: 50              # Maximum acceptable spread
    marginHedge: 0.5           # Hedge margin requirement (0.5 = 50%)
    swapLong: -5.0             # Swap for long positions
    swapShort: -5.0            # Swap for short positions
```

### Supported Symbols

| Symbol | Description | Pip Decimal |
|--------|-------------|------------|
| EURUSD | Euro/US Dollar | 0.0001 |
| GBPUSD | British Pound/US Dollar | 0.0001 |
| USDJPY | US Dollar/Japanese Yen | 0.01 |
| USDCHF | US Dollar/Swiss Franc | 0.0001 |
| AUDUSD | Australian Dollar/US Dollar | 0.0001 |
| USDCAD | US Dollar/Canadian Dollar | 0.0001 |
| XAUUSD | Gold/US Dollar | 0.01 |

---

## Pattern Detection

Controls candlestick and chart pattern detection.

```yaml
patterns:
  minConfidence: 50            # Minimum confidence threshold (0-100)
  
  candlestick:
    enabled: true
    patterns:
      - doji                  # Doji - indecision
      - hammer                # Hammer - bullish reversal
      - inverted_hammer      # Inverted hammer
      - bullish_engulfing     # Bullish engulfing pattern
      - bearish_engulfing      # Bearish engulfing pattern
      - morning_star          # Morning star - bullish
      - evening_star          # Evening star - bearish
      - piercing_line         # Piercing line - bullish
      - dark_cloud_cover       # Dark cloud cover - bearish
      - harami               # Harami - reversal
      - shooting_star        # Shooting star - bearish
      - spinning_top         # Spinning top - indecision
      - marubozu            # Marubozu - strong trend
  
  chart:
    enabled: true
    patterns:
      - head_and_shoulders
      - inverse_head_and_shoulders
      - double_top
      - double_bottom
      - triple_top
      - triple_bottom
      - ascending_triangle
      - descending_triangle
      - symmetrical_triangle
      - rising_wedge
      - falling_wedge
      - bull_flag
      - bear_flag
      - pennant_bullish
      - pennant_bearish
  
  confluence:
    bullishThreshold: 0.65    # Threshold for bullish bias
    bearishThreshold: 0.35    # Threshold for bearish bias
    minPatternsForSignal: 2   # Minimum patterns for valid signal
```

---

## Indicators

Technical indicator configurations.

### Trend Indicators

```yaml
indicators:
  trend:
    sma:
      defaultPeriod: 20        # Simple MA period
      enabled: true
    ema:
      defaultPeriod: 12        # Exponential MA period
      enabled: true
    wma:
      defaultPeriod: 20        # Weighted MA period
      enabled: true
    dema:
      defaultPeriod: 20        # Double EMA period
      enabled: true
    tema:
      defaultPeriod: 20        # Triple EMA period
      enabled: true
    vwap:
      enabled: true            # Volume Weighted Average Price
    ichimoku:
      enabled: true
      tenkanPeriod: 9          # Conversion line
      kijunPeriod: 26          # Base line
      senkouPeriod: 52         # Span lines
```

### Momentum Indicators

```yaml
  momentum:
    rsi:
      defaultPeriod: 14        # RSI period
      overbought: 70           # Overbought threshold
      oversold: 30            # Oversold threshold
      enabled: true
    macd:
      fastPeriod: 12           # Fast EMA period
      slowPeriod: 26           # Slow EMA period
      signalPeriod: 9          # Signal line period
      enabled: true
    stochastic:
      kPeriod: 14            # %K period
      dPeriod: 3               # %D period
      smoothK: 3               # %K smoothing
      overbought: 80           # Overbought threshold
      oversold: 20            # Oversold threshold
      enabled: true
    adx:
      defaultPeriod: 14        # ADX period
      trendThreshold: 25        # Trend strength threshold
      enabled: true
    momentum:
      defaultPeriod: 14        # Momentum period
      enabled: true
    roc:
      defaultPeriod: 14        # Rate of change period
      enabled: true
```

### Volatility Indicators

```yaml
  volatility:
    bollingerBands:
      period: 20                # MA period
      stdDev: 2.0             # Standard deviations
      enabled: true
    atr:
      defaultPeriod: 14        # ATR period
      enabled: true
    stddev:
      defaultPeriod: 20        # Standard deviation period
      enabled: true
    keltner:
      emaPeriod: 20            # EMA period
      atrPeriod: 10             # ATR period
      multiplier: 2.0          # ATR multiplier
      enabled: true
```

### Volume Indicators

```yaml
  volume:
    obv:
      enabled: true             # On Balance Volume
    vwap:
      enabled: true            # VWAP
    adl:
      enabled: true            # Accumulation/Distribution
    cmf:
      period: 20               # Chaikin Money Flow period
      enabled: true
    vpt:
      enabled: true            # Volume Price Trend
```

---

## Decision Engine

Controls signal generation and trade decisions.

```yaml
decision:
  minConfirmingIndicators: 2   # Min indicators to confirm signal
  
  weights:
    pattern: 0.3               # Pattern weight (0-1)
    indicator: 0.5              # Indicator weight (0-1)
    confluence: 0.2             # Confluence weight (0-1)
  
  confidenceThresholds:
    high: 75                   # High confidence (>=75)
    medium: 50                  # Medium confidence (>=50)
    low: 25                    # Low confidence (>=25)
  
  multiTimeframeConfirm: true   # Require multi-TF confirmation
  timeframes:
    - H1                      # Primary timeframe
    - H4                      # Secondary timeframe
    - D1                      # Tertiary timeframe
  
  trendAlignment:
    requireUpwardTrend: true   # Require bullish trend
    requireDownwardTrend: true  # Require bearish trend
  
  tradingSessions:
    london:
      enabled: true
      startHour: 8             # 8 AM UTC
      endHour: 12              # 12 PM UTC
    newYork:
      enabled: true
      startHour: 13            # 1 PM UTC
      endHour: 17              # 5 PM UTC
    tokyo:
      enabled: false
      startHour: 0
      endHour: 6
  
  newsFilter:
    enabled: true
    blacklistHours: 1          # Hours before/after news
```

---

## Execution

MT5 connection and order execution settings.

```yaml
execution:
  mt5:
    host: "localhost"          # MT5 bridge host
    port: 8888                 # MT5 bridge port
    reconnectInterval: 5000     # Reconnect interval (ms)
    maxRetries: 3              # Max reconnection attempts
    timeout: 30000             # Request timeout (ms)
    useDemo: false            # Use demo mode
  
  order:
    maxSlippage: 3             # Max slippage (pips)
    marketOnly: false           # Only market orders
    allowLimitOrders: true     # Allow limit orders
    allowStopOrders: true      # Allow stop orders
    defaultType: "market"      # market | limit | stop
    maxDeviation: 5            # Max price deviation
  
  position:
    breakevenTriggerPips: 10   # Pips profit before breakeven
    breakevenOffsetPips: 2     # Breakeven offset
    trailingStop:
      enabled: true
      triggerPips: 15          # Trigger trailing stop
      stepPips: 5              # Trail step
  
  controls:
    blockTradesDuringDrawdown: true
    drawdownThreshold: 10.0    # Block trades if DD > 10%
    maxOrdersPerMinute: 3       # Rate limit
    manualConfirmThreshold: 1.0  # Manual confirm for lots > 1.0
```

---

## Backtest

Backtesting and simulation settings.

```yaml
backtest:
  initialBalance: 10000         # Starting balance
  leverage: 100                # Account leverage
  commissionPerLot: 7.0         # Commission per lot
  
  spread:
    useRealisticSpread: true   # Use realistic spread
    additionalSpread: 1.0       # Add to historical (pips)
  
  slippage:
    enabled: true
    pips: 1.0                 # Slippage simulation
  
  periods:
    inSampleStart: "2020-01-01"
    inSampleEnd: "2022-12-31"
    outOfSampleStart: "2023-01-01"
    outOfSampleEnd: "2024-12-31"
  
  optimization:
    monteCarloSimulations: 1000
    walkForwardWindows: 5
    walkForwardInSample: 0.7
```

---

## Optimization

Strategy optimization settings.

```yaml
optimization:
  method: "walk_forward"         # grid_search | genetic | bayesian | walk_forward
  
  gridSearch:
    maxCombinations: 10000     # Max parameter combinations
    parallel: true             # Parallel execution
  
  genetic:
    populationSize: 50          # Population size
    generations: 100            # Number of generations
    mutationRate: 0.1          # Mutation probability
    crossoverRate: 0.8          # Crossover probability
    elitismCount: 5            # Best to preserve
    tournamentSize: 3          # Tournament selection size
  
  walkForward:
    steps: 5                   # Number of windows
    inSamplePercent: 0.7         # 70% in-sample
    outOfSamplePercent: 0.3      # 30% out-of-sample
    windowType: "rolling"        # rolling | expanding | fixed
  
  bayesian:
    iterations: 50             # Optimization iterations
    explorationWeight: 0.1      # Exploration factor
  
  fitness:
    primary: "profit_factor"   # Main optimization metric
    secondary:                 # Track additional metrics
      - sharpe_ratio
      - win_rate
      - max_drawdown
    minTrades: 30              # Min trades for valid result
    maxDrawdown: 20.0          # Max acceptable drawdown
  
  constraints:
    maxDrawdownPercent: 20.0    # Max drawdown constraint
    minTrades: 30              # Minimum trade count
    minWinRate: 40.0           # Minimum win rate
    maxConsecutiveLosses: 8     # Max consecutive losses
```

### Fitness Metrics

| Metric | Description |
|--------|-------------|
| `net_profit` | Total profit |
| `profit_factor` | Gross profit / Gross loss |
| `sharpe_ratio` | Risk-adjusted return |
| `sortino_ratio` | Downside risk-adjusted |
| `win_rate` | Winning trade percentage |
| `max_drawdown` | Maximum drawdown |

---

## Logging

Logging configuration.

```yaml
logging:
  level: "info"                # debug | info | warn | error
  format: "json"               # json | text
  
  destinations:
    console:
      enabled: true
      level: "info"
    file:
      enabled: true
      level: "debug"
      path: "./logs/trading.log"
      maxSize: "10mb"
      maxFiles: 5
    database:
      enabled: false
      level: "warn"
  
  include:
    trades: true               # Log trade events
    signals: true              # Log signal generation
    errors: true               # Log errors
    configuration: true        # Log config loading
    performance: true          # Log performance metrics
```

---

## Environment

Application environment settings.

```yaml
environment:
  mode: "production"           # development | staging | production
  region: "sin1"               # Deployment region
  
  features:
    aiDecisionSynthesis: true   # AI-powered decision synthesis
    autoTrading: false         # Allow automatic trading
    socialTrading: false       # Social trading features
    notifications: true         # Enable notifications
```

---

## Configuration Loading

The configuration is loaded automatically on application startup:

```typescript
import { configService } from '@forexos/trading-config';

// Initialize with default path
configService.initialize();

// Or with custom path
configService.initialize('/path/to/config.yaml');

// Access configuration
const riskConfig = configService.getRisk();
const symbolSpec = configService.getSymbol('EURUSD');
```

### Fail-Fast Validation

The system will fail on startup if:
- Required symbols (EURUSD, GBPUSD, USDJPY) are missing
- Decision weights don't sum to 1.0
- Configuration file cannot be parsed
- Invalid values for any setting

---

## Environment Variables

Override configuration with environment variables:

| Variable | Description |
|----------|-------------|
| `MT5_HOST` | MT5 bridge host |
| `MT5_PORT` | MT5 bridge port |
| `MT5_LOGIN` | MT5 account login |
| `MT5_PASSWORD` | MT5 account password |
| `MT5_SERVER` | MT5 server |
| `MT5_USE_DEMO` | Use demo mode (true/false) |

---

*Last updated: 2026-06-24*
