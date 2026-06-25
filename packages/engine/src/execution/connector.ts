// MT5 Connector - WebSocket connection to MT5 Bridge
import type { 
  MT5ConnectionConfig, 
  MT5Request, 
  MT5Response,
  MT5Tick,
  MT5SymbolInfo,
  AccountInfo,
  Position,
  TradeResult
} from './types';
import { configService } from '@forexos/trading-config';

export interface MT5ConnectionState {
  connected: boolean;
  authenticated: boolean;
  lastError?: string;
  reconnectAttempts: number;
}

export class MT5Connector {
  private config: MT5ConnectionConfig;
  private ws: WebSocket | null = null;
  private state: MT5ConnectionState;
  private pendingRequests: Map<string, {
    resolve: (response: MT5Response) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private tickCallbacks: Map<string, (tick: MT5Tick) => void> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isDemo: boolean;

  constructor(config?: Partial<MT5ConnectionConfig>) {
    // Get MT5 config from configuration service
    const mt5Config = configService.getMT5Config();
    
    this.config = {
      host: config?.host ?? mt5Config.host,
      port: config?.port ?? mt5Config.port,
      login: config?.login ?? mt5Config.login ?? parseInt(process.env.MT5_LOGIN || '0'),
      password: config?.password ?? mt5Config.password ?? process.env.MT5_PASSWORD || '',
      server: config?.server ?? mt5Config.server ?? process.env.MT5_SERVER || '',
      reconnectInterval: config?.reconnectInterval ?? mt5Config.reconnectInterval,
      maxRetries: config?.maxRetries ?? mt5Config.maxRetries,
    };
    
    this.state = {
      connected: false,
      authenticated: false,
      reconnectAttempts: 0,
    };
    
    // Demo mode must be explicitly enabled in config
    this.isDemo = config?.useDemo ?? mt5Config.useDemo ?? process.env.MT5_USE_DEMO === 'true';
  }

  /**
   * Connect to MT5 server
   */
  async connect(): Promise<boolean> {
    if (this.isDemo) {
      console.log('[MT5] Running in DEMO mode');
      this.state.connected = true;
      this.state.authenticated = true;
      return true;
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `ws://${this.config.host}:${this.config.port}`;
        console.log(`[MT5] Connecting to ${wsUrl}`);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('[MT5] WebSocket connected');
          this.state.connected = true;
          this.authenticate().then(authenticated => {
            if (authenticated) {
              this.state.authenticated = true;
              resolve(true);
            } else {
              this.state.authenticated = false;
              resolve(false);
            }
          });
        };

        this.ws.onclose = () => {
          console.log('[MT5] WebSocket closed');
          this.state.connected = false;
          this.state.authenticated = false;
          this.handleDisconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[MT5] WebSocket error:', error);
          if (!this.state.connected) {
            reject(new Error('Connection failed'));
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from MT5
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state.connected = false;
    this.state.authenticated = false;
    
    // Clear pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  /**
   * Get connection state
   */
  getState(): MT5ConnectionState {
    return { ...this.state };
  }

  /**
   * Authenticate with MT5 server
   */
  private async authenticate(): Promise<boolean> {
    try {
      const response = await this.sendRequest({
        command: 'CONNECT',
        id: this.generateId(),
        params: {
          login: this.config.login,
          password: this.config.password,
          server: this.config.server,
        },
      });

      return response.success;
    } catch (error) {
      console.error('[MT5] Authentication failed:', error);
      return false;
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    if (this.state.reconnectAttempts < this.config.maxRetries) {
      this.state.reconnectAttempts++;
      console.log(`[MT5] Reconnecting in ${this.config.reconnectInterval}ms (attempt ${this.state.reconnectAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch(console.error);
      }, this.config.reconnectInterval);
    } else {
      console.error('[MT5] Max reconnect attempts reached');
      this.state.lastError = 'Max reconnect attempts reached';
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const response: MT5Response = JSON.parse(data);
      
      if (response.id && this.pendingRequests.has(response.id)) {
        const pending = this.pendingRequests.get(response.id)!;
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id);
        pending.resolve(response);
      }
    } catch (error) {
      console.error('[MT5] Failed to parse message:', error);
    }
  }

  /**
   * Send request to MT5
   */
  private sendRequest(request: MT5Request): Promise<MT5Response> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          reject(new Error('Request timeout'));
        }
      }, 30000);

      this.pendingRequests.set(request.id, { resolve, reject, timeout });
      this.ws.send(JSON.stringify(request));
    });
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==================== Public API ====================

  /**
   * Get account info
   */
  async getAccountInfo(): Promise<AccountInfo | null> {
    if (this.isDemo) {
      return this.getDemoAccountInfo();
    }

    try {
      const response = await this.sendRequest({
        command: 'ACCOUNT_INFO',
        id: this.generateId(),
      });

      if (response.success && response.data) {
        return response.data as AccountInfo;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get symbol info
   */
  async getSymbolInfo(symbol: string): Promise<MT5SymbolInfo | null> {
    if (this.isDemo) {
      return this.getDemoSymbolInfo(symbol);
    }

    try {
      const response = await this.sendRequest({
        command: 'GET_SYMBOL_INFO',
        id: this.generateId(),
        params: { symbol },
      });

      if (response.success && response.data) {
        return response.data as MT5SymbolInfo;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get current tick
   */
  async getTick(symbol: string): Promise<MT5Tick | null> {
    if (this.isDemo) {
      return this.getDemoTick(symbol);
    }

    try {
      const response = await this.sendRequest({
        command: 'GET_TICK',
        id: this.generateId(),
        params: { symbol },
      });

      if (response.success && response.data) {
        return response.data as MT5Tick;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get all open positions
   */
  async getPositions(): Promise<Position[]> {
    if (this.isDemo) {
      return [];
    }

    try {
      const response = await this.sendRequest({
        command: 'GET_POSITIONS',
        id: this.generateId(),
      });

      if (response.success && response.data) {
        return response.data as Position[];
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Send order
   */
  async sendOrder(params: {
    symbol: string;
    type: 'buy' | 'sell';
    volume: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
    comment?: string;
    magicNumber?: number;
  }): Promise<TradeResult | null> {
    if (this.isDemo) {
      return this.getDemoTradeResult(params);
    }

    try {
      const response = await this.sendRequest({
        command: 'ORDER_SEND',
        id: this.generateId(),
        params,
      });

      if (response.success && response.data) {
        return response.data as TradeResult;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Close position
   */
  async closePosition(ticket: number, volume?: number): Promise<TradeResult | null> {
    if (this.isDemo) {
      return this.getDemoTradeResult({ symbol: 'EURUSD', type: 'sell', volume: volume || 0.01 });
    }

    try {
      const response = await this.sendRequest({
        command: 'POSITION_CLOSE',
        id: this.generateId(),
        params: { ticket, volume },
      });

      if (response.success && response.data) {
        return response.data as TradeResult;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Modify position
   */
  async modifyPosition(ticket: number, stopLoss?: number, takeProfit?: number): Promise<boolean> {
    if (this.isDemo) {
      return true;
    }

    try {
      const response = await this.sendRequest({
        command: 'ORDER_MODIFY',
        id: this.generateId(),
        params: { ticket, stopLoss, takeProfit },
      });

      return response.success;
    } catch {
      return false;
    }
  }

  // ==================== Demo Data ====================

  private getDemoAccountInfo(): AccountInfo {
    return {
      login: 12345678,
      name: 'Demo Trader',
      server: 'Demo Server',
      currency: 'USD',
      balance: 10000,
      equity: 10000,
      margin: 0,
      freeMargin: 10000,
      marginLevel: 0,
      leverage: 100,
      trades: 0,
      deals: 0,
    };
  }

  private getDemoSymbolInfo(symbol: string): MT5SymbolInfo {
    const basePrices: Record<string, number> = {
      EURUSD: 1.0850,
      GBPUSD: 1.2650,
      USDJPY: 149.50,
      USDCHF: 0.8850,
      AUDUSD: 0.6550,
      USDCAD: 1.3650,
    };

    const base = basePrices[symbol] || 1.0;

    return {
      symbol,
      bid: base,
      ask: base + base * 0.0002,
      spread: 2,
      digits: symbol.includes('JPY') ? 3 : 5,
      volumeMin: 0.01,
      volumeMax: 100,
      volumeStep: 0.01,
      contractSize: 100000,
      marginHedge: 0.5,
      swapLong: -5,
      swapShort: -5,
    };
  }

  private getDemoTick(symbol: string): MT5Tick {
    const basePrices: Record<string, number> = {
      EURUSD: 1.0850,
      GBPUSD: 1.2650,
      USDJPY: 149.50,
    };

    const base = basePrices[symbol] || 1.0;
    const variation = (Math.random() - 0.5) * 0.0005;

    return {
      symbol,
      bid: base + variation,
      ask: base + variation + base * 0.0002,
      last: base + variation + base * 0.0001,
      volume: Math.floor(Math.random() * 1000),
      timestamp: Date.now(),
    };
  }

  private getDemoTradeResult(params: {
    symbol: string;
    type: 'buy' | 'sell';
    volume: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
  }): TradeResult {
    return {
      deal: Math.floor(Math.random() * 1000000) + 1000000,
      order: Math.floor(Math.random() * 1000000) + 1000000,
      volume: params.volume,
      price: params.price || 1.0850,
      bid: 1.0850,
      ask: 1.0852,
      comment: params.comment || '',
      retcode: 10009, // TRADE_RETCODE_DEAL
      retstring: 'Done',
    };
  }
}

export const mt5Connector = new MT5Connector();
