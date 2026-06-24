import type { Symbol, Candle, Tick, Ticker, Timeframe } from '@forexos/types';

// MT5 Connection Types
export interface MT5Config {
  host: string;
  port: number;
  login?: number;
  password?: string;
  server?: string;
  useDemo: boolean;
}

// MT5 Symbol Info (as returned by MT5 API)
export interface MT5SymbolInfo {
  name: string;
  description: string;
  category: string;
  digits: number;
  contractSize: number;
  tickValue: number;
  tickSize: number;
  volumeMin: number;
  volumeMax: number;
  volumeStep: number;
  spread: number;
  isConnected: boolean;
}

// MT5 Tick Data
export interface MT5Tick {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  time: number;
}

// MT5 Quote Info
export interface MT5QuoteInfo {
  symbol: string;
  bid: number;
  ask: number;
  high: number;
  low: number;
  last: number;
  volume: number;
  time: number;
}

// Default MT5 Configuration
const DEFAULT_CONFIG: MT5Config = {
  host: process.env.MT5_HOST || 'localhost',
  port: parseInt(process.env.MT5_PORT || '8888'),
  useDemo: process.env.MT5_USE_DEMO === 'true' || true,
};

// Popular forex symbols
const FOREX_SYMBOLS = [
  { name: 'EURUSD', description: 'Euro vs US Dollar', category: 'Forex' },
  { name: 'GBPUSD', description: 'British Pound vs US Dollar', category: 'Forex' },
  { name: 'USDJPY', description: 'US Dollar vs Japanese Yen', category: 'Forex' },
  { name: 'USDCHF', description: 'US Dollar vs Swiss Franc', category: 'Forex' },
  { name: 'AUDUSD', description: 'Australian Dollar vs US Dollar', category: 'Forex' },
  { name: 'USDCAD', description: 'US Dollar vs Canadian Dollar', category: 'Forex' },
  { name: 'NZDUSD', description: 'New Zealand Dollar vs US Dollar', category: 'Forex' },
  { name: 'EURGBP', description: 'Euro vs British Pound', category: 'Forex' },
  { name: 'EURJPY', description: 'Euro vs Japanese Yen', category: 'Forex' },
  { name: 'GBPJPY', description: 'British Pound vs Japanese Yen', category: 'Forex' },
];

// Timeframe to minutes mapping
const TIMEFRAME_MINUTES: Record<Timeframe, number> = {
  M1: 1,
  M5: 5,
  M15: 15,
  M30: 30,
  H1: 60,
  H4: 240,
  D1: 1440,
  W1: 10080,
};

// Base prices for simulation
const BASE_PRICES: Record<string, { bid: number; ask: number }> = {
  EURUSD: { bid: 1.0850, ask: 1.0852 },
  GBPUSD: { bid: 1.2650, ask: 1.2653 },
  USDJPY: { bid: 149.50, ask: 149.52 },
  USDCHF: { bid: 0.8850, ask: 0.8853 },
  AUDUSD: { bid: 0.6550, ask: 0.6553 },
  USDCAD: { bid: 1.3650, ask: 1.3653 },
  NZDUSD: { bid: 0.6050, ask: 0.6053 },
  EURGBP: { bid: 0.8550, ask: 0.8553 },
  EURJPY: { bid: 162.50, ask: 162.53 },
  GBPJPY: { bid: 189.50, ask: 189.54 },
};

class MT5MarketService {
  private config: MT5Config;
  private connected: boolean = false;
  private socket: WebSocket | null = null;

  constructor(config: MT5Config = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Connect to MT5 Terminal
   */
  async connect(): Promise<boolean> {
    if (this.config.useDemo) {
      console.log('[MT5] Running in DEMO mode - using simulated data');
      this.connected = true;
      return true;
    }

    try {
      // In production, connect to MT5 WebSocket API
      // This would connect to a wrapper service that communicates with MT5
      // const ws = new WebSocket(`ws://${this.config.host}:${this.config.port}`);
      // await this.waitForConnection(ws);
      // this.socket = ws;
      
      console.log(`[MT5] Would connect to ${this.config.host}:${this.config.port}`);
      this.connected = true;
      return true;
    } catch (error) {
      console.error('[MT5] Connection failed:', error);
      return false;
    }
  }

  /**
   * Disconnect from MT5
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get all available symbols
   */
  async getSymbols(category?: string): Promise<Symbol[]> {
    await this.ensureConnected();

    if (this.config.useDemo) {
      return this.getDemoSymbols(category);
    }

    // In production, request from MT5
    return this.getDemoSymbols(category);
  }

  /**
   * Get single symbol info
   */
  async getSymbol(symbolName: string): Promise<Symbol | null> {
    await this.ensureConnected();

    const symbols = await this.getSymbols();
    return symbols.find(s => s.name === symbolName) || null;
  }

  /**
   * Get current tick data
   */
  async getTick(symbol: string): Promise<Tick | null> {
    await this.ensureConnected();

    if (this.config.useDemo) {
      return this.generateDemoTick(symbol);
    }

    // In production, request from MT5
    return this.generateDemoTick(symbol);
  }

  /**
   * Get ticker data (includes high/low/change)
   */
  async getTicker(symbol: string): Promise<Ticker | null> {
    await this.ensureConnected();

    const tick = await this.getTick(symbol);
    if (!tick) return null;

    const base = BASE_PRICES[symbol] || { bid: 1.0, ask: 1.0 };
    const change = (Math.random() - 0.5) * 0.005;
    
    return {
      symbol,
      bid: tick.bid,
      ask: tick.ask,
      last: tick.last,
      high: tick.last * 1.002,
      low: tick.last * 0.998,
      change: change * base.bid,
      changePercent: change * 100,
      volume: Math.floor(Math.random() * 100000),
      timestamp: Date.now(),
    };
  }

  /**
   * Get multiple tickers
   */
  async getTickers(symbols?: string[]): Promise<Ticker[]> {
    const targetSymbols = symbols || Object.keys(BASE_PRICES);
    const tickers: Ticker[] = [];

    for (const symbol of targetSymbols) {
      const ticker = await this.getTicker(symbol);
      if (ticker) {
        tickers.push(ticker);
      }
    }

    return tickers;
  }

  /**
   * Get historical candle data
   */
  async getCandles(
    symbol: string,
    timeframe: Timeframe,
    from?: number,
    to?: number,
    limit: number = 100
  ): Promise<Candle[]> {
    await this.ensureConnected();

    if (this.config.useDemo) {
      return this.generateDemoCandles(symbol, timeframe, from, to, limit);
    }

    // In production, request from MT5
    return this.generateDemoCandles(symbol, timeframe, from, to, limit);
  }

  /**
   * Subscribe to real-time ticks (returns async iterator)
   */
  async *subscribeTicks(symbols: string[]): AsyncGenerator<Tick> {
    await this.ensureConnected();

    while (this.connected) {
      for (const symbol of symbols) {
        const tick = await this.getTick(symbol);
        if (tick) {
          yield tick;
        }
      }
      // Simulate ~1 second updates
      await this.sleep(1000);
    }
  }

  // ==================== Private Methods ====================

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getDemoSymbols(category?: string): Symbol[] {
    let symbols = FOREX_SYMBOLS.map((s, i) => ({
      id: `sym_${i + 1}`,
      name: s.name,
      description: s.description,
      category: s.category,
      digits: s.name.includes('JPY') ? 3 : 5,
      contractSize: 100000,
      tickValue: 10,
      tickSize: s.name.includes('JPY') ? 0.001 : 0.00001,
      volumeMin: 0.01,
      volumeMax: 100,
      volumeStep: 0.01,
      isActive: true,
    }));

    if (category) {
      symbols = symbols.filter(s => s.category === category);
    }

    return symbols;
  }

  private generateDemoTick(symbol: string): Tick {
    const base = BASE_PRICES[symbol];
    if (!base) {
      return {
        symbol,
        bid: 1.0,
        ask: 1.0003,
        last: 1.00015,
        volume: 0,
        timestamp: Date.now(),
      };
    }

    // Add small random variation
    const variation = (Math.random() - 0.5) * 0.0005;
    const spread = base.ask - base.bid;

    return {
      symbol,
      bid: base.bid + variation,
      ask: base.bid + variation + spread,
      last: base.bid + variation + spread / 2,
      volume: Math.floor(Math.random() * 1000),
      timestamp: Date.now(),
    };
  }

  private generateDemoCandles(
    symbol: string,
    timeframe: Timeframe,
    from?: number,
    to?: number,
    limit: number = 100
  ): Candle[] {
    const candles: Candle[] = [];
    const timeframeMs = TIMEFRAME_MINUTES[timeframe] * 60 * 1000;
    
    const endTime = to || Date.now();
    const startTime = from || endTime - (limit * timeframeMs);
    
    let currentTime = startTime;
    let lastClose = BASE_PRICES[symbol]?.bid || 1.0;

    while (candles.length < limit && currentTime <= endTime) {
      // Generate OHLC with some variation
      const volatility = 0.001;
      const change = (Math.random() - 0.5) * volatility;
      
      const open = lastClose;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);

      candles.push({
        id: `candle_${symbol}_${timeframe}_${currentTime}`,
        symbol,
        timeframe,
        timestamp: currentTime,
        open,
        high,
        low,
        close,
        tickVolume: Math.floor(Math.random() * 10000),
        spread: Math.random() * 10,
      });

      lastClose = close;
      currentTime += timeframeMs;
    }

    return candles;
  }
}

// Singleton instance
export const mt5Service = new MT5MarketService();

export default MT5MarketService;
