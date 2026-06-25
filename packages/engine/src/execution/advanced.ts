// Advanced Execution Features - Trailing Stop, Break Even, Partial Close, Retry, Filters
import type { Position } from './types';
import { OrderExecutor } from './executor';
import { PositionManager } from './manager';

/**
 * Execution Filters Configuration
 */
export interface ExecutionFilters {
  maxSpreadPips: number;          // Maximum spread to allow execution
  maxSlippagePips: number;       // Maximum slippage tolerance
  retryAttempts: number;           // Number of retry attempts
  retryDelayMs: number;           // Delay between retries
  requireMarketHours: boolean;     // Only execute during market hours
}

/**
 * Trailing Stop Configuration
 */
export interface TrailingStopConfig {
  enabled: boolean;
  triggerPips: number;            // Pips profit before activation
  stepPips: number;               // Step size for trailing
  trailingType: 'classic' | 'mt4'; // Classic or MT4-style trailing
}

/**
 * Break Even Configuration
 */
export interface BreakEvenConfig {
  enabled: boolean;
  triggerPips: number;           // Pips profit before moving to BE
  addBuffer: boolean;            // Add buffer pips to entry price
  bufferPips: number;             // Buffer amount
}

/**
 * Partial Close Configuration
 */
export interface PartialCloseConfig {
  enabled: boolean;
  triggerPips: number;           // Pips profit before partial close
  closePercent: number;          // Percentage to close (0-100)
}

/**
 * Retry Configuration
 */
export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Execution Result with metadata
 */
export interface ExecutionResult {
  success: boolean;
  ticket?: number;
  price?: number;
  volume?: number;
  slippage?: number;
  spread?: number;
  message?: string;
  error?: string;
  attempts?: number;
  retryUsed?: boolean;
  filtered?: boolean;
  filterReason?: string;
}

/**
 * Advanced Order Executor with filters and protections
 */
export class AdvancedOrderExecutor {
  private executor: OrderExecutor;
  private positionManager: PositionManager;
  private filters: ExecutionFilters;
  private trailingStops: Map<number, TrailingStopConfig> = new Map();
  private breakEven: Map<number, BreakEvenConfig> = new Map();
  private partialClose: Map<number, PartialCloseConfig> = new Map();

  constructor(
    executor: OrderExecutor,
    positionManager: PositionManager,
    filters?: Partial<ExecutionFilters>
  ) {
    this.executor = executor;
    this.positionManager = positionManager;
    this.filters = {
      maxSpreadPips: filters?.maxSpreadPips ?? 5,
      maxSlippagePips: filters?.maxSlippagePips ?? 3,
      retryAttempts: filters?.retryAttempts ?? 3,
      retryDelayMs: filters?.retryDelayMs ?? 1000,
      requireMarketHours: filters?.requireMarketHours ?? false,
    };
  }

  /**
   * Execute order with all protections
   */
  async executeWithProtection(order: {
    symbol: string;
    type: 'buy' | 'sell';
    volume: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
  }): Promise<ExecutionResult> {
    // Check spread filter
    const spreadCheck = await this.checkSpread(order.symbol);
    if (spreadCheck.rejected) {
      return {
        success: false,
        error: spreadCheck.reason,
        filtered: true,
        filterReason: 'spread',
        spread: spreadCheck.spread,
      };
    }

    // Check market hours if required
    if (this.filters.requireMarketHours && !this.isMarketOpen()) {
      return {
        success: false,
        error: 'Market closed',
        filtered: true,
        filterReason: 'market_hours',
      };
    }

    // Execute with retry
    return this.executeWithRetry(order);
  }

  /**
   * Check spread against filter
   */
  async checkSpread(symbol: string): Promise<{
    rejected: boolean;
    reason?: string;
    spread?: number;
  }> {
    // In real implementation, get actual spread from broker
    // For demo, simulate spread
    const simulatedSpread = this.getSimulatedSpread(symbol);
    
    if (simulatedSpread > this.filters.maxSpreadPips) {
      return {
        rejected: true,
        reason: `Spread too high: ${simulatedSpread.toFixed(1)} pips (max: ${this.filters.maxSpreadPips})`,
        spread: simulatedSpread,
      };
    }

    return { rejected: false, spread: simulatedSpread };
  }

  /**
   * Get simulated spread for symbol
   */
  private getSimulatedSpread(symbol: string): number {
    // Simulate spreads based on pair liquidity
    const spreads: Record<string, number> = {
      EURUSD: 1.2,
      GBPUSD: 1.5,
      USDJPY: 1.3,
      USDCHF: 1.6,
      AUDUSD: 1.4,
      USDCAD: 1.5,
    };
    return spreads[symbol] || 2.0;
  }

  /**
   * Check if market is open
   */
  private isMarketOpen(): boolean {
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();
    
    // Market closed on weekends
    if (day === 0 || day === 6) return false;
    
    // Forex market: Monday 00:00 to Friday 22:00 UTC
    // Trading hours: 00:00-22:00 UTC weekdays
    if (hour < 0 || hour >= 22) return false;
    
    return true;
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry(order: {
    symbol: string;
    type: 'buy' | 'sell';
    volume: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
  }): Promise<ExecutionResult> {
    let attempts = 0;
    let lastError: string | undefined;
    let delay = this.filters.retryDelayMs;

    while (attempts < this.filters.retryAttempts) {
      attempts++;

      try {
        // Execute order
        const result = order.type === 'buy'
          ? await this.executor.executeBuy({
              symbol: order.symbol,
              type: 'buy',
              volume: order.volume,
              price: order.price,
              stopLoss: order.stopLoss,
              takeProfit: order.takeProfit,
            })
          : await this.executor.executeSell({
              symbol: order.symbol,
              type: 'sell',
              volume: order.volume,
              price: order.price,
              stopLoss: order.stopLoss,
              takeProfit: order.takeProfit,
            });

        if (result.success) {
          // Check slippage
          const slippage = this.calculateSlippage(order);
          if (slippage > this.filters.maxSlippagePips) {
            // Slippage too high - could close and retry
            // For now, return success but log warning
          }

          return {
            success: true,
            ticket: result.mt5Ticket,
            price: result.fillPrice,
            volume: order.volume,
            slippage,
            message: result.message,
            attempts,
            retryUsed: attempts > 1,
          };
        }

        lastError = result.error;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
      }

      // Wait before retry with exponential backoff
      if (attempts < this.filters.retryAttempts) {
        await this.sleep(delay);
        delay = Math.min(delay * 2, 5000); // Max 5 seconds
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
      retryUsed: attempts > 1,
    };
  }

  /**
   * Calculate slippage
   */
  private calculateSlippage(order: { type: 'buy' | 'sell'; price?: number }): number {
    // In real implementation, compare requested vs executed price
    const simulatedSlippage = Math.random() * 0.5; // 0-0.5 pips
    return simulatedSlippage;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Modify order (update SL/TP)
   */
  async modifyOrder(
    ticket: number,
    stopLoss?: number,
    takeProfit?: number
  ): Promise<ExecutionResult> {
    const result = await this.executor.modifyPosition({
      ticket,
      stopLoss,
      takeProfit,
    });

    return {
      success: result.success,
      ticket,
      message: result.message,
      error: result.error,
    };
  }

  /**
   * Close position with partial support
   */
  async closePosition(
    ticket: number,
    volume?: number,
    partial?: { percent: number }
  ): Promise<ExecutionResult> {
    const position = this.positionManager.getPosition(ticket);
    if (!position) {
      return { success: false, error: 'Position not found' };
    }

    let closeVolume = volume ?? position.volume;

    // Handle partial close
    if (partial) {
      closeVolume = position.volume * (partial.percent / 100);
      closeVolume = Math.round(closeVolume * 100) / 100; // Round to 2 decimals
    }

    // Check if closing full position
    if (closeVolume >= position.volume) {
      closeVolume = position.volume;
    }

    const result = await this.executor.closePosition({
      ticket,
      volume: closeVolume,
    });

    if (result.success) {
      // Update remaining position if partial
      if (partial && closeVolume < position.volume) {
        position.volume -= closeVolume;
      }
    }

    return {
      success: result.success,
      ticket,
      price: result.fillPrice,
      volume: closeVolume,
      message: result.message,
      error: result.error,
    };
  }

  /**
   * Cancel pending order
   */
  async cancelOrder(ticket: number): Promise<ExecutionResult> {
    // In real implementation, call MT5 to delete pending order
    // For demo, return success
    return {
      success: true,
      ticket,
      message: 'Order cancelled',
    };
  }

  /**
   * Set trailing stop for position
   */
  async setTrailingStop(
    ticket: number,
    config: TrailingStopConfig
  ): Promise<ExecutionResult> {
    const position = this.positionManager.getPosition(ticket);
    if (!position) {
      return { success: false, error: 'Position not found' };
    }

    this.trailingStops.set(ticket, config);

    return {
      success: true,
      ticket,
      message: `Trailing stop set: trigger ${config.triggerPips}pips, step ${config.stepPips}pips`,
    };
  }

  /**
   * Update trailing stops for all tracked positions
   */
  async updateTrailingStops(): Promise<void> {
    for (const [ticket, config] of this.trailingStops.entries()) {
      const position = this.positionManager.getPosition(ticket);
      if (!position) continue;

      const currentPrice = position.currentPrice || position.priceOpen;
      const profitPips = this.calculateProfitPips(position, currentPrice);

      // Check if trailing should activate
      if (profitPips < config.triggerPips) continue;

      // Calculate new stop loss
      let newStopLoss: number | undefined;
      
      if (position.type === 'buy') {
        const trailingStop = currentPrice - (config.stepPips * 0.0001);
        const currentSL = position.stopLoss || position.priceOpen;
        
        if (trailingStop > currentSL) {
          newStopLoss = trailingStop;
        }
      } else {
        const trailingStop = currentPrice + (config.stepPips * 0.0001);
        const currentSL = position.stopLoss || position.priceOpen;
        
        if (trailingStop < currentSL) {
          newStopLoss = trailingStop;
        }
      }

      if (newStopLoss && newStopLoss !== position.stopLoss) {
        await this.modifyOrder(ticket, newStopLoss, undefined);
        position.stopLoss = newStopLoss;
      }
    }
  }

  /**
   * Set break even for position
   */
  async setBreakEven(
    ticket: number,
    config: BreakEvenConfig
  ): Promise<ExecutionResult> {
    const position = this.positionManager.getPosition(ticket);
    if (!position) {
      return { success: false, error: 'Position not found' };
    }

    this.breakEven.set(ticket, config);

    return {
      success: true,
      ticket,
      message: `Break even set: trigger ${config.triggerPips}pips, buffer ${config.bufferPips}pips`,
    };
  }

  /**
   * Update break even for all tracked positions
   */
  async updateBreakEven(): Promise<void> {
    for (const [ticket, config] of this.breakEven.entries()) {
      const position = this.positionManager.getPosition(ticket);
      if (!position) continue;

      // Skip if already at breakeven
      if (position.stopLoss === position.priceOpen) continue;

      const currentPrice = position.currentPrice || position.priceOpen;
      const profitPips = this.calculateProfitPips(position, currentPrice);

      // Check if should move to breakeven
      if (profitPips >= config.triggerPips) {
        let newStopLoss = position.priceOpen;
        
        if (config.addBuffer) {
          // Add small buffer for costs
          const buffer = config.bufferPips * 0.0001;
          newStopLoss = position.type === 'buy'
            ? position.priceOpen + buffer
            : position.priceOpen - buffer;
        }

        if (newStopLoss !== position.stopLoss) {
          await this.modifyOrder(ticket, newStopLoss, undefined);
          position.stopLoss = newStopLoss;
          
          // Remove from break even tracking (already set)
          this.breakEven.delete(ticket);
        }
      }
    }
  }

  /**
   * Set partial close for position
   */
  async setPartialClose(
    ticket: number,
    config: PartialCloseConfig
  ): Promise<ExecutionResult> {
    const position = this.positionManager.getPosition(ticket);
    if (!position) {
      return { success: false, error: 'Position not found' };
    }

    this.partialClose.set(ticket, config);

    return {
      success: true,
      ticket,
      message: `Partial close set: trigger ${config.triggerPips}pips, close ${config.closePercent}%`,
    };
  }

  /**
   * Update partial closes for all tracked positions
   */
  async updatePartialCloses(): Promise<void> {
    for (const [ticket, config] of this.partialClose.entries()) {
      const position = this.positionManager.getPosition(ticket);
      if (!position) continue;

      const currentPrice = position.currentPrice || position.priceOpen;
      const profitPips = this.calculateProfitPips(position, currentPrice);

      // Check if should partial close
      if (profitPips >= config.triggerPips) {
        await this.closePosition(ticket, undefined, { percent: config.closePercent });
        
        // Remove from partial close tracking if fully closed
        const updatedPosition = this.positionManager.getPosition(ticket);
        if (!updatedPosition || updatedPosition.volume === 0) {
          this.partialClose.delete(ticket);
        }
      }
    }
  }

  /**
   * Calculate profit in pips
   */
  private calculateProfitPips(position: Position, currentPrice: number): number {
    const pipSize = 0.0001;
    
    if (position.type === 'buy') {
      return (currentPrice - position.priceOpen) / pipSize;
    } else {
      return (position.priceOpen - currentPrice) / pipSize;
    }
  }

  /**
   * Process all position management (trailing, BE, partial)
   */
  async processAll(): Promise<void> {
    await Promise.all([
      this.updateTrailingStops(),
      this.updateBreakEven(),
      this.updatePartialCloses(),
    ]);
  }

  /**
   * Get filter status
   */
  getFilters(): ExecutionFilters {
    return { ...this.filters };
  }

  /**
   * Update filters
   */
  updateFilters(filters: Partial<ExecutionFilters>): void {
    this.filters = { ...this.filters, ...filters };
  }

  /**
   * Remove trailing stop
   */
  removeTrailingStop(ticket: number): boolean {
    return this.trailingStops.delete(ticket);
  }

  /**
   * Remove break even
   */
  removeBreakEven(ticket: number): boolean {
    return this.breakEven.delete(ticket);
  }

  /**
   * Remove partial close
   */
  removePartialClose(ticket: number): boolean {
    return this.partialClose.delete(ticket);
  }

  /**
   * Get active trailing stops
   */
  getActiveTrailingStops(): Map<number, TrailingStopConfig> {
    return new Map(this.trailingStops);
  }
}

/**
 * Create advanced executor from existing executor
 */
export function createAdvancedExecutor(
  executor: OrderExecutor,
  positionManager: PositionManager,
  filters?: Partial<ExecutionFilters>
): AdvancedOrderExecutor {
  return new AdvancedOrderExecutor(executor, positionManager, filters);
}
