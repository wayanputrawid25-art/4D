# ForexOS Configuration Engine

**Last Updated:** 2026-06-25

Complete guide for ForexOS configuration management. All trading parameters are centralized in `config/trading.yaml` - no hardcoded values allowed.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Configuration File](#configuration-file)
3. [Configuration Service](#configuration-service)
4. [Usage Examples](#usage-examples)
5. [Configuration Sections](#configuration-sections)
6. [Schema Validation](#schema-validation)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CONFIGURATION ENGINE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    config/trading.yaml                       │    │
│  │  (Source of truth for all trading parameters)                │    │
│  └─────────────────────────────────┬───────────────────────────┘    │
│                                    │                                  │
│                                    ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      ConfigLoader                           │    │
│  │  • YAML parsing                                             │    │
│  │  • Path resolution                                          │    │
│  │  • File watching (optional)                                 │    │
│  └─────────────────────────────────┬───────────────────────────┘    │
│                                    │                                  │
│                                    ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   Zod Validation                            │    │
│  │  • Type checking                                            │    │
│  │  • Range validation                                         │    │
│  │  • Constraint enforcement                                   │    │
│  └─────────────────────────────────┬───────────────────────────┘    │
│                                    │                                  │
│                                    ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     ConfigService                            │    │
│  │  • Singleton pattern                                         │    │
│  │  • Typed accessors                                          │    │
│  │  • Hot reload support                                       │    │
│  └─────────────────────────────────┬───────────────────────────┘    │
│                                    │                                  │
│        ┌───────────────────────────┼───────────────────────────┐    │
│        ▼                           ▼                           ▼    │
│  ┌──────────┐              ┌──────────────┐              ┌──────────┐│
│  │  Engine  │              │  Indicators  │              │  Robot   ││
│  │  Package │              │   Package    │              │  Python  ││
│  └──────────┘              └──────────────┘              └──────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Single Source of Truth**: `config/trading.yaml` is the only source for trading parameters
2. **No Hardcoding**: All modules read from `ConfigService`
3. **Type Safety**: Zod schemas provide compile-time and runtime validation
4. **Hot Reload**: Configuration can be reloaded without restart

---

## Configuration File

### Location

```
/
└── config/
    └── trading.yaml    # All trading parameters
```

### Environment-Specific Overrides

For different environments, create:

```
config/
├── trading.yaml           # Base configuration
├── trading.development.yaml  # Development overrides
├── trading.staging.yaml     # Staging overrides
└── trading.production.yaml   # Production overrides
```

### YAML Structure

```yaml
# ForexOS Trading Configuration
# All trading parameters must be defined here. No hardcoding allowed.

# =============================================================================
# SECTION: Risk Management
# =============================================================================
risk:
  maxRiskPerTrade: 2.0
  maxDailyRisk: 6.0
  # ... more risk settings

# =============================================================================
# SECTION: Symbol Configuration
# =============================================================================
symbols:
  EURUSD:
    contractSize: 100000
    # ... symbol-specific settings

# =============================================================================
# SECTION: Pattern Detection
# =============================================================================
patterns:
  minConfidence: 50
  # ... pattern settings

# ... more sections
```

---

## Configuration Service

### Installation

```typescript
import { ConfigService, configService } from '@forexos/trading-config';

// Initialize on app startup
ConfigService.getInstance().initialize();
```

### Initialization

```typescript
// In your app entry point (e.g., src/index.ts or src/app.ts)
import { ConfigService } from '@forexos/trading-config';

// Initialize with default path
ConfigService.getInstance().initialize();

// Or with custom path
ConfigService.getInstance().initialize('/path/to/config.yaml');
```

### Accessing Configuration

```typescript
import { ConfigService } from '@forexos/trading-config';

const config = ConfigService.getInstance();

// Get full config
const allConfig = config.getConfig();

// Get specific sections
const risk = config.getRisk();
const patterns = config.getPatterns();
const indicators = config.getIndicators();
const execution = config.getExecution();
const optimization = config.getOptimization();
const logging = config.getLogging();
const environment = config.getEnvironment();

// Get symbol-specific config
const eurUsdConfig = config.getSymbol('EURUSD');

// Get helper methods
const isAutoTrading = config.isAutoTradingEnabled();
const isProduction = config.isProduction();
const isLondonSession = config.isTradingSessionActive('london', 10);
```

### Hot Reload

```typescript
// Reload configuration from file
ConfigService.getInstance().reload();

// Check if running in production
if (ConfigService.getInstance().isProduction()) {
  // Use stricter settings
}
```

---

## Usage Examples

### Risk Management Module

```typescript
import { ConfigService } from '@forexos/trading-config';

class RiskManager {
  private config = ConfigService.getInstance();

  calculatePositionSize(accountBalance: number, symbol: string): number {
    const riskConfig = this.config.getRisk();
    const symbolConfig = this.config.getSymbol(symbol);
    
    if (!symbolConfig) {
      throw new Error(`Symbol ${symbol} not configured`);
    }

    const riskAmount = accountBalance * (riskConfig.maxRiskPerTrade / 100);
    const pipValue = symbolConfig.pipValue;
    
    // Calculate lot size based on risk
    return riskAmount / (pipValue * 100); // Simplified
  }

  checkDrawdown(currentDrawdown: number): boolean {
    const riskConfig = this.config.getRisk();
    const executionConfig = this.config.getExecution();
    
    if (executionConfig.controls.blockTradesDuringDrawdown) {
      return currentDrawdown < executionConfig.controls.drawdownThreshold;
    }
    return true;
  }
}
```

### Indicator Module

```typescript
import { ConfigService } from '@forexos/trading-config';

class IndicatorCalculator {
  private config = ConfigService.getInstance();

  getRSISettings() {
    return this.config.getIndicators().momentum.rsi;
  }

  calculateRSISignal(value: number): 'overbought' | 'oversold' | 'neutral' {
    const rsi = this.config.getRSISettings();
    
    if (value >= rsi.overbought) return 'overbought';
    if (value <= rsi.oversold) return 'oversold';
    return 'neutral';
  }
}
```

### Execution Module

```typescript
import { ConfigService } from '@forexos/trading-config';

class OrderExecutor {
  private config = ConfigService.getInstance();

  async executeOrder(order: OrderParams) {
    const execConfig = this.config.getExecution();
    
    // Check if market orders only
    if (execConfig.order.marketOnly && order.type !== 'market') {
      throw new Error('Only market orders allowed');
    }
    
    // Apply max slippage from config
    const maxSlippage = execConfig.order.maxSlippage;
    // ... execute order
  }

  async managePosition(position: Position) {
    const posConfig = this.config.getPositionConfig();
    
    // Check trailing stop settings
    if (posConfig.trailingStop.enabled) {
      // Implement trailing stop logic
      const triggerPips = posConfig.trailingStop.triggerPips;
      const stepPips = posConfig.trailingStop.stepPips;
      // ... trailing stop implementation
    }
  }
}
```

### Pattern Detection Module

```typescript
import { ConfigService } from '@forexos/trading-config';

class PatternDetector {
  private config = ConfigService.getInstance();

  isPatternValid(confidence: number): boolean {
    const patternConfig = this.config.getPatterns();
    return confidence >= patternConfig.minConfidence;
  }

  getEnabledPatterns(): string[] {
    const patternConfig = this.config.getPatterns();
    const enabled: string[] = [];
    
    if (patternConfig.candlestick.enabled) {
      enabled.push(...patternConfig.candlestick.patterns);
    }
    if (patternConfig.chart.enabled) {
      enabled.push(...patternConfig.chart.patterns);
    }
    
    return enabled;
  }
}
```

### MT5 Connection Module

```typescript
import { ConfigService } from '@forexos/trading-config';

class MT5Connector {
  private config = ConfigService.getInstance();

  connect() {
    const mt5Config = this.config.getMT5Config();
    
    return {
      host: mt5Config.host,
      port: mt5Config.port,
      timeout: mt5Config.timeout,
      reconnectInterval: mt5Config.reconnectInterval,
      maxRetries: mt5Config.maxRetries,
    };
  }
}
```

---

## Configuration Sections

### Risk Management

```yaml
risk:
  maxRiskPerTrade: 2.0          # Max risk per trade (%)
  maxDailyRisk: 6.0             # Max daily risk (%)
  maxOpenPositions: 5           # Max concurrent positions
  maxCorrelation: 0.5          # Max position correlation (0-1)
  minRiskReward: 1.5            # Minimum risk:reward ratio
  maxDrawdownLimit: 20.0        # Max drawdown before pause (%)
  maxConsecutiveLosses: 5       # Max losses before pause
  positionSizingMethod: adaptive # fixed, kelly, or adaptive
  kellyFraction: 0.25          # Kelly criterion fraction (0-1)
  fixedFractional: 0.02        # Fixed fractional size (2%)
  maxPositionSize: 10.0         # Max lot size
  minPositionSize: 0.01         # Min lot size
```

### Symbol Configuration

```yaml
symbols:
  EURUSD:
    contractSize: 100000        # Contract size (units per lot)
    pipDecimal: 0.0001          # Pip decimal places
    pipValue: 10.0              # Value per pip per lot
    minLot: 0.01                # Minimum lot size
    maxLot: 100.0               # Maximum lot size
    lotStep: 0.01               # Lot size increment
    minSpread: 1                # Minimum spread (pips)
    maxSpread: 50               # Maximum acceptable spread
    marginHedge: 0.5            # Hedge margin requirement
    swapLong: -5.0              # Swap for long positions
    swapShort: -5.0             # Swap for short positions
```

### Pattern Detection

```yaml
patterns:
  minConfidence: 50             # Minimum confidence threshold
  
  candlestick:
    enabled: true
    patterns:
      - doji
      - hammer
      - bullish_engulfing
      # ... more patterns
  
  chart:
    enabled: true
    patterns:
      - head_and_shoulders
      - double_top
      - double_bottom
      # ... more patterns
  
  confluence:
    bullishThreshold: 0.65      # Bullish bias threshold
    bearishThreshold: 0.35      # Bearish bias threshold
    minPatternsForSignal: 2     # Min patterns for valid signal
```

### Indicators

```yaml
indicators:
  trend:
    sma:
      defaultPeriod: 20
      enabled: true
    ema:
      defaultPeriod: 12
      enabled: true
    # ... more trend indicators
  
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
    # ... more momentum indicators
  
  volatility:
    bollingerBands:
      period: 20
      stdDev: 2.0
      enabled: true
    atr:
      defaultPeriod: 14
      enabled: true
    # ... more volatility indicators
  
  volume:
    obv:
      enabled: true
    # ... more volume indicators
```

### Decision Engine

```yaml
decision:
  minConfirmingIndicators: 2    # Min indicators for signal
  
  weights:
    pattern: 0.3               # Pattern weight (0-1)
    indicator: 0.5              # Indicator weight (0-1)
    confluence: 0.2             # Confluence weight (0-1)
  
  confidenceThresholds:
    high: 75                    # High confidence threshold
    medium: 50                 # Medium confidence threshold
    low: 25                    # Low confidence threshold
  
  multiTimeframeConfirm: true   # Require multi-timeframe confirmation
  timeframes:
    - H1                        # Primary timeframe
    - H4                        # Confirmation timeframe
    - D1                        # Trend timeframe
  
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
    blacklistHours: 1           # Hours to avoid around news
```

### Execution

```yaml
execution:
  mt5:
    host: "localhost"
    port: 8888
    reconnectInterval: 5000     # Reconnect interval (ms)
    maxRetries: 3               # Max reconnection attempts
    timeout: 30000              # Connection timeout (ms)
    useDemo: false              # Use demo account
  
  order:
    maxSlippage: 3              # Max slippage (pips)
    marketOnly: false           # Only market orders
    allowLimitOrders: true      # Allow limit orders
    allowStopOrders: true       # Allow stop orders
    defaultType: "market"        # Default order type
    maxDeviation: 5             # Max deviation from request
  
  position:
    breakevenTriggerPips: 10    # Pips profit to trigger breakeven
    breakevenOffsetPips: 2      # Breakeven offset
    trailingStop:
      enabled: true
      triggerPips: 15           # Trigger trailing stop
      stepPips: 5                # Trailing step
  
  controls:
    blockTradesDuringDrawdown: true
    drawdownThreshold: 10.0     # Drawdown threshold (%)
    maxOrdersPerMinute: 3       # Max orders per minute
    manualConfirmThreshold: 1.0 # Require manual confirm (> lots)
```

### Backtest

```yaml
backtest:
  initialBalance: 10000        # Starting balance
  leverage: 100                # Account leverage
  commissionPerLot: 7.0         # Commission per lot
  
  spread:
    useRealisticSpread: true   # Use realistic spreads
    additionalSpread: 1.0      # Added spread (pips)
  
  slippage:
    enabled: true
    pips: 1.0                  # Slippage simulation
  
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

### Optimization

```yaml
optimization:
  method: "walk_forward"        # grid_search, genetic, bayesian, walk_forward
  
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
    windowType: "rolling"       # rolling, expanding, fixed
  
  bayesian:
    iterations: 50
    explorationWeight: 0.1
  
  fitness:
    primary: "profit_factor"
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
```

### Logging

```yaml
logging:
  level: "info"                 # debug, info, warn, error
  format: "json"                # json, text
  
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
    trades: true
    signals: true
    errors: true
    configuration: true
    performance: true
```

### Environment

```yaml
environment:
  mode: "production"           # development, staging, production
  region: "sin1"                # Deployment region
  
  features:
    aiDecisionSynthesis: true  # AI decision support
    autoTrading: false          # Automated trading
    socialTrading: false        # Social trading features
    notifications: true         # Push notifications
```

---

## Schema Validation

### Zod Schemas

All configuration is validated against Zod schemas:

```typescript
// packages/trading-config/src/schema.ts
import { z } from 'zod';

// Risk schema with validation
export const RiskConfigSchema = z.object({
  maxRiskPerTrade: z.number().min(0.1).max(10),
  maxDailyRisk: z.number().min(0.5).max(50),
  maxOpenPositions: z.number().int().min(1).max(20),
  // ... more fields
});

// Symbol schema with validation
export const SymbolSpecSchema = z.object({
  contractSize: z.number().positive(),
  pipDecimal: z.number().positive(),
  pipValue: z.number().positive(),
  minLot: z.number().positive(),
  maxLot: z.number().positive(),
  lotStep: z.number().positive(),
  // ... more fields
});
```

### Validation Rules

| Field | Validation | Example |
|-------|-----------|---------|
| `maxRiskPerTrade` | 0.1 - 10 | 2.0 |
| `maxDailyRisk` | 0.5 - 50 | 6.0 |
| `maxOpenPositions` | 1 - 20 | 5 |
| `minRiskReward` | 0.5 - 5 | 1.5 |
| `positionSizingMethod` | enum | "adaptive" |
| `kellyFraction` | 0.01 - 1 | 0.25 |
| `pipValue` | positive | 10.0 |
| `minLot` | positive | 0.01 |

---

## Best Practices

### 1. Always Use ConfigService

```typescript
// ❌ Bad - Hardcoded value
const MAX_RISK = 2.0;
if (risk > MAX_RISK) {
  // reject
}

// ✅ Good - From config
const riskConfig = ConfigService.getInstance().getRisk();
if (risk > riskConfig.maxRiskPerTrade) {
  // reject
}
```

### 2. Handle Missing Symbol Config

```typescript
// ✅ Good - Safe access
const symbolConfig = ConfigService.getInstance().getSymbol('EURUSD');
if (!symbolConfig) {
  throw new Error('Symbol EURUSD not configured');
}
const pipValue = symbolConfig.pipValue;
```

### 3. Initialize Before Use

```typescript
// ✅ Good - Initialize in app startup
// src/index.ts or src/app.ts
ConfigService.getInstance().initialize();

// ✅ Good - Check initialized
const config = ConfigService.getInstance();
if (!config.isProduction()) {
  // development-specific logic
}
```

### 4. Use Type-Safe Accessors

```typescript
// ✅ Good - Type-safe
const rsi = ConfigService.getInstance().getRSISettings();
// rsi is typed: { defaultPeriod: number; overbought: number; oversold: number; enabled: boolean }

// ❌ Bad - Loose typing
const config: any = ConfigService.getInstance().getConfig();
```

### 5. Validate at Startup

The service validates critical settings on initialization:

```typescript
// Validated automatically:
// - Required symbols (EURUSD, GBPUSD, USDJPY)
// - Risk weight sum (must equal 1)
// - Risk/reward validity
```

---

## Troubleshooting

### Configuration File Not Found

**Error:**
```
Error: Configuration file not found. Searched paths:
/path/to/config/trading.yaml
```

**Solution:**
1. Ensure `config/trading.yaml` exists
2. Check file permissions
3. Verify working directory

### Validation Failed

**Error:**
```
Configuration validation failed:
- risk.maxRiskPerTrade: Number must be less than or equal to 10
```

**Solution:**
1. Check YAML syntax
2. Verify values are within valid ranges (see schema)
3. Run validation: `npm run config:check`

### Service Not Initialized

**Error:**
```
Error: Configuration not initialized. Call ConfigService.getInstance().initialize()
```

**Solution:**
1. Call `initialize()` in app startup
2. Ensure initialization happens before any config access

### Symbol Not Configured

**Error:**
```
Symbol XYZ not configured
```

**Solution:**
1. Add symbol to `config/trading.yaml`:
```yaml
symbols:
  XYZ:
    contractSize: 100000
    pipDecimal: 0.0001
    pipValue: 10.0
    # ... required fields
```

---

## CLI Commands

```bash
# Validate configuration
npm run config:check

# Generate default config
npm run config:generate

# Open config in Drizzle Studio (for database-related config)
npm run config:studio
```

---

## Quick Reference

### ConfigService Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getInstance()` | `ConfigService` | Get singleton instance |
| `initialize(path?)` | `void` | Load and validate config |
| `reload(path?)` | `void` | Reload from file |
| `getConfig()` | `TradingConfig` | Full configuration |
| `getRisk()` | `RiskConfig` | Risk settings |
| `getSymbol(name)` | `SymbolSpec \| undefined` | Symbol config |
| `getPatterns()` | `PatternsConfig` | Pattern settings |
| `getIndicators()` | `IndicatorsConfig` | Indicator settings |
| `getDecision()` | `DecisionConfig` | Decision engine settings |
| `getExecution()` | `ExecutionConfig` | Execution settings |
| `getBacktest()` | `BacktestConfig` | Backtest settings |
| `getOptimization()` | `OptimizationConfig` | Optimization settings |
| `getLogging()` | `LoggingConfig` | Logging settings |
| `getEnvironment()` | `EnvironmentConfig` | Environment settings |
| `isProduction()` | `boolean` | Check production mode |
| `isAutoTradingEnabled()` | `boolean` | Check auto trading |
| `isTradingSessionActive(session, hour)` | `boolean` | Check trading session |

### File Paths

| Purpose | Path |
|---------|------|
| Config file | `config/trading.yaml` |
| Schema | `packages/trading-config/src/schema.ts` |
| Loader | `packages/trading-config/src/loader.ts` |
| Service | `packages/trading-config/src/service.ts` |
| Tests | `packages/trading-config/tests/config.test.ts` |

---

*Last updated: 2026-06-25*
