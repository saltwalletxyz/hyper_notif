export interface User {
  id: string;
  email: string;
  name?: string;
  walletAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Alert {
  id: string;
  userId: string;
  name: string;
  type: AlertType;
  asset: string;
  market: MarketType;
  condition: AlertCondition;
  value: number;
  currentValue?: number;
  isActive: boolean;
  triggered: boolean;
  lastTriggered?: string;
  triggerCount: number;
  notifyEmail: boolean;
  notifyWebhook: boolean;
  notifyInApp: boolean;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  alertId?: string;
  alert?: {
    id: string;
    name: string;
    type: AlertType;
    asset: string;
  };
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  readAt?: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketData {
  coin: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  fundingRate?: number;
  openInterest?: number;
  timestamp: string;
}

export interface Position {
  coin: string;
  szi: string;
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  returnOnEquity: string;
  leverage: {
    type: string;
    value: number;
  };
  liquidationPx: string | null;
  marginUsed: string;
}

export interface AccountSummary {
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
    withdrawable: string;
  };
  crossMarginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
    withdrawable: string;
  };
  crossMaintenanceMarginUsed: string;
  withdrawable: string;
  assetPositions: Position[];
}

export enum AlertType {
  PRICE_ABOVE = 'PRICE_ABOVE',
  PRICE_BELOW = 'PRICE_BELOW',
  PRICE_CHANGE_PERCENT = 'PRICE_CHANGE_PERCENT',
  VOLUME_SPIKE = 'VOLUME_SPIKE',
  FUNDING_RATE = 'FUNDING_RATE',
  LIQUIDATION_RISK = 'LIQUIDATION_RISK',
  ORDER_FILLED = 'ORDER_FILLED',
  POSITION_PNL = 'POSITION_PNL',
  BALANCE_CHANGE = 'BALANCE_CHANGE',
}

export enum AlertCondition {
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  EQUALS = 'EQUALS',
  CROSSES_ABOVE = 'CROSSES_ABOVE',
  CROSSES_BELOW = 'CROSSES_BELOW',
}

export enum MarketType {
  PERPETUAL = 'PERPETUAL',
  SPOT = 'SPOT',
}

export enum NotificationType {
  ALERT_TRIGGERED = 'ALERT_TRIGGERED',
  ORDER_UPDATE = 'ORDER_UPDATE',
  POSITION_UPDATE = 'POSITION_UPDATE',
  SYSTEM_MESSAGE = 'SYSTEM_MESSAGE',
  MARKET_UPDATE = 'MARKET_UPDATE',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  WEBHOOK = 'WEBHOOK',
  IN_APP = 'IN_APP',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DELIVERED = 'DELIVERED',
}

export interface CreateAlertRequest {
  name: string;
  type: AlertType;
  asset: string;
  market?: MarketType;
  condition: AlertCondition;
  value: number;
  notifyEmail?: boolean;
  notifyWebhook?: boolean;
  notifyInApp?: boolean;
  metadata?: any;
}

export interface UpdateAlertRequest extends Partial<CreateAlertRequest> {
  isActive?: boolean;
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  error: string;
  details?: any;
}