export interface HyperliquidConfig {
  apiUrl: string;
  wsUrl: string;
}

export interface AssetInfo {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated: boolean;
}

export interface AssetContext {
  coin: string;
  markPx: string;
  midPx: string;
  prevDayPx: string;
  dayNtlVlm: string;
  funding: string;
  openInterest: string;
  oraclePx: string;
}

export interface UserFill {
  coin: string;
  px: string;
  sz: string;
  side: 'B' | 'A';
  time: number;
  startPosition: string;
  dir: string;
  closedPnl: string;
  fee: string;
  tid: number;
  oid: number;
}

export interface OpenOrder {
  coin: string;
  side: 'B' | 'A';
  limitPx: string;
  sz: string;
  oid: number;
  timestamp: number;
  origSz: string;
  cloid?: string;
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

export interface OrderUpdate {
  order: {
    coin: string;
    side: 'B' | 'A';
    limitPx: string;
    sz: string;
    oid: number;
    timestamp: number;
    origSz: string;
  };
  status: 'open' | 'filled' | 'canceled' | 'triggered' | 'rejected' | 'marginCanceled';
  statusTimestamp: number;
}

export interface WsMessage {
  channel: string;
  data: any;
}

export interface WsSubscription {
  method: 'subscribe' | 'unsubscribe';
  subscription: {
    type: string;
    user?: string;
    coin?: string;
    interval?: string;
  };
}

export interface SpotToken {
  name: string;
  index: number;
  tokenId: string;
  evmContract?: string;
  szDecimals: number;
  weiDecimals: number;
}

export interface SpotMarket {
  name: string;
  tokens: [number, number];
  index: number;
  isCanonical: boolean;
}

export interface SpotBalances {
  balances: Array<{
    coin: string;
    hold: string;
    token: string;
    total: string;
  }>;
}

export interface FundingRate {
  coin: string;
  fundingRate: string;
  premium: string;
}

export interface MarketSnapshot {
  coin: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  fundingRate?: number;
  openInterest?: number;
  timestamp: Date;
}