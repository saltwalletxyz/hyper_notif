"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyperliquidService = void 0;
const axios_1 = __importDefault(require("axios"));
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
class HyperliquidService extends events_1.EventEmitter {
    axiosClient;
    wsClient = null;
    config;
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    reconnectDelay = 5000;
    pingInterval = null;
    subscriptions = new Map();
    constructor(config) {
        super();
        this.config = config;
        this.axiosClient = axios_1.default.create({
            baseURL: config.apiUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
    // HTTP API Methods
    async getAssetContexts() {
        const response = await this.axiosClient.post('/info', {
            type: 'metaAndAssetCtxs',
        });
        // Response is array [universe, contexts]
        const universe = response.data[0].universe;
        const contexts = response.data[1];
        // Map contexts with coin names from universe
        return contexts.map((ctx, index) => ({
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
    async getUserFills(user, limit = 100) {
        const response = await this.axiosClient.post('/info', {
            type: 'userFills',
            user,
            aggregateByTime: false,
            limit,
        });
        return response.data.result;
    }
    async getOpenOrders(user) {
        const response = await this.axiosClient.post('/info', {
            type: 'openOrders',
            user,
        });
        return response.data.result;
    }
    async getAccountSummary(user) {
        const [perpsResponse, spotResponse] = await Promise.all([
            this.axiosClient.post('/info', {
                type: 'clearinghouseState',
                user,
            }),
            this.axiosClient.post('/info', {
                type: 'spotClearinghouseState',
                user,
            }),
        ]);
        const perpsData = perpsResponse.data;
        const spotData = spotResponse.data;
        // Calculate total account value including spot balances
        const perpsValue = parseFloat(perpsData.marginSummary?.accountValue || '0');
        const perpsWithdrawable = parseFloat(perpsData.withdrawable || '0');
        const spotValue = spotData.balances?.reduce((total, balance) => {
            return total + parseFloat(balance.total || '0') * (balance.coin === 'USDC' ? 1 : 0);
        }, 0) || 0;
        // For spot, withdrawable should be the USDC balance + any non-USDC tokens converted
        const spotWithdrawable = spotData.balances?.reduce((total, balance) => {
            const totalBalance = parseFloat(balance.total || '0');
            const holdBalance = parseFloat(balance.hold || '0');
            const available = totalBalance - holdBalance;
            if (balance.coin === 'USDC') {
                return total + available;
            }
            else {
                // For other tokens, use entryNtl value (USD equivalent)
                return total + parseFloat(balance.entryNtl || '0');
            }
        }, 0) || 0;
        // Combine the data
        return {
            ...perpsData,
            marginSummary: {
                ...perpsData.marginSummary,
                accountValue: (perpsValue + spotValue).toString(),
            },
            withdrawable: (perpsWithdrawable + spotWithdrawable).toString(),
            spotBalances: spotData.balances || [],
        };
    }
    async getOrderStatus(user, oid) {
        const response = await this.axiosClient.post('/info', {
            type: 'orderStatus',
            user,
            oid,
        });
        return response.data.result;
    }
    async getSpotBalances(user) {
        const response = await this.axiosClient.post('/info', {
            type: 'spotClearinghouseState',
            user,
        });
        return response.data;
    }
    async getFundingRates() {
        const response = await this.axiosClient.post('/info', {
            type: 'metaAndAssetCtxs',
        });
        const contexts = response.data.result[1];
        return contexts.map(ctx => ({
            coin: ctx.coin,
            fundingRate: ctx.funding,
            premium: '0', // Not provided in basic context
        }));
    }
    async getMarketSnapshot(coin) {
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
    connectWebSocket() {
        if (this.wsClient && this.wsClient.readyState === ws_1.default.OPEN) {
            return;
        }
        this.wsClient = new ws_1.default(this.config.wsUrl);
        this.wsClient.on('open', () => {
            console.log('WebSocket connected to Hyperliquid');
            this.reconnectAttempts = 0;
            this.setupPing();
            this.resubscribeAll();
            this.emit('connected');
        });
        this.wsClient.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(message);
            }
            catch (error) {
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
    setupPing() {
        this.pingInterval = setInterval(() => {
            if (this.wsClient && this.wsClient.readyState === ws_1.default.OPEN) {
                this.wsClient.ping();
            }
        }, 30000);
    }
    cleanup() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    attemptReconnect() {
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
    resubscribeAll() {
        this.subscriptions.forEach((subscription) => {
            this.send(subscription);
        });
    }
    send(data) {
        if (this.wsClient && this.wsClient.readyState === ws_1.default.OPEN) {
            this.wsClient.send(JSON.stringify(data));
        }
    }
    handleMessage(message) {
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
    subscribeToPrices() {
        const subscription = {
            method: 'subscribe',
            subscription: {
                type: 'allMids',
            },
        };
        this.subscriptions.set('allMids', subscription);
        this.send(subscription);
    }
    subscribeToUserUpdates(user) {
        const subscriptions = [
            { type: 'notification', user },
            { type: 'orderUpdates', user },
            { type: 'userFills', user },
            { type: 'userFundings', user },
        ];
        subscriptions.forEach(sub => {
            const subscription = {
                method: 'subscribe',
                subscription: sub,
            };
            this.subscriptions.set(`${sub.type}-${user}`, subscription);
            this.send(subscription);
        });
    }
    subscribeToOrderBook(coin) {
        const subscription = {
            method: 'subscribe',
            subscription: {
                type: 'l2Book',
                coin,
            },
        };
        this.subscriptions.set(`l2Book-${coin}`, subscription);
        this.send(subscription);
    }
    subscribeToTrades(coin) {
        const subscription = {
            method: 'subscribe',
            subscription: {
                type: 'trades',
                coin,
            },
        };
        this.subscriptions.set(`trades-${coin}`, subscription);
        this.send(subscription);
    }
    unsubscribe(type, identifier) {
        const key = identifier ? `${type}-${identifier}` : type;
        const subscription = this.subscriptions.get(key);
        if (subscription) {
            const unsubscribe = {
                ...subscription,
                method: 'unsubscribe',
            };
            this.send(unsubscribe);
            this.subscriptions.delete(key);
        }
    }
    disconnect() {
        this.cleanup();
        if (this.wsClient) {
            this.wsClient.close();
            this.wsClient = null;
        }
        this.subscriptions.clear();
    }
    isWebSocketConnected() {
        return this.wsClient !== null && this.wsClient.readyState === 1; // 1 = OPEN
    }
    // User-specific data fetching methods for wallet integration
    async getUserPositions(walletAddress) {
        try {
            const accountSummary = await this.getAccountSummary(walletAddress);
            return accountSummary.assetPositions || [];
        }
        catch (error) {
            console.error(`Error fetching positions for ${walletAddress}:`, error);
            return [];
        }
    }
    async getUserOrders(walletAddress) {
        try {
            return await this.getOpenOrders(walletAddress);
        }
        catch (error) {
            console.error(`Error fetching orders for ${walletAddress}:`, error);
            return [];
        }
    }
    async getUserFillHistory(walletAddress, limit = 50) {
        try {
            return await this.getUserFills(walletAddress, limit);
        }
        catch (error) {
            console.error(`Error fetching fill history for ${walletAddress}:`, error);
            return [];
        }
    }
    async getUserAccountValue(walletAddress) {
        try {
            const accountSummary = await this.getAccountSummary(walletAddress);
            return parseFloat(accountSummary.marginSummary?.accountValue || '0');
        }
        catch (error) {
            console.error(`Error fetching account value for ${walletAddress}:`, error);
            return 0;
        }
    }
    async getUserFundingHistory(walletAddress) {
        try {
            const response = await this.axiosClient.post('/info', {
                type: 'userFunding',
                user: walletAddress,
            });
            return response.data.result || [];
        }
        catch (error) {
            console.error(`Error fetching funding history for ${walletAddress}:`, error);
            return [];
        }
    }
    async syncUserData(walletAddress) {
        const [positions, orders, fillHistory, accountValue, fundingHistory] = await Promise.all([
            this.getUserPositions(walletAddress),
            this.getUserOrders(walletAddress),
            this.getUserFillHistory(walletAddress),
            this.getUserAccountValue(walletAddress),
            this.getUserFundingHistory(walletAddress),
        ]);
        return {
            positions,
            orders,
            fillHistory,
            accountValue,
            fundingHistory,
        };
    }
}
exports.HyperliquidService = HyperliquidService;
