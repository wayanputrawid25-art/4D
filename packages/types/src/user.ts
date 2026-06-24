// User Types - Skeleton
// TODO: Define complete user types after approval

export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MT5Account {
  id: string;
  userId: string;
  accountId: string;
  server: string;
  isConnected: boolean;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  lastSyncAt: Date;
}

export interface RiskSettings {
  maxRiskPercent: number;
  dailyLossLimit: number;
  maxDrawdownPercent: number;
  maxPositions: number;
  maxLotPerTrade: number;
}
