// Position Manager - Track and manage positions
import type { Position, TradeHistory } from './types';
import { OrderExecutor } from './executor';

export interface PositionSummary {
  totalPositions: number;
  totalVolume: number;
  totalProfit: number;
  totalLoss: number;
  buyPositions: number;
  sellPositions: number;
  largestPosition: number;
  averageProfit: number;
}

export class PositionManager {
  private executor: OrderExecutor;
  private positions: Map<number, Position> = new Map();
  private history: TradeHistory[] = [];
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(executor: OrderExecutor) {
    this.executor = executor;
  }

  /**
   * Start position tracking
   */
  startTracking(intervalMs: number = 5000): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      await this.refreshPositions();
    }, intervalMs);
  }

  /**
   * Stop position tracking
   */
  stopTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Refresh positions from MT5
   */
  async refreshPositions(): Promise<void> {
    const openPositions = await this.executor.getOpenPositions();
    
    // Update internal state
    this.positions.clear();
    for (const position of openPositions) {
      this.positions.set(position.mt5Ticket, position);
    }
  }

  /**
   * Get all open positions
   */
  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get position by ticket
   */
  getPosition(ticket: number): Position | undefined {
    return this.positions.get(ticket);
  }

  /**
   * Get positions by symbol
   */
  getPositionsBySymbol(symbol: string): Position[] {
    return this.getPositions().filter(p => p.symbol === symbol);
  }

  /**
   * Get position summary
   */
  getSummary(): PositionSummary {
    const positions = this.getPositions();
    
    let totalVolume = 0;
    let totalProfit = 0;
    let buyCount = 0;
    let sellCount = 0;
    let largestPosition = 0;

    for (const position of positions) {
      totalVolume += position.volume;
      totalProfit += position.profit;
      
      if (position.type === 'buy') {
        buyCount++;
      } else {
        sellCount++;
      }

      if (position.volume > largestPosition) {
        largestPosition = position.volume;
      }
    }

    return {
      totalPositions: positions.length,
      totalVolume,
      totalProfit,
      totalLoss: totalProfit < 0 ? Math.abs(totalProfit) : 0,
      buyPositions: buyCount,
      sellPositions: sellCount,
      largestPosition,
      averageProfit: positions.length > 0 ? totalProfit / positions.length : 0,
    };
  }

  /**
   * Check if symbol has open position
   */
  hasPosition(symbol: string): boolean {
    return this.getPositionsBySymbol(symbol).length > 0;
  }

  /**
   * Check if can open new position (margin check)
   */
  canOpenPosition(accountBalance: number, requiredMargin: number): boolean {
    const summary = this.getSummary();
    const usedMargin = summary.totalVolume * 100000 * 0.01; // Rough estimate
    const availableMargin = accountBalance - usedMargin;
    return availableMargin >= requiredMargin;
  }

  /**
   * Close all positions for a symbol
   */
  async closeAllBySymbol(symbol: string): Promise<{ success: boolean; closed: number; errors: string[] }> {
    const positions = this.getPositionsBySymbol(symbol);
    const errors: string[] = [];
    let closed = 0;

    for (const position of positions) {
      const result = await this.executor.closePosition({ ticket: position.mt5Ticket });
      if (result.success) {
        closed++;
        this.positions.delete(position.mt5Ticket);
      } else {
        errors.push(`Failed to close ${position.mt5Ticket}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      closed,
      errors,
    };
  }

  /**
   * Close position by ticket
   */
  async closePosition(ticket: number): Promise<{ success: boolean; error?: string }> {
    const result = await this.executor.closePosition({ ticket });
    
    if (result.success) {
      this.positions.delete(ticket);
    }

    return {
      success: result.success,
      error: result.error,
    };
  }

  /**
   * Close all positions
   */
  async closeAll(): Promise<{ success: boolean; closed: number; errors: string[] }> {
    const positions = this.getPositions();
    const errors: string[] = [];
    let closed = 0;

    for (const position of positions) {
      const result = await this.executor.closePosition({ ticket: position.mt5Ticket });
      if (result.success) {
        closed++;
        this.positions.delete(position.mt5Ticket);
      } else {
        errors.push(`Failed to close ${position.mt5Ticket}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      closed,
      errors,
    };
  }

  /**
   * Modify position stop loss
   */
  async setStopLoss(ticket: number, stopLoss: number): Promise<boolean> {
    const position = this.positions.get(ticket);
    if (!position) return false;

    const result = await this.executor.modifyPosition({
      ticket,
      stopLoss,
      takeProfit: position.takeProfit,
    });

    if (result.success) {
      position.stopLoss = stopLoss;
      position.updateTime = Date.now();
    }

    return result.success;
  }

  /**
   * Modify position take profit
   */
  async setTakeProfit(ticket: number, takeProfit: number): Promise<boolean> {
    const position = this.positions.get(ticket);
    if (!position) return false;

    const result = await this.executor.modifyPosition({
      ticket,
      stopLoss: position.stopLoss,
      takeProfit,
    });

    if (result.success) {
      position.takeProfit = takeProfit;
      position.updateTime = Date.now();
    }

    return result.success;
  }

  /**
   * Move stop loss to breakeven
   */
  async moveToBreakeven(ticket: number): Promise<boolean> {
    const position = this.positions.get(ticket);
    if (!position) return false;

    let breakevenPrice: number;
    
    if (position.type === 'buy') {
      breakevenPrice = position.priceOpen;
    } else {
      breakevenPrice = position.priceOpen;
    }

    // Only move if profitable
    if (position.profit > 0) {
      return this.setStopLoss(ticket, breakevenPrice);
    }

    return false;
  }

  /**
   * Calculate unrealized profit/loss
   */
  calculatePnL(): { profit: number; loss: number; net: number } {
    const positions = this.getPositions();
    let profit = 0;
    let loss = 0;

    for (const position of positions) {
      if (position.profit > 0) {
        profit += position.profit;
      } else {
        loss += Math.abs(position.profit);
      }
    }

    return {
      profit,
      loss,
      net: profit - loss,
    };
  }

  /**
   * Add to trade history
   */
  addToHistory(trade: TradeHistory): void {
    this.history.push(trade);
  }

  /**
   * Get trade history
   */
  getHistory(limit?: number): TradeHistory[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  /**
   * Get history by symbol
   */
  getHistoryBySymbol(symbol: string, limit?: number): TradeHistory[] {
    let history = this.history.filter(t => t.symbol === symbol);
    if (limit) {
      history = history.slice(-limit);
    }
    return history;
  }

  /**
   * Calculate trade statistics
   */
  calculateStats(): {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    largestWin: number;
    largestLoss: number;
  } {
    const closedTrades = this.history;
    
    let winningTrades = 0;
    let losingTrades = 0;
    let totalWin = 0;
    let totalLoss = 0;
    let largestWin = 0;
    let largestLoss = 0;

    for (const trade of closedTrades) {
      if (trade.profit > 0) {
        winningTrades++;
        totalWin += trade.profit;
        if (trade.profit > largestWin) largestWin = trade.profit;
      } else {
        losingTrades++;
        totalLoss += Math.abs(trade.profit);
        if (Math.abs(trade.profit) > largestLoss) largestLoss = Math.abs(trade.profit);
      }
    }

    const totalTrades = winningTrades + losingTrades;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      avgWin: winningTrades > 0 ? totalWin / winningTrades : 0,
      avgLoss: losingTrades > 0 ? totalLoss / losingTrades : 0,
      profitFactor: totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0,
      largestWin,
      largestLoss,
    };
  }
}
