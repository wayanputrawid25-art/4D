// Risk Calculator - Position sizing and risk management
import type { PositionSizeResult, RiskParameters } from './types';
import { configService } from '@forexos/trading-config';

/**
 * Risk Calculator - All risk parameters read from configuration service
 */
export class RiskCalculator {
  private params: RiskParameters;

  constructor(params: Partial<RiskParameters> = {}) {
    // Initialize from config service
    const riskConfig = configService.getRisk();
    
    this.params = {
      maxRiskPerTrade: params.maxRiskPerTrade ?? riskConfig.maxRiskPerTrade,
      maxDailyRisk: params.maxDailyRisk ?? riskConfig.maxDailyRisk,
      maxOpenPositions: params.maxOpenPositions ?? riskConfig.maxOpenPositions,
      maxCorrelation: params.maxCorrelation ?? riskConfig.maxCorrelation,
      minRiskReward: params.minRiskReward ?? riskConfig.minRiskReward,
    };
  }

  /**
   * Get symbol specs from config service
   */
  private getSymbolSpecs(symbol: string) {
    const symbolConfig = configService.getSymbol(symbol);
    
    if (!symbolConfig) {
      // Fallback to default EURUSD specs
      return {
        contractSize: 100000,
        pipDecimal: 0.0001,
        pipValue: 10,
        minLot: 0.01,
        maxLot: 100,
        lotStep: 0.01,
      };
    }

    return {
      contractSize: symbolConfig.contractSize,
      pipDecimal: symbolConfig.pipDecimal,
      pipValue: symbolConfig.pipValue,
      minLot: symbolConfig.minLot,
      maxLot: symbolConfig.maxLot,
      lotStep: symbolConfig.lotStep,
    };
  }

  /**
   * Calculate position size based on risk parameters
   */
  calculatePositionSize(options: {
    symbol: string;
    accountBalance: number;
    entryPrice: number;
    stopLoss: number;
    isBullish: boolean;
    leverage?: number;
  }): PositionSizeResult {
    const { symbol, accountBalance, entryPrice, stopLoss, isBullish, leverage = 100 } = options;
    
    // Get symbol specs from config
    const specs = this.getSymbolSpecs(symbol);
    
    // Calculate risk amount in account currency
    const riskAmount = accountBalance * (this.params.maxRiskPerTrade / 100);
    
    // Calculate pips at risk
    const pipsAtRisk = Math.abs(entryPrice - stopLoss) / specs.pipDecimal;
    
    if (pipsAtRisk === 0) {
      return {
        lotSize: 0,
        units: 0,
        riskAmount: 0,
        pipValue: specs.pipValue,
        marginRequired: 0,
      };
    }
    
    // Calculate lot size
    const riskPerPip = specs.pipValue;
    const lotSize = riskAmount / (pipsAtRisk * riskPerPip);
    
    // Adjust to valid lot step
    const adjustedLotSize = this.roundToStep(lotSize, specs.lotStep);
    
    // Ensure within min/max from config
    const finalLotSize = Math.max(
      Math.min(specs.maxLot, adjustedLotSize),
      specs.minLot
    );
    
    // Calculate units
    const units = finalLotSize * specs.contractSize;
    
    // Calculate actual risk
    const actualRisk = pipsAtRisk * riskPerPip * finalLotSize;
    
    // Calculate margin required
    const marginRequired = (units * entryPrice) / leverage;
    
    return {
      lotSize: finalLotSize,
      units,
      riskAmount: actualRisk,
      pipValue: riskPerPip,
      marginRequired,
    };
  }

  /**
   * Calculate take profit based on risk-reward ratio
   */
  calculateTakeProfit(options: {
    entryPrice: number;
    stopLoss: number;
    riskRewardRatio: number;
    isBullish: boolean;
  }): number {
    const { entryPrice, stopLoss, riskRewardRatio, isBullish } = options;
    
    const riskDistance = Math.abs(entryPrice - stopLoss);
    const rewardDistance = riskDistance * riskRewardRatio;
    
    return isBullish
      ? entryPrice + rewardDistance
      : entryPrice - rewardDistance;
  }

  /**
   * Validate if trade meets risk criteria
   */
  validateTrade(options: {
    symbol: string;
    accountBalance: number;
    currentPositions: number;
    riskAmount: number;
    riskRewardRatio: number;
    marginRequired: number;
    dailyRiskUsed: number;
  }): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const {
      accountBalance,
      currentPositions,
      riskAmount,
      riskRewardRatio,
      marginRequired,
      dailyRiskUsed,
    } = options;
    
    // Check max positions from config
    if (currentPositions >= this.params.maxOpenPositions) {
      errors.push(`Maximum open positions reached (${this.params.maxOpenPositions})`);
    }
    
    // Check max daily risk from config
    const projectedDailyRisk = dailyRiskUsed + (riskAmount / accountBalance) * 100;
    if (projectedDailyRisk > this.params.maxDailyRisk) {
      errors.push(`Daily risk limit exceeded (${projectedDailyRisk.toFixed(1)}% projected)`);
    }
    
    // Check risk-reward ratio from config
    if (riskRewardRatio < this.params.minRiskReward) {
      errors.push(`Risk-reward ratio too low (${riskRewardRatio.toFixed(2)} < ${this.params.minRiskReward})`);
    }
    
    // Check margin
    if (marginRequired > accountBalance * 0.2) {
      warnings.push('High margin usage (>20% of account)');
    }
    
    // Check risk amount
    const riskPercent = (riskAmount / accountBalance) * 100;
    if (riskPercent > this.params.maxRiskPerTrade * 1.5) {
      warnings.push(`High risk per trade (${riskPercent.toFixed(1)}%)`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Calculate daily risk used
   */
  calculateDailyRisk(options: {
    accountBalance: number;
    trades: { riskAmount: number; timestamp: number }[];
    date: Date;
  }): number {
    const { accountBalance, trades, date } = options;
    
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dailyLosses = trades
      .filter(t => {
        const tradeDate = new Date(t.timestamp);
        return tradeDate >= dayStart && tradeDate <= dayEnd;
      })
      .reduce((sum, t) => sum + t.riskAmount, 0);
    
    return (dailyLosses / accountBalance) * 100;
  }

  /**
   * Calculate correlation between two positions
   */
  calculateCorrelation(position1: { symbol: string }, position2: { symbol: string }): number {
    // Get correlation threshold from config
    const maxCorrelation = this.params.maxCorrelation;
    
    // Simple correlation based on currency pairs
    const currencyMatrix: Record<string, string[]> = {
      USD: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD'],
      EUR: ['EURUSD', 'EURGBP', 'EURJPY'],
      GBP: ['GBPUSD', 'EURGBP', 'GBPJPY'],
      JPY: ['USDJPY', 'EURJPY', 'GBPJPY'],
      AUD: ['AUDUSD'],
      CAD: ['USDCAD'],
    };
    
    const currencies1 = Object.entries(currencyMatrix)
      .filter(([, pairs]) => pairs.includes(position1.symbol))
      .map(([cur]) => cur);
    
    const currencies2 = Object.entries(currencyMatrix)
      .filter(([, pairs]) => pairs.includes(position2.symbol))
      .map(([cur]) => cur);
    
    const overlap = currencies1.filter(c => currencies2.includes(c));
    
    // Return correlation based on overlap
    return overlap.length > 0 ? maxCorrelation : 0;
  }

  /**
   * Get current risk parameters
   */
  getParameters(): RiskParameters {
    return { ...this.params };
  }

  /**
   * Update risk parameters
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

export const riskCalculator = new RiskCalculator();
