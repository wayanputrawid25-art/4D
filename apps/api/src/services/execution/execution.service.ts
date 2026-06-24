// MT5 Execution Service - Main service for trading execution
import type { OrderRequest, Position, AccountInfo } from '@forexos/types';
import { MT5Connector } from '../../../packages/engine/src/execution/connector';
import { OrderExecutor } from '../../../packages/engine/src/execution/executor';
import { PositionManager } from '../../../packages/engine/src/execution/manager';

export interface ExecutionStatus {
  connected: boolean;
  demoMode: boolean;
  positions: number;
  accountBalance: number;
  equity: number;
}

export interface TradeExecution {
  success: boolean;
  ticket?: number;
  message?: string;
  error?: string;
  price?: number;
  volume?: number;
}

export class ExecutionService {
  private connector: MT5Connector;
  private executor: OrderExecutor;
  private positionManager: PositionManager;
  private isDemo: boolean;
  private accountInfo: AccountInfo | null = null;

  constructor() {
    this.isDemo = process.env.MT5_USE_DEMO !== 'false';
    this.connector = new MT5Connector();
    this.executor = new OrderExecutor(this.connector, this.isDemo);
    this.positionManager = new PositionManager(this.executor);
  }

  /**
   * Initialize connection
   */
  async initialize(): Promise<boolean> {
    try {
      const connected = await this.connector.connect();
      
      if (connected) {
        // Get account info
        this.accountInfo = await this.connector.getAccountInfo();
        
        // Start position tracking
        this.positionManager.startTracking(5000);
      }
      
      return connected;
    } catch (error) {
      console.error('[Execution] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Get execution status
   */
  async getStatus(): Promise<ExecutionStatus> {
    const state = this.connector.getState();
    const summary = this.positionManager.getSummary();

    return {
      connected: state.connected,
      demoMode: this.isDemo,
      positions: summary.totalPositions,
      accountBalance: this.accountInfo?.balance || 10000,
      equity: this.accountInfo?.equity || 10000,
    };
  }

  /**
   * Get account info
   */
  async getAccount(): Promise<AccountInfo | null> {
    if (this.accountInfo) {
      return this.accountInfo;
    }

    this.accountInfo = await this.connector.getAccountInfo();
    return this.accountInfo;
  }

  /**
   * Execute a buy order
   */
  async executeBuy(order: OrderRequest): Promise<TradeExecution> {
    const result = await this.executor.executeBuy(order);
    
    if (result.success) {
      // Refresh positions
      await this.positionManager.refreshPositions();
    }

    return {
      success: result.success,
      ticket: result.mt5Ticket,
      message: result.message,
      error: result.error,
      price: result.fillPrice,
      volume: order.volume,
    };
  }

  /**
   * Execute a sell order
   */
  async executeSell(order: OrderRequest): Promise<TradeExecution> {
    const result = await this.executor.executeSell(order);
    
    if (result.success) {
      await this.positionManager.refreshPositions();
    }

    return {
      success: result.success,
      ticket: result.mt5Ticket,
      message: result.message,
      error: result.error,
      price: result.fillPrice,
      volume: order.volume,
    };
  }

  /**
   * Close a position
   */
  async closePosition(ticket: number, volume?: number): Promise<TradeExecution> {
    const result = await this.executor.closePosition({ ticket, volume });
    
    if (result.success) {
      await this.positionManager.refreshPositions();
    }

    return {
      success: result.success,
      ticket,
      message: result.message,
      error: result.error,
      price: result.fillPrice,
    };
  }

  /**
   * Close all positions for a symbol
   */
  async closeAllBySymbol(symbol: string): Promise<{ success: boolean; closed: number; errors: string[] }> {
    return this.positionManager.closeAllBySymbol(symbol);
  }

  /**
   * Close all positions
   */
  async closeAll(): Promise<{ success: boolean; closed: number; errors: string[] }> {
    return this.positionManager.closeAll();
  }

  /**
   * Modify position SL/TP
   */
  async modifyPosition(ticket: number, stopLoss?: number, takeProfit?: number): Promise<{ success: boolean; error?: string }> {
    const result = await this.executor.modifyPosition({ ticket, stopLoss, takeProfit });
    return {
      success: result.success,
      error: result.error,
    };
  }

  /**
   * Move stop loss to breakeven
   */
  async moveToBreakeven(ticket: number): Promise<boolean> {
    return this.positionManager.moveToBreakeven(ticket);
  }

  /**
   * Get all open positions
   */
  async getPositions(): Promise<Position[]> {
    await this.positionManager.refreshPositions();
    return this.positionManager.getPositions();
  }

  /**
   * Get position by ticket
   */
  async getPosition(ticket: number): Promise<Position | undefined> {
    return this.positionManager.getPosition(ticket);
  }

  /**
   * Get positions by symbol
   */
  async getPositionsBySymbol(symbol: string): Promise<Position[]> {
    return this.positionManager.getPositionsBySymbol(symbol);
  }

  /**
   * Get position summary
   */
  getPositionSummary() {
    return this.positionManager.getSummary();
  }

  /**
   * Calculate margin for order
   */
  calculateMargin(symbol: string, volume: number, price: number, leverage?: number): number {
    return this.executor.calculateMargin(symbol, volume, price, leverage);
  }

  /**
   * Get symbol info
   */
  async getSymbolInfo(symbol: string) {
    return this.connector.getSymbolInfo(symbol);
  }

  /**
   * Get current tick
   */
  async getTick(symbol: string) {
    return this.connector.getTick(symbol);
  }

  /**
   * Get trade history
   */
  getTradeHistory(limit?: number) {
    return this.positionManager.getHistory(limit);
  }

  /**
   * Get trade statistics
   */
  getTradeStats() {
    return this.positionManager.calculateStats();
  }

  /**
   * Disconnect
   */
  disconnect() {
    this.positionManager.stopTracking();
    this.connector.disconnect();
  }
}

export const executionService = new ExecutionService();
export default ExecutionService;
