import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import {
  HyperliquidConfig,
  AssetContext,
  UserFill,
  OpenOrder,
  AccountSummary,
  OrderUpdate,
  WsMessage,
  WsSubscription,
  SpotBalances,
  FundingRate,
  MarketSnapshot,
} from '../types/hyperliquid';

export class HyperliquidService extends EventEmitter {
  private axiosClient: AxiosInstance;
  private wsClient: WebSocket | null = null;
  private config: HyperliquidConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private pingInterval: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, WsSubscription> = new Map();

  constructor(config: HyperliquidConfig) {
    super();
    this.config = config;
    this.axiosClient = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // HTTP API Methods
  async getAssetContexts(): Promise<AssetContext[]> {
    const response = await this.axiosClient.post('/info', {
      type: 'metaAndAssetCtxs',
    });
    // Response is array [universe, contexts]
    const universe = response.data[0].universe;
    const contexts = response.data[1];
    
    // Map contexts with coin names from universe
    return contexts.map((ctx: any, index: number) => ({
      coin: universe[index]?.name || `Unknown-${index}`,
      markPx: ctx.markPx,
      midPx: ctx.midPx,
      prevDayPx: ctx.prevDayPx,
      dayNtlVlm: ctx.dayNtlVlm,
      funding: ctx.funding,
      openInterest: ctx.openInterest,
      oraclePx: ctx.oraclePx,
      impactPxs: ctx.impactPxs,
      dayBaseVlm: ctx.dayBaseVlm,
      premium: ctx.premium,
    }));
  }

  async getUserFills(user: string, limit = 100): Promise<UserFill[]> {
    const response = await this.axiosClient.post('/info', {
      type: 'userFills',
      user,
      aggregateByTime: false,
      limit,
    });
    return response.data.result;
  }

  async getOpenOrders(user: string): Promise<OpenOrder[]> {
    const response = await this.axiosClient.post('/info', {
      type: 'openOrders',
      user,
    });
    return response.data.result;
  }

  async getAccountSummary(user: string): Promise<AccountSummary> {
    const response = await this.axiosClient.post('/info', {
      type: 'clearinghouseState',
      user,
    });
    return response.data.result;
  }

  async getOrderStatus(user: string, oid: number): Promise<OrderUpdate> {
    const response = await this.axiosClient.post('/info', {
      type: 'orderStatus',
      user,
      oid,
    });
    return response.data.result;
  }

  async getSpotBalances(user: string): Promise<SpotBalances> {
    const response = await this.axiosClient.post('/info', {
      type: 'spotClearinghouseState',
      user,
    });
    return response.data.result;
  }

  async getFundingRates(): Promise<FundingRate[]> {
    const response = await this.axiosClient.post('/info', {
      type: 'metaAndAssetCtxs',
    });
    const contexts: AssetContext[] = response.data.result[1];
    return contexts.map(ctx => ({
      coin: ctx.coin,
      fundingRate: ctx.funding,
      premium: '0', // Not provided in basic context
    }));
  }

  async getMarketSnapshot(coin: string): Promise<MarketSnapshot> {
    const contexts = await this.getAssetContexts();
    const context = contexts.find(ctx => ctx.coin === coin);
    
    if (!context) {
      throw new Error(`Market data not found for ${coin}`);
    }

    const price = parseFloat(context.midPx);
    const prevPrice = parseFloat(context.prevDayPx);
    const priceChange24h = price - prevPrice;
    const priceChangePercent24h = (priceChange24h / prevPrice) * 100;

    return {
      coin: context.coin,
      price,
      volume24h: parseFloat(context.dayNtlVlm),
      priceChange24h,
      priceChangePercent24h,
      high24h: price, // Not available in basic context
      low24h: price, // Not available in basic context
      fundingRate: parseFloat(context.funding),
      openInterest: parseFloat(context.openInterest),
      timestamp: new Date(),
    };
  }

  // WebSocket Methods
  connectWebSocket(): void {
    if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
      return;
    }

    this.wsClient = new WebSocket(this.config.wsUrl);

    this.wsClient.on('open', () => {
      console.log('WebSocket connected to Hyperliquid');
      this.reconnectAttempts = 0;
      this.setupPing();
      this.resubscribeAll();
      this.emit('connected');
    });

    this.wsClient.on('message', (data: Buffer) => {
      try {
        const message: WsMessage = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    this.wsClient.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    this.wsClient.on('close', () => {
      console.log('WebSocket disconnected');
      this.cleanup();
      this.emit('disconnected');
      this.attemptReconnect();
    });
  }

  private setupPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
        this.wsClient.ping();
      }
    }, 30000);
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connectWebSocket();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private resubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      this.send(subscription);
    });
  }

  private send(data: any): void {
    if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
      this.wsClient.send(JSON.stringify(data));
    }
  }

  private handleMessage(message: WsMessage): void {
    if (message.channel === 'pong') {
      return;
    }

    this.emit('message', message);

    // Emit specific events based on channel
    switch (message.channel) {
      case 'allMids':
        this.emit('priceUpdate', message.data);
        break;
      case 'notification':
        this.emit('notification', message.data);
        break;
      case 'orderUpdates':
        this.emit('orderUpdate', message.data);
        break;
      case 'userFills':
        this.emit('userFill', message.data);
        break;
      case 'userFundings':
        this.emit('userFunding', message.data);
        break;
      case 'l2Book':
        this.emit('orderBook', message.data);
        break;
      case 'trades':
        this.emit('trade', message.data);
        break;
    }
  }

  // Subscription methods
  subscribeToPrices(): void {
    const subscription: WsSubscription = {
      method: 'subscribe',
      subscription: {
        type: 'allMids',
      },
    };
    this.subscriptions.set('allMids', subscription);
    this.send(subscription);
  }

  subscribeToUserUpdates(user: string): void {
    const subscriptions = [
      { type: 'notification', user },
      { type: 'orderUpdates', user },
      { type: 'userFills', user },
      { type: 'userFundings', user },
    ];

    subscriptions.forEach(sub => {
      const subscription: WsSubscription = {
        method: 'subscribe',
        subscription: sub,
      };
      this.subscriptions.set(`${sub.type}-${user}`, subscription);
      this.send(subscription);
    });
  }

  subscribeToOrderBook(coin: string): void {
    const subscription: WsSubscription = {
      method: 'subscribe',
      subscription: {
        type: 'l2Book',
        coin,
      },
    };
    this.subscriptions.set(`l2Book-${coin}`, subscription);
    this.send(subscription);
  }

  subscribeToTrades(coin: string): void {
    const subscription: WsSubscription = {
      method: 'subscribe',
      subscription: {
        type: 'trades',
        coin,
      },
    };
    this.subscriptions.set(`trades-${coin}`, subscription);
    this.send(subscription);
  }

  unsubscribe(type: string, identifier?: string): void {
    const key = identifier ? `${type}-${identifier}` : type;
    const subscription = this.subscriptions.get(key);
    
    if (subscription) {
      const unsubscribe = {
        ...subscription,
        method: 'unsubscribe' as const,
      };
      this.send(unsubscribe);
      this.subscriptions.delete(key);
    }
  }

  disconnect(): void {
    this.cleanup();
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
    }
    this.subscriptions.clear();
  }

  isWebSocketConnected(): boolean {
    return this.wsClient !== null && this.wsClient.readyState === 1; // 1 = OPEN
  }
}