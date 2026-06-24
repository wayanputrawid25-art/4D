// Trading Types

export type OrderType = 'buy' | 'sell';

export type OrderKind = 'market' | 'limit' | 'stop';

export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';

export type PositionStatus = 'open' | 'closed';

export type Timeframe = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1' | 'W1';

export interface Order {
  id: string;
  symbol: string;
  type: OrderType;
  kind: OrderKind;
  volume: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  status: OrderStatus;
  createdAt: Date;
  filledAt?: Date;
}

export interface Position {
  id: string;
  symbol: string;
  type: OrderType;
  volume: number;
  priceOpen: number;
  priceCurrent: number;
  profit: number;
  stopLoss?: number;
  takeProfit?: number;
  status: PositionStatus;
  openedAt: Date;
  closedAt?: Date;
}

export interface MarketQuote {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: Date;
}

// Market Data Types
export interface Symbol {
  id: string;
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
  isActive: boolean;
}

export interface Tick {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: number;
}

export interface Candle {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  tickVolume: number;
  spread: number;
}

export interface Ticker {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

// Market Data Request/Response Types
export interface GetSymbolsRequest {
  category?: string;
  isActive?: boolean;
}

export interface GetCandlesRequest {
  symbol: string;
  timeframe: Timeframe;
  from?: number;
  to?: number;
  limit?: number;
}

export interface GetTickerRequest {
  symbol: string;
}

export interface GetTickersRequest {
  symbols?: string[];
}
