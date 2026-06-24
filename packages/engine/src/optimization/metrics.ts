// Fitness Metrics Calculator
import type { Candle, Timeframe } from '@forexos/types';
import type { FitnessMetrics, ParameterSet } from './types';

export interface Trade {
  openTime: number;
  closeTime: number;
  type: 'buy' | 'sell';
  openPrice: number;
  closePrice: number;
  volume: number;
  profit: number;
  barsInTrade: number;
}

export interface BacktestResult {
  trades: Trade[];
  equity: number[];
  drawdown: number[];
}

/**
 * Calculate fitness metrics from trades
 */
export function calculateMetrics(trades: Trade[], initialBalance: number = 10000): FitnessMetrics {
  if (trades.length === 0) {
    return getEmptyMetrics();
  }

  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.profit > 0);
  const losingTrades = trades.filter(t => t.profit < 0);

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.profit, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0));
  const netProfit = grossProfit - grossLoss;

  const winRate = (winningTrades.length / totalTrades) * 100;
  const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
  const avgTrade = netProfit / totalTrades;
  const avgBarsInTrade = trades.reduce((sum, t) => sum + t.barsInTrade, 0) / totalTrades;

  // Calculate equity curve and drawdown
  let equity = initialBalance;
  let peak = initialBalance;
  let maxDrawdown = 0;
  const equityCurve: number[] = [];
  const drawdownCurve: number[] = [];

  for (const trade of trades) {
    equity += trade.profit;
    equityCurve.push(equity);
    
    if (equity > peak) {
      peak = equity;
    }
    
    const drawdown = peak - equity;
    drawdownCurve.push(drawdown);
    
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  const maxDrawdownPercent = (maxDrawdown / peak) * 100;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : netProfit > 0 ? Infinity : 0;

  // Calculate Sharpe ratio (simplified)
  const returns = trades.map(t => t.profit / initialBalance);
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdReturn = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  );
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

  // Calculate Sortino ratio (downside deviation)
  const downsideReturns = returns.filter(r => r < 0);
  const downsideDeviation = downsideReturns.length > 0
    ? Math.sqrt(
        downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length
      )
    : 0;
  const sortinoRatio = downsideDeviation > 0 
    ? (avgReturn / downsideDeviation) * Math.sqrt(252) 
    : 0;

  return {
    netProfit,
    grossProfit,
    grossLoss,
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    profitFactor,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    maxDrawdownPercent,
    avgWin,
    avgLoss,
    avgTrade,
    avgBarsInTrade,
    recoveryFactor,
    payoffRatio,
  };
}

/**
 * Generate trades from simple strategy simulation
 */
export function simulateStrategy(
  candles: Candle[],
  params: ParameterSet
): Trade[] {
  const trades: Trade[] = [];
  
  const fastPeriod = params.fastPeriod || 10;
  const slowPeriod = params.slowPeriod || 20;
  const atrPeriod = params.atrPeriod || 14;
  const atrMultiplier = params.atrMultiplier || 2;
  
  if (candles.length < Math.max(fastPeriod, slowPeriod, atrPeriod)) {
    return trades;
  }

  // Calculate EMAs
  const emaFast = calculateEMA(candles.map(c => c.close), fastPeriod);
  const emaSlow = calculateEMA(candles.map(c => c.close), slowPeriod);
  
  // Calculate ATR
  const atr = calculateATR(candles, atrPeriod);

  let position: { type: 'buy' | 'sell'; openTime: number; openPrice: number; index: number } | null = null;

  for (let i = Math.max(fastPeriod, slowPeriod, atrPeriod); i < candles.length; i++) {
    const candle = candles[i];
    const emaF = emaFast[i];
    const emaS = emaSlow[i];
    const atrVal = atr[i];

    if (emaF === null || emaS === null || atrVal === null) continue;

    // Check for crossover
    const prevEmaF = emaFast[i - 1];
    const prevEmaS = emaSlow[i - 1];

    if (prevEmaF === null || prevEmaS === null) continue;

    // Buy signal
    if (prevEmaF <= prevEmaS && emaF > emaS && !position) {
      position = {
        type: 'buy',
        openTime: candle.timestamp,
        openPrice: candle.close,
        index: i,
      };
    }
    // Sell signal
    else if (prevEmaF >= prevEmaS && emaF < emaS && !position) {
      position = {
        type: 'sell',
        openTime: candle.timestamp,
        openPrice: candle.close,
        index: i,
      };
    }
    // Close position
    else if (position) {
      const crossover = (position.type === 'buy' && prevEmaF >= prevEmaS && emaF < emaS) ||
                       (position.type === 'sell' && prevEmaF <= prevEmaS && emaF > emaS);
      
      // Also close on ATR-based stop
      const priceChange = position.type === 'buy' 
        ? candle.low - position.openPrice
        : position.openPrice - candle.high;
      const atrStopHit = priceChange < -atrVal * atrMultiplier;

      if (crossover || atrStopHit) {
        const closePrice = crossover ? candle.close : 
          (position.type === 'buy' ? position.openPrice - atrVal * atrMultiplier : position.openPrice + atrVal * atrMultiplier);

        const profit = position.type === 'buy'
          ? (closePrice - position.openPrice) * 100000 // Simplified
          : (position.openPrice - closePrice) * 100000;

        trades.push({
          openTime: position.openTime,
          closeTime: candle.timestamp,
          type: position.type,
          openPrice: position.openPrice,
          closePrice,
          volume: 1,
          profit,
          barsInTrade: i - position.index,
        });

        position = null;
      }
    }
  }

  return trades;
}

/**
 * Calculate EMA
 */
function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);

  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
    result.push(null);
  }

  if (data.length >= period) {
    result[period - 1] = sum / period;

    for (let i = period; i < data.length; i++) {
      const ema = (data[i] - result[i - 1]!) * multiplier + result[i - 1]!;
      result.push(ema);
    }
  }

  return result;
}

/**
 * Calculate ATR
 */
function calculateATR(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const trueRanges: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trueRanges.push(candles[i].high - candles[i].low);
      result.push(null);
    } else {
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      );
      trueRanges.push(tr);
      
      if (i < period - 1) {
        result.push(null);
      } else if (i === period - 1) {
        const atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
        result.push(atr);
      } else {
        const atr = (result[i - 1]! * (period - 1) + trueRanges[i]) / period;
        result.push(atr);
      }
    }
  }

  return result;
}

/**
 * Get empty metrics
 */
function getEmptyMetrics(): FitnessMetrics {
  return {
    netProfit: 0,
    grossProfit: 0,
    grossLoss: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    profitFactor: 0,
    sharpeRatio: 0,
    sortinoRatio: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    avgWin: 0,
    avgLoss: 0,
    avgTrade: 0,
    avgBarsInTrade: 0,
    recoveryFactor: 0,
    payoffRatio: 0,
  };
}
