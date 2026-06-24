// Order Executor - Handles order execution and validation
import type { 
  OrderRequest, 
  OrderResult, 
  Position,
  ClosePositionRequest,
  ModifyPositionRequest
} from './types';
import { MT5Connector } from './connector';

// Symbol specifications
const SYMBOL_SPECS: Record<string, {
  contractSize: number;
  pipDecimal: number;
  minVolume: number;
  maxVolume: number;
  volumeStep: number;
  stopLevel: number;
}> = {
  EURUSD: { contractSize: 100000, pipDecimal: 0.0001, minVolume: 0.01, maxVolume: 100, volumeStep: 0.01, stopLevel: 1.5 },
  GBPUSD: { contractSize: 100000, pipDecimal: 0.0001, minVolume: 0.01, maxVolume: 100, volumeStep: 0.01, stopLevel: 1.5 },
  USDJPY: { contractSize: 100000, pipDecimal: 0.01, minVolume: 0.01, maxVolume: 100, volumeStep: 0.01, stopLevel: 1.5 },
  USDCHF: { contractSize: 100000, pipDecimal: 0.0001, minVolume: 0.01, maxVolume: 100, volumeStep: 0.01, stopLevel: 1.5 },
  AUDUSD: { contractSize: 100000, pipDecimal: 0.0001, minVolume: 0.01, maxVolume: 100, volumeStep: 0.01, stopLevel: 1.5 },
  USDCAD: { contractSize: 100000, pipDecimal: 0.0001, minVolume: 0.01, maxVolume: 100, volumeStep: 0.01, stopLevel: 1.5 },
};

export interface ExecutionValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class OrderExecutor {
  private connector: MT5Connector;
  private isDemo: boolean;

  constructor(connector: MT5Connector, isDemo: boolean = true) {
    this.connector = connector;
    this.isDemo = isDemo;
  }

  /**
   * Validate order request
   */
  validateOrder(order: OrderRequest): ExecutionValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check symbol
    const specs = SYMBOL_SPECS[order.symbol];
    if (!specs) {
      errors.push(`Unknown symbol: ${order.symbol}`);
      return { valid: false, errors, warnings };
    }

    // Validate volume
    if (order.volume < specs.minVolume) {
      errors.push(`Volume too small. Minimum: ${specs.minVolume}`);
    }
    if (order.volume > specs.maxVolume) {
      errors.push(`Volume too large. Maximum: ${specs.maxVolume}`);
    }
    if (order.volume % specs.volumeStep !== 0) {
      errors.push(`Volume must be in steps of ${specs.volumeStep}`);
    }

    // Validate prices for pending orders
    if (order.kind !== 'market') {
      if (!order.price) {
        errors.push(`Price required for ${order.kind} orders`);
      }
    }

    // Validate stop loss and take profit
    if (order.stopLoss && order.takeProfit) {
      if (order.type === 'buy') {
        if (order.stopLoss >= order.price || order.price >= order.takeProfit) {
          errors.push('Invalid SL/TP for buy order');
        }
      } else {
        if (order.stopLoss <= order.price || order.price <= order.takeProfit) {
          errors.push('Invalid SL/TP for sell order');
        }
      }
    }

    // Check stop level distance
    if (order.kind === 'market' && (order.stopLoss || order.takeProfit)) {
      const tick = this.connector.getTick ? null : null; // Would need actual tick
      const pipDecimal = specs.pipDecimal;
      
      if (order.stopLoss) {
        const slDistance = Math.abs((order.price || 0) - order.stopLoss) / pipDecimal;
        if (slDistance < specs.stopLevel) {
          warnings.push(`Stop loss is close to market price (${slDistance.toFixed(1)} pips)`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Execute a buy order
   */
  async executeBuy(order: OrderRequest): Promise<OrderResult> {
    // Validate
    const validation = this.validateOrder({ ...order, type: 'buy' });
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join('; '),
      };
    }

    if (this.isDemo) {
      return this.executeDemoOrder(order, 'buy');
    }

    try {
      const result = await this.connector.sendOrder({
        symbol: order.symbol,
        type: 'buy',
        volume: order.volume,
        price: order.price,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
        comment: order.comment,
        magicNumber: order.magicNumber,
      });

      if (result && result.retcode === 10009) {
        return {
          success: true,
          mt5Ticket: result.deal,
          message: 'Order executed successfully',
          fillPrice: result.price,
          fillTime: Date.now(),
        };
      }

      return {
        success: false,
        error: result?.retstring || 'Execution failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a sell order
   */
  async executeSell(order: OrderRequest): Promise<OrderResult> {
    // Validate
    const validation = this.validateOrder({ ...order, type: 'sell' });
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join('; '),
      };
    }

    if (this.isDemo) {
      return this.executeDemoOrder(order, 'sell');
    }

    try {
      const result = await this.connector.sendOrder({
        symbol: order.symbol,
        type: 'sell',
        volume: order.volume,
        price: order.price,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
        comment: order.comment,
        magicNumber: order.magicNumber,
      });

      if (result && result.retcode === 10009) {
        return {
          success: true,
          mt5Ticket: result.deal,
          message: 'Order executed successfully',
          fillPrice: result.price,
          fillTime: Date.now(),
        };
      }

      return {
        success: false,
        error: result?.retstring || 'Execution failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Close a position
   */
  async closePosition(request: ClosePositionRequest): Promise<OrderResult> {
    if (this.isDemo) {
      return {
        success: true,
        mt5Ticket: request.ticket,
        message: 'Position closed (demo)',
      };
    }

    try {
      const result = await this.connector.closePosition(request.ticket, request.volume);

      if (result && result.retcode === 10009) {
        return {
          success: true,
          mt5Ticket: result.deal,
          message: 'Position closed successfully',
          fillPrice: result.price,
          fillTime: Date.now(),
        };
      }

      return {
        success: false,
        error: result?.retstring || 'Close failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Modify position SL/TP
   */
  async modifyPosition(request: ModifyPositionRequest): Promise<OrderResult> {
    if (this.isDemo) {
      return {
        success: true,
        mt5Ticket: request.ticket,
        message: 'Position modified (demo)',
      };
    }

    try {
      const success = await this.connector.modifyPosition(
        request.ticket,
        request.stopLoss,
        request.takeProfit
      );

      if (success) {
        return {
          success: true,
          mt5Ticket: request.ticket,
          message: 'Position modified successfully',
        };
      }

      return {
        success: false,
        error: 'Modification failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all open positions
   */
  async getOpenPositions(): Promise<Position[]> {
    if (this.isDemo) {
      return []; // Demo mode has no positions
    }

    return this.connector.getPositions();
  }

  /**
   * Get position by ticket
   */
  async getPosition(ticket: number): Promise<Position | null> {
    const positions = await this.getOpenPositions();
    return positions.find(p => p.mt5Ticket === ticket) || null;
  }

  /**
   * Calculate margin required for order
   */
  calculateMargin(symbol: string, volume: number, price: number, leverage: number = 100): number {
    const specs = SYMBOL_SPECS[symbol] || SYMBOL_SPECS.EURUSD;
    const contractValue = volume * specs.contractSize * price;
    return contractValue / leverage;
  }

  /**
   * Calculate pip value for symbol
   */
  calculatePipValue(symbol: string, volume: number): number {
    const specs = SYMBOL_SPECS[symbol] || SYMBOL_SPECS.EURUSD;
    return specs.contractSize * volume * specs.pipDecimal;
  }

  /**
   * Demo order execution
   */
  private executeDemoOrder(order: OrderRequest, type: 'buy' | 'sell'): OrderResult {
    const specs = SYMBOL_SPECS[order.symbol] || SYMBOL_SPECS.EURUSD;
    const basePrice = 1.0850;
    
    const ticket = Math.floor(Math.random() * 1000000) + 1000000;
    
    return {
      success: true,
      orderId: `demo_${ticket}`,
      mt5Ticket: ticket,
      message: 'Order executed successfully (DEMO)',
      fillPrice: basePrice + (Math.random() - 0.5) * 0.001,
      fillTime: Date.now(),
    };
  }
}
