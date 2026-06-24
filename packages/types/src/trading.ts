// Trading Types - Skeleton
// TODO: Define complete trading types after approval

export type OrderType = 'buy' | 'sell';

export type OrderKind = 'market' | 'limit' | 'stop';

export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';

export type PositionStatus = 'open' | 'closed';

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
