// Risk Engine - Comprehensive Risk Management
import type { Candle, Timeframe } from '@forexos/types';
import { atr } from '../indicators/volatility';
import type {
  AccountStatus,
  Position,
  Order,
  RiskParameters,
  PositionSizeResult,
  TradeValidation,
  RiskMetrics,
  DrawdownState,
  CorrelationEntry,
  RiskSummary,
  TradeRiskAssessment,
  CurrencyExposure,
  SessionRisk,
  RiskEngineOptions,
  SymbolSpecs,
  DEFAULT_RISK_PARAMS,
  DEFAULT_SYMBOL_SPECS,
} from './types';

export const DEFAULT_RISK_PARAMS = {
  maxRiskPerTrade: 1.0,
  maxDailyRisk: 3.0,
  maxWeeklyRisk: 6.0,
  maxDrawdown: 10.0,
  maxOpenPositions: 5,
  maxCorrelation: 0.7,
  minRiskReward: 2.0,
  maxLeverage: 100,
  minMarginLevel: 150,
  maxVolumePerTrade: 1.0,
  trailingStop: true,
  trailingStep: 15,
} as const;

export const DEFAULT_SYMBOL_SPECS = {
  contractSize: 100000,
  pipDecimal: 0.0001,
  pipValue: 10,
  minLot: 0.01,
  maxLot: 100,
  lotStep: 0.01,
  commission: 0,
  swapLong: -0.5,
  swapShort: 0.5,
} as const;

/**
 * Currency pairs by base currency
 */
const CURRENCY_MATRIX: Record<string, string[]> = {
  USD: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD'],
  EUR: ['EURUSD', 'EURGBP', 'EURJPY', 'EURCHF', 'EURAUD', 'EURCAD'],
  GBP: ['GBPUSD', 'EURGBP', 'GBPJPY', 'GBPCHF', 'GBPAUD', 'GBPCAD'],
  JPY: ['USDJPY', 'EURJPY', 'GBPJPY', 'USDJPY'],
  AUD: ['AUDUSD', 'EURAUD', 'GBPAUD', 'AUDJPY'],
  CAD: ['USDCAD', 'EURCAD', 'GBPCAD', 'CADJPY'],
  CHF: ['USDCHF', 'EURCHF', 'GBPCHF', 'CHFJPY'],
};

/**
 * Extract base currency from symbol
 */
function getBaseCurrency(symbol: string): string {
  const quoteCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF'];
  for (const quote of quoteCurrencies) {
    if (symbol.endsWith(quote)) {
      return symbol.replace(quote, '');
    }
  }
  return 'USD';
}

/**
 * Risk Engine - Comprehensive risk management
 */
export class RiskEngine {
  private params: RiskParameters;
  private accountBalance: number;
  private accountCurrency: string;
  private leverage: number;
  private positions: Position[] = [];
  private orders: Order[] = [];
  private dailyLoss: number = 0;
  private weeklyLoss: number = 0;
  private peakBalance: number;
  private consecutiveLosers: number = 0;
  private maxConsecutiveLosers: number = 0;
  private sessions: SessionRisk[] = [];

  constructor(options: RiskEngineOptions) {
    this.params = { ...DEFAULT_RISK_PARAMS, ...options.parameters };
    this.accountBalance = options.accountBalance;
    this.accountCurrency = options.accountCurrency || 'USD';
    this.leverage = options.leverage || 100;
    this.peakBalance = options.accountBalance;
  }

  /**
   * Get symbol specifications
   */
  getSymbolSpecs(symbol: string): SymbolSpecs {
    const base = getBaseCurrency(symbol);
    const quote = symbol.replace(base, '');
    
    // Check if USD is quote currency (standard pip value)
    if (quote === 'USD') {
      return { ...DEFAULT_SYMBOL_SPECS };
    }
    
    // For other pairs, adjust pip value
    // This is simplified - in production would use live rates
    return {
      ...DEFAULT_SYMBOL_SPECS,
      pipValue: 10, // Would be calculated from current rate
    };
  }

  /**
   * Calculate position size based on risk
   */
  calculatePositionSize(options: {
    symbol: string;
    entryPrice: number;
    stopLoss: number;
    direction: 'buy' | 'sell';
  }): PositionSizeResult {
    const { symbol, entryPrice, stopLoss, direction } = options;
    const specs = this.getSymbolSpecs(symbol);
    
    // Calculate risk amount
    const riskAmount = this.accountBalance * (this.params.maxRiskPerTrade / 100);
    
    // Calculate pips at risk
    const pipsAtRisk = Math.abs(entryPrice - stopLoss) / specs.pipDecimal;
    
    if (pipsAtRisk === 0) {
      return {
        lotSize: 0,
        units: 0,
        riskAmount: 0,
        riskPercent: 0,
        pipValue: specs.pipValue,
        pipValueUSD: 0,
        marginRequired: 0,
        stopLossPips: 0,
        takeProfitPips: 0,
      };
    }
    
    // Calculate lot size
    const lotSize = riskAmount / (pipsAtRisk * specs.pipValue);
    
    // Adjust to valid lot step
    const adjustedLotSize = this.roundToStep(lotSize, specs.lotStep);
    
    // Ensure within limits
    const finalLotSize = Math.max(
      specs.minLot,
      Math.min(specs.maxLot, this.params.maxVolumePerTrade, adjustedLotSize)
    );
    
    // Calculate units
    const units = finalLotSize * specs.contractSize;
    
    // Calculate actual risk
    const actualRiskPips = Math.abs(entryPrice - stopLoss) / specs.pipDecimal;
    const actualRisk = actualRiskPips * specs.pipValue * finalLotSize;
    
    // Calculate margin required
    const marginRequired = (units * entryPrice) / this.leverage;
    
    return {
      lotSize: finalLotSize,
      units,
      riskAmount: actualRisk,
      riskPercent: (actualRisk / this.accountBalance) * 100,
      pipValue: specs.pipValue,
      pipValueUSD: specs.pipValue * finalLotSize,
      marginRequired,
      stopLossPips: actualRiskPips,
      takeProfitPips: actualRiskPips * this.params.minRiskReward,
    };
  }

  /**
   * Calculate stop loss based on ATR
   */
  calculateATRStopLoss(candles: Candle[], multiplier: number = 1.5): number {
    const atrResult = atr(candles, 14);
    const atrValue = atrResult.value[atrResult.value.length - 1] || 0;
    const currentPrice = candles[candles.length - 1].close;
    
    return currentPrice - (atrValue * multiplier);
  }

  /**
   * Calculate take profit based on risk-reward
   */
  calculateTakeProfit(entryPrice: number, stopLoss: number, ratio: number): number {
    const distance = Math.abs(entryPrice - stopLoss);
    return entryPrice + distance * ratio;
  }

  /**
   * Validate trade
   */
  validateTrade(assessment: TradeRiskAssessment): TradeValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check max positions
    if (this.positions.length >= this.params.maxOpenPositions) {
      errors.push(`Maximum open positions reached (${this.params.maxOpenPositions})`);
    }
    
    // Check daily risk
    const projectedDailyRisk = this.dailyLoss + assessment.riskAmount;
    if (projectedDailyRisk > this.accountBalance * (this.params.maxDailyRisk / 100)) {
      errors.push(`Daily risk limit would be exceeded`);
    }
    
    // Check weekly risk
    if (this.weeklyLoss + assessment.riskAmount > this.accountBalance * (this.params.maxWeeklyRisk / 100)) {
      warnings.push(`Weekly risk limit approaching`);
    }
    
    // Check drawdown
    const currentDrawdown = this.getDrawdownState().drawdownPercent;
    if (currentDrawdown > this.params.maxDrawdown * 0.8) {
      warnings.push(`High drawdown (${currentDrawdown.toFixed(1)}%)`);
    }
    
    // Check risk-reward
    if (assessment.riskReward < this.params.minRiskReward) {
      errors.push(`Risk-reward ratio below minimum (${assessment.riskReward.toFixed(2)} < ${this.params.minRiskReward})`);
    }
    
    // Check margin
    if (assessment.marginRequired > this.accountBalance * 0.2) {
      warnings.push('High margin usage (>20% of account)');
    }
    
    // Check risk amount
    if (assessment.riskPercent > this.params.maxRiskPerTrade) {
      warnings.push(`Risk exceeds configured limit`);
    }
    
    // Check correlation
    const correlations = this.checkCorrelations(assessment.symbol);
    if (correlations.length > 0) {
      const maxCorr = Math.max(...correlations.map(c => c.correlation));
      if (maxCorr > this.params.maxCorrelation) {
        warnings.push(`High correlation with existing positions`);
      }
    }
    
    // Determine risk level
    let riskLevel: TradeValidation['riskLevel'] = 'low';
    if (warnings.length >= 2 || errors.length > 0) riskLevel = 'high';
    else if (warnings.length >= 1) riskLevel = 'medium';
    if (errors.length > 0) riskLevel = 'extreme';
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      canTrade: errors.length === 0 && warnings.length < 2,
      riskLevel,
    };
  }

  /**
   * Assess trade risk
   */
  assessTrade(options: {
    symbol: string;
    direction: 'buy' | 'sell';
    entryPrice: number;
    stopLoss: number;
    takeProfit?: number;
    lotSize?: number;
  }): TradeRiskAssessment {
    const { symbol, direction, entryPrice, stopLoss, takeProfit, lotSize } = options;
    const specs = this.getSymbolSpecs(symbol);
    
    // Calculate or use provided lot size
    let positionSize: PositionSizeResult;
    if (lotSize) {
      const units = lotSize * specs.contractSize;
      const pipsAtRisk = Math.abs(entryPrice - stopLoss) / specs.pipDecimal;
      positionSize = {
        lotSize,
        units,
        riskAmount: pipsAtRisk * specs.pipValue * lotSize,
        riskPercent: (pipsAtRisk * specs.pipValue * lotSize / this.accountBalance) * 100,
        pipValue: specs.pipValue,
        pipValueUSD: specs.pipValue * lotSize,
        marginRequired: (units * entryPrice) / this.leverage,
        stopLossPips: pipsAtRisk,
        takeProfitPips: takeProfit ? Math.abs(entryPrice - takeProfit) / specs.pipDecimal : pipsAtRisk * this.params.minRiskReward,
      };
    } else {
      positionSize = this.calculatePositionSize({ symbol, entryPrice, stopLoss, direction });
    }
    
    // Calculate risk-reward
    let riskReward: number;
    if (takeProfit) {
      const risk = Math.abs(entryPrice - stopLoss);
      const reward = Math.abs(takeProfit - entryPrice);
      riskReward = reward / risk;
    } else {
      riskReward = this.params.minRiskReward;
    }
    
    // Generate reasons
    const reasons: string[] = [];
    reasons.push(`Direction: ${direction}`);
    reasons.push(`Risk: ${positionSize.riskPercent.toFixed(2)}%`);
    reasons.push(`R:R: ${riskReward.toFixed(2)}`);
    
    if (positionSize.riskPercent < 0.5) reasons.push('Low risk per trade');
    if (riskReward > 2.5) reasons.push('Favorable risk-reward');
    
    return {
      symbol,
      direction,
      entryPrice,
      stopLoss,
      takeProfit: takeProfit || this.calculateTakeProfit(entryPrice, stopLoss, riskReward),
      lotSize: positionSize.lotSize,
      riskAmount: positionSize.riskAmount,
      riskReward,
      marginRequired: positionSize.marginRequired,
      validation: this.validateTrade({
        symbol,
        direction,
        entryPrice,
        stopLoss,
        takeProfit: takeProfit || this.calculateTakeProfit(entryPrice, stopLoss, riskReward),
        lotSize: positionSize.lotSize,
        riskAmount: positionSize.riskAmount,
        riskReward,
        marginRequired: positionSize.marginRequired,
        validation: { valid: true, errors: [], warnings: [], canTrade: true, riskLevel: 'low' },
        reasons: [],
      }),
      reasons,
    };
  }

  /**
   * Get drawdown state
   */
  getDrawdownState(): DrawdownState {
    const currentBalance = this.accountBalance;
    
    // Update peak if new high
    if (currentBalance > this.peakBalance) {
      this.peakBalance = currentBalance;
    }
    
    const drawdown = this.peakBalance - currentBalance;
    const drawdownPercent = this.peakBalance > 0 ? (drawdown / this.peakBalance) * 100 : 0;
    const isInDrawdown = drawdown > 0;
    const recoveryMode = isInDrawdown && currentBalance > this.peakBalance * (1 - this.params.maxDrawdown / 100);
    
    return {
      peak: this.peakBalance,
      current: currentBalance,
      drawdownPercent,
      isInDrawdown,
      recoveryMode,
      consecutiveLosers: this.consecutiveLosers,
      maxConsecutiveLosers: this.maxConsecutiveLosers,
    };
  }

  /**
   * Check correlations with existing positions
   */
  checkCorrelations(symbol: string): CorrelationEntry[] {
    const correlations: CorrelationEntry[] = [];
    
    for (const position of this.positions) {
      const correlation = this.calculateCorrelation(symbol, position.symbol);
      if (correlation > 0) {
        correlations.push({
          symbol1: symbol,
          symbol2: position.symbol,
          correlation,
          strength: this.getCorrelationStrength(correlation),
        });
      }
    }
    
    return correlations;
  }

  /**
   * Calculate correlation between two symbols
   */
  calculateCorrelation(symbol1: string, symbol2: string): number {
    if (symbol1 === symbol2) return 1;
    
    const base1 = getBaseCurrency(symbol1);
    const base2 = getBaseCurrency(symbol2);
    
    // Same base currency = high correlation
    if (base1 === base2) return 0.8;
    
    // Check for same quote currency
    const quote1 = symbol1.replace(base1, '');
    const quote2 = symbol2.replace(base2, '');
    
    if (quote1 === quote2) return 0.7;
    
    // Check currency matrix overlap
    const currencies1 = new Set<string>();
    const currencies2 = new Set<string>();
    
    for (const [currency, pairs] of Object.entries(CURRENCY_MATRIX)) {
      if (pairs.includes(symbol1)) currencies1.add(currency);
      if (pairs.includes(symbol2)) currencies2.add(currency);
    }
    
    const overlap = [...currencies1].filter(c => currencies2.has(c)).length;
    const total = new Set([...currencies1, ...currencies2]).size;
    
    return total > 0 ? overlap / total * 0.9 : 0;
  }

  /**
   * Get correlation strength classification
   */
  private getCorrelationStrength(correlation: number): CorrelationEntry['strength'] {
    if (correlation >= 0.7) return 'strong_positive';
    if (correlation >= 0.4) return 'moderate_positive';
    if (correlation <= -0.7) return 'strong_negative';
    if (correlation <= -0.4) return 'moderate_negative';
    return 'weak';
  }

  /**
   * Get currency exposures
   */
  getCurrencyExposures(): CurrencyExposure[] {
    const exposures: Record<string, CurrencyExposure> = {};
    
    for (const position of this.positions) {
      const base = getBaseCurrency(position.symbol);
      const notional = position.volume * position.openPrice;
      const pnl = position.profit;
      
      if (!exposures[base]) {
        exposures[base] = {
          currency: base,
          longExposure: 0,
          shortExposure: 0,
          netExposure: 0,
          exposurePercent: 0,
        };
      }
      
      if (position.type === 'buy') {
        exposures[base].longExposure += notional;
      } else {
        exposures[base].shortExposure += notional;
      }
    }
    
    // Calculate net and percentages
    for (const exp of Object.values(exposures)) {
      exp.netExposure = exp.longExposure - exp.shortExposure;
      exp.exposurePercent = this.accountBalance > 0 
        ? (Math.abs(exp.longExposure + exp.shortExposure) / this.accountBalance) * 100 
        : 0;
    }
    
    return Object.values(exposures);
  }

  /**
   * Get risk metrics
   */
  getRiskMetrics(): RiskMetrics {
    const openPositions = this.positions.length;
    const pendingOrders = this.orders.filter(o => o.status === 'pending').length;
    
    const unrealizedPnL = this.positions.reduce((sum, p) => sum + p.profit, 0);
    const marginUsed = this.positions.reduce((sum, p) => {
      const specs = this.getSymbolSpecs(p.symbol);
      return sum + (p.volume * specs.contractSize * p.openPrice) / this.leverage;
    }, 0);
    
    const marginLevel = marginUsed > 0 ? (this.accountBalance + unrealizedPnL) / marginUsed * 100 : 100;
    
    const drawdownState = this.getDrawdownState();
    
    return {
      accountBalance: this.accountBalance,
      accountEquity: this.accountBalance + unrealizedPnL,
      openPositions,
      pendingOrders,
      dailyPnL: -this.dailyLoss,
      weeklyPnL: -this.weeklyLoss,
      monthlyPnL: 0,
      unrealizedPnL,
      realizedPnL: this.accountBalance - this.peakBalance + unrealizedPnL,
      totalRisked: this.dailyLoss,
      marginUsed,
      marginLevel,
      maxDrawdownCurrent: drawdownState.drawdownPercent,
      maxDrawdownAllowed: this.params.maxDrawdown,
    };
  }

  /**
   * Get risk summary
   */
  getRiskSummary(): RiskSummary {
    const metrics = this.getRiskMetrics();
    const drawdownState = this.getDrawdownState();
    
    // Calculate suggested risk based on conditions
    let suggestedRisk = this.params.maxRiskPerTrade;
    
    if (drawdownState.isInDrawdown) {
      suggestedRisk *= 0.5; // Reduce risk in drawdown
    }
    
    if (drawdownState.consecutiveLosers >= 3) {
      suggestedRisk *= 0.75; // Reduce after losing streak
    }
    
    if (this.positions.length >= 3) {
      suggestedRisk *= 0.8; // Reduce with multiple positions
    }
    
    // Generate warnings
    const warnings: string[] = [];
    
    if (drawdownState.drawdownPercent > 5) {
      warnings.push(`Drawdown at ${drawdownState.drawdownPercent.toFixed(1)}%`);
    }
    
    if (this.consecutiveLosers >= 2) {
      warnings.push(`${this.consecutiveLosers} consecutive losers`);
    }
    
    if (this.dailyLoss > this.accountBalance * 0.02) {
      warnings.push('Daily loss limit approaching');
    }
    
    return {
      metrics,
      canOpenTrade: this.positions.length < this.params.maxOpenPositions && 
                     this.dailyLoss < this.accountBalance * (this.params.maxDailyRisk / 100) &&
                     drawdownState.drawdownPercent < this.params.maxDrawdown,
      suggestedRiskPercent: suggestedRisk,
      warnings,
      positions: this.positions,
      correlations: this.checkAllCorrelations(),
      drawdownState,
      timestamp: Date.now(),
    };
  }

  /**
   * Check all correlations between positions
   */
  private checkAllCorrelations(): CorrelationEntry[] {
    const correlations: CorrelationEntry[] = [];
    
    for (let i = 0; i < this.positions.length; i++) {
      for (let j = i + 1; j < this.positions.length; j++) {
        const correlation = this.calculateCorrelation(
          this.positions[i].symbol,
          this.positions[j].symbol
        );
        
        if (correlation > 0.3) {
          correlations.push({
            symbol1: this.positions[i].symbol,
            symbol2: this.positions[j].symbol,
            correlation,
            strength: this.getCorrelationStrength(correlation),
          });
        }
      }
    }
    
    return correlations;
  }

  /**
   * Update positions
   */
  updatePositions(positions: Position[]): void {
    this.positions = positions;
  }

  /**
   * Update orders
   */
  updateOrders(orders: Order[]): void {
    this.orders = orders;
  }

  /**
   * Record trade result
   */
  recordTradeResult(profit: number): void {
    if (profit < 0) {
      this.dailyLoss += Math.abs(profit);
      this.weeklyLoss += Math.abs(profit);
      this.consecutiveLosers++;
      this.maxConsecutiveLosers = Math.max(this.maxConsecutiveLosers, this.consecutiveLosers);
    } else {
      this.consecutiveLosers = 0;
    }
  }

  /**
   * Reset daily risk
   */
  resetDailyRisk(): void {
    this.dailyLoss = 0;
  }

  /**
   * Reset weekly risk
   */
  resetWeeklyRisk(): void {
    this.weeklyLoss = 0;
    this.dailyLoss = 0;
  }

  /**
   * Get parameters
   */
  getParameters(): RiskParameters {
    return { ...this.params };
  }

  /**
   * Update parameters
   */
  updateParameters(params: Partial<RiskParameters>): void {
    this.params = { ...this.params, ...params };
  }

  /**
   * Round to lot step
   */
  private roundToStep(value: number, step: number): number {
    return Math.round(value / step) * step;
  }
}

/**
 * Create risk engine instance
 */
export function createRiskEngine(options: RiskEngineOptions): RiskEngine {
  return new RiskEngine(options);
}
