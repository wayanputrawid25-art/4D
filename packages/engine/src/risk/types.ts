// Risk Engine Types
import type { Candle, Timeframe } from '@forexos/types';

/**
 * Account Status
 */
export interface AccountStatus {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  currency: string;
  leverage: number;
  accountType: string;
}

/**
 * Position Information
 */
export interface Position {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  openPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  profit: number;
  profitPercent: number;
  swap: number;
  commission: number;
  openTime: number;
  ticket: number;
}

/**
 * Order Information
 */
export interface Order {
  id: string;
  symbol: string;
  type: 'buy' | 'sell' | 'buylimit' | 'selllimit' | 'buystop' | 'sellstop';
  volume: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  currentPrice: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  createdAt: number;
  expiresAt?: number;
}

/**
 * Risk Parameters
 */
export interface RiskParameters {
  maxRiskPerTrade: number;     // Percentage (e.g., 1 = 1%)
  maxDailyRisk: number;        // Percentage
  maxWeeklyRisk: number;        // Percentage
  maxDrawdown: number;         // Percentage
  maxOpenPositions: number;
  maxCorrelation: number;       // 0-1
  minRiskReward: number;        // Minimum R:R ratio
  maxLeverage: number;
  minMarginLevel: number;       // Minimum margin level %
  maxVolumePerTrade: number;    // Max lot size
  trailingStop: boolean;
  trailingStep: number;         // Pips
}

/**
 * Position Size Result
 */
export interface PositionSizeResult {
  lotSize: number;
  units: number;
  riskAmount: number;
  riskPercent: number;
  pipValue: number;
  pipValueUSD: number;
  marginRequired: number;
  stopLossPips: number;
  takeProfitPips: number;
}

/**
 * Trade Validation
 */
export interface TradeValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  canTrade: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
}

/**
 * Risk Metrics
 */
export interface RiskMetrics {
  accountBalance: number;
  accountEquity: number;
  openPositions: number;
  pendingOrders: number;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalRisked: number;
  marginUsed: number;
  marginLevel: number;
  maxDrawdownCurrent: number;
  maxDrawdownAllowed: number;
}

/**
 * Drawdown State
 */
export interface DrawdownState {
  peak: number;
  current: number;
  drawdownPercent: number;
  isInDrawdown: boolean;
  recoveryMode: boolean;
  consecutiveLosers: number;
  maxConsecutiveLosers: number;
}

/**
 * Correlation Matrix Entry
 */
export interface CorrelationEntry {
  symbol1: string;
  symbol2: string;
  correlation: number;
  strength: 'strong_positive' | 'moderate_positive' | 'weak' | 'moderate_negative' | 'strong_negative';
}

/**
 * Risk Summary
 */
export interface RiskSummary {
  metrics: RiskMetrics;
  canOpenTrade: boolean;
  suggestedRiskPercent: number;
  warnings: string[];
  positions: Position[];
  correlations: CorrelationEntry[];
  drawdownState: DrawdownState;
  timestamp: number;
}

/**
 * Trade Risk Assessment
 */
export interface TradeRiskAssessment {
  symbol: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  riskAmount: number;
  riskReward: number;
  marginRequired: number;
  validation: TradeValidation;
  reasons: string[];
}

/**
 * Exposure by Currency
 */
export interface CurrencyExposure {
  currency: string;
  longExposure: number;
  shortExposure: number;
  netExposure: number;
  exposurePercent: number;
}

/**
 * Session Risk
 */
export interface SessionRisk {
  sessionName: string;
  tradesCount: number;
  wins: number;
  losses: number;
  winRate: number;
  pnl: number;
  riskUsed: number;
  maxRisk: number;
}

/**
 * Risk Engine Options
 */
export interface RiskEngineOptions {
  accountBalance: number;
  accountCurrency?: string;
  leverage?: number;
  parameters?: Partial<RiskParameters>;
}

/**
 * Default Risk Parameters
 */
export const DEFAULT_RISK_PARAMS: RiskParameters = {
  maxRiskPerTrade: 1.0,        // 1% per trade
  maxDailyRisk: 3.0,          // 3% daily
  maxWeeklyRisk: 6.0,          // 6% weekly
  maxDrawdown: 10.0,           // 10% max drawdown
  maxOpenPositions: 5,          // 5 max positions
  maxCorrelation: 0.7,          // 70% correlation max
  minRiskReward: 2.0,          // 1:2 minimum R:R
  maxLeverage: 100,             // 100:1 max leverage
  minMarginLevel: 150,          // 150% minimum margin level
  maxVolumePerTrade: 1.0,       // 1.0 lot max
  trailingStop: true,           // Enable trailing stop
  trailingStep: 15,             // 15 pip trailing step
};

/**
 * Symbol Specifications
 */
export interface SymbolSpecs {
  contractSize: number;
  pipDecimal: number;
  pipValue: number;
  minLot: number;
  maxLot: number;
  lotStep: number;
  commission: number;
  swapLong: number;
  swapShort: number;
}

/**
 * Default Symbol Specifications (EURUSD)
 */
export const DEFAULT_SYMBOL_SPECS: SymbolSpecs = {
  contractSize: 100000,
  pipDecimal: 0.0001,
  pipValue: 10,
  minLot: 0.01,
  maxLot: 100,
  lotStep: 0.01,
  commission: 0,
  swapLong: -0.5,
  swapShort: 0.5,
};
