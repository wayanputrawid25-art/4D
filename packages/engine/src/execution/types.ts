// MT5 Execution Types
import type { OrderType, OrderKind } from '@forexos/types';

// MT5 Connection Types
export interface MT5ConnectionConfig {
  host: string;
  port: number;
  login: number;
  password: string;
  server: string;
  reconnectInterval: number;
  maxRetries: number;
}

export interface MT5SymbolInfo {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  digits: number;
  volumeMin: number;
  volumeMax: number;
  volumeStep: number;
  contractSize: number;
  marginHedge: number;
  swapLong: number;
  swapShort: number;
}

export interface MT5Tick {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: number;
}

// Order Types
export type OrderAction = 'open' | 'close' | 'modify';
export type OrderStatus = 'pending' | 'filled' | 'partial' | 'cancelled' | 'rejected';
export type PositionStatus = 'open' | 'closed';

export interface OrderRequest {
  symbol: string;
  type: OrderType;
  kind: OrderKind;
  volume: number;
  price?: number; // For limit/stop orders
  stopLoss?: number;
  takeProfit?: number;
  comment?: string;
  magicNumber?: number; // For EA identification
}

export interface OrderResult {
  success: boolean;
  orderId?: number;
  mt5Ticket?: number;
  message?: string;
  error?: string;
  fillPrice?: number;
  fillTime?: number;
}

export interface Position {
  id: string;
  mt5Ticket: number;
  symbol: string;
  type: OrderType;
  volume: number;
  priceOpen: number;
  priceCurrent: number;
  stopLoss?: number;
  takeProfit?: number;
  profit: number;
  swap: number;
  commission: number;
  comment?: string;
  openTime: number;
  updateTime: number;
}

export interface TradeHistory {
  id: string;
  mt5Ticket: number;
  symbol: string;
  type: OrderType;
  volume: number;
  priceOpen: number;
  priceClose: number;
  profit: number;
  commission: number;
  swap: number;
  comment?: string;
  openTime: number;
  closeTime: number;
}

// Execution Types
export interface ExecutionPlan {
  orderRequest: OrderRequest;
  expectedPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  positionSize: number;
}

export interface ExecutionResult {
  success: boolean;
  position?: Position;
  orderId?: string;
  mt5Ticket?: number;
  message?: string;
  error?: string;
  executionPrice?: number;
  executionTime?: number;
  slippage?: number;
}

// MT5 API Commands
export type MT5Command = 
  | 'CONNECT'
  | 'DISCONNECT'
  | 'GET_SYMBOL_INFO'
  | 'GET_TICK'
  | 'GET_POSITIONS'
  | 'GET_ORDERS'
  | 'ORDER_SEND'
  | 'ORDER_CLOSE'
  | 'ORDER_MODIFY'
  | 'POSITION_CLOSE'
  | 'ACCOUNT_INFO';

export interface MT5Request {
  command: MT5Command;
  id: string;
  params?: Record<string, unknown>;
}

export interface MT5Response {
  success: boolean;
  id: string;
  data?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

// Account Types
export interface AccountInfo {
  login: number;
  name: string;
  server: string;
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  leverage: number;
  trades: number;
  deals: number;
}

// Trade Result
export interface TradeResult {
  deal: number;
  order: number;
  volume: number;
  price: number;
  bid: number;
  ask: number;
  comment: string;
  retcode: number;
  retstring: string;
}

// Position Close Request
export interface ClosePositionRequest {
  ticket: number;
  volume?: number; // Partial close
  price?: number;
  slippage?: number;
}

// Modify Position Request
export interface ModifyPositionRequest {
  ticket: number;
  stopLoss?: number;
  takeProfit?: number;
}
