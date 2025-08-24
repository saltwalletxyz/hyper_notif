"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertMonitorService = void 0;
const client_1 = require("@prisma/client");
const database_service_1 = require("./database.service");
class AlertMonitorService {
    hyperliquidService;
    notificationService;
    monitoringInterval = null;
    priceCache = new Map();
    previousValues = new Map();
    socketHandler = null;
    constructor(hyperliquidService, notificationService) {
        this.hyperliquidService = hyperliquidService;
        this.notificationService = notificationService;
    }
    setSocketHandler(socketHandler) {
        this.socketHandler = socketHandler;
    }
    async startMonitoring() {
        console.log('Starting alert monitoring service...');
        // Set up WebSocket listeners
        this.setupWebSocketListeners();
        // Start periodic checks for non-real-time alerts
        this.monitoringInterval = setInterval(() => {
            this.checkAlerts();
        }, 30000); // Check every 30 seconds
        // Initial check
        await this.checkAlerts();
    }
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        console.log('Alert monitoring service stopped');
    }
    setupWebSocketListeners() {
        // Listen for price updates
        this.hyperliquidService.on('priceUpdate', (data) => {
            this.handlePriceUpdate(data);
        });
        // Listen for order updates
        this.hyperliquidService.on('orderUpdate', (data) => {
            this.handleOrderUpdate(data);
        });
        // Listen for user fills
        this.hyperliquidService.on('userFill', (data) => {
            this.handleUserFill(data);
        });
    }
    async handlePriceUpdate(data) {
        console.log('Received price update:', data);
        // Update price cache - Hyperliquid sends {"mids": {"BTC": "114856.5", "ETH": "4814.65", ...}}
        if (data && data.mids) {
            Object.entries(data.mids).forEach(([coin, price]) => {
                const numPrice = parseFloat(price);
                this.priceCache.set(coin, numPrice);
                console.log(`Updated price for ${coin}: ${numPrice}`);
            });
        }
        // Check price-related alerts
        await this.checkPriceAlerts();
    }
    async handleOrderUpdate(data) {
        if (data.status === 'filled') {
            await this.checkOrderFilledAlerts(data);
        }
    }
    async handleUserFill(data) {
        // Handle user fill events for order filled alerts
        const alerts = await database_service_1.db.alert.findMany({
            where: {
                type: client_1.AlertType.ORDER_FILLED,
                isActive: true,
                triggered: false,
            },
            include: { user: true },
        });
        for (const alert of alerts) {
            if (alert.metadata && alert.metadata.orderId === data.oid) {
                await this.triggerAlert(alert, {
                    fillPrice: data.px,
                    fillSize: data.sz,
                    side: data.side,
                });
            }
        }
    }
    async checkAlerts() {
        try {
            const activeAlerts = await database_service_1.db.alert.findMany({
                where: {
                    isActive: true,
                    triggered: false,
                },
                include: { user: true },
            });
            console.log(`Checking ${activeAlerts.length} active alerts...`);
            for (const alert of activeAlerts) {
                await this.checkAlert(alert);
            }
        }
        catch (error) {
            console.error('Error checking alerts:', error);
        }
    }
    async checkAlert(alert) {
        try {
            switch (alert.type) {
                case client_1.AlertType.PRICE_ABOVE:
                case client_1.AlertType.PRICE_BELOW:
                case client_1.AlertType.PRICE_CHANGE_PERCENT:
                    await this.checkPriceAlert(alert);
                    break;
                case client_1.AlertType.VOLUME_SPIKE:
                    await this.checkVolumeAlert(alert);
                    break;
                case client_1.AlertType.FUNDING_RATE:
                    await this.checkFundingRateAlert(alert);
                    break;
                case client_1.AlertType.LIQUIDATION_RISK:
                    await this.checkLiquidationRiskAlert(alert);
                    break;
                case client_1.AlertType.POSITION_PNL:
                    await this.checkPositionPnlAlert(alert);
                    break;
                case client_1.AlertType.BALANCE_CHANGE:
                    await this.checkBalanceChangeAlert(alert);
                    break;
            }
        }
        catch (error) {
            console.error(`Error checking alert ${alert.id}:`, error);
        }
    }
    async checkPriceAlerts() {
        const priceAlerts = await database_service_1.db.alert.findMany({
            where: {
                type: {
                    in: [client_1.AlertType.PRICE_ABOVE, client_1.AlertType.PRICE_BELOW, client_1.AlertType.PRICE_CHANGE_PERCENT],
                },
                isActive: true,
                // Only check untriggered alerts for PRICE_ABOVE/PRICE_BELOW to prevent spam
            },
            include: { user: true },
        });
        for (const alert of priceAlerts) {
            await this.checkPriceAlert(alert);
        }
    }
    async checkPriceAlert(alert) {
        let currentPrice;
        // Check cache first
        if (this.priceCache.has(alert.asset)) {
            currentPrice = this.priceCache.get(alert.asset);
        }
        else {
            // Fetch from API if not in cache
            const snapshot = await this.hyperliquidService.getMarketSnapshot(alert.asset);
            currentPrice = snapshot.price;
            this.priceCache.set(alert.asset, currentPrice);
        }
        // Update current value
        const updatedAlert = await database_service_1.db.alert.update({
            where: { id: alert.id },
            data: { currentValue: currentPrice },
        });
        // Emit real-time update via Socket.io
        if (this.socketHandler) {
            this.socketHandler.broadcastToUser(alert.userId, 'alert:update', {
                id: alert.id,
                currentValue: currentPrice,
                asset: alert.asset,
            });
        }
        const previousPrice = this.previousValues.get(`${alert.id}-price`) || currentPrice;
        let shouldTrigger = false;
        switch (alert.type) {
            case client_1.AlertType.PRICE_ABOVE:
                // Only trigger if already triggered=false AND price crosses above
                if (!alert.triggered) {
                    shouldTrigger = previousPrice <= alert.value && currentPrice > alert.value;
                }
                break;
            case client_1.AlertType.PRICE_BELOW:
                // Only trigger if already triggered=false AND price crosses below
                if (!alert.triggered) {
                    shouldTrigger = previousPrice >= alert.value && currentPrice < alert.value;
                }
                break;
            case client_1.AlertType.PRICE_CHANGE_PERCENT:
                const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
                shouldTrigger = Math.abs(changePercent) >= alert.value;
                break;
        }
        // Check for explicit crossing conditions
        if (alert.condition === client_1.AlertCondition.CROSSES_ABOVE) {
            shouldTrigger = previousPrice <= alert.value && currentPrice > alert.value;
        }
        else if (alert.condition === client_1.AlertCondition.CROSSES_BELOW) {
            shouldTrigger = previousPrice >= alert.value && currentPrice < alert.value;
        }
        if (shouldTrigger && !alert.triggered) {
            await this.triggerAlert(alert, { currentPrice, previousPrice });
        }
        // Reset alert if price moves to opposite side (so it can trigger again)
        if (alert.triggered) {
            let shouldReset = false;
            if (alert.type === client_1.AlertType.PRICE_ABOVE && currentPrice <= alert.value) {
                shouldReset = true;
            }
            else if (alert.type === client_1.AlertType.PRICE_BELOW && currentPrice >= alert.value) {
                shouldReset = true;
            }
            if (shouldReset) {
                await database_service_1.db.alert.update({
                    where: { id: alert.id },
                    data: { triggered: false },
                });
                console.log(`Reset alert ${alert.id} (${alert.name}) - price moved to opposite side`);
            }
        }
        // Update previous value
        this.previousValues.set(`${alert.id}-price`, currentPrice);
    }
    async checkVolumeAlert(alert) {
        const snapshot = await this.hyperliquidService.getMarketSnapshot(alert.asset);
        const currentVolume = snapshot.volume24h;
        await database_service_1.db.alert.update({
            where: { id: alert.id },
            data: { currentValue: currentVolume },
        });
        const previousVolume = this.previousValues.get(`${alert.id}-volume`) || currentVolume;
        const volumeSpike = (currentVolume / previousVolume - 1) * 100;
        if (volumeSpike >= alert.value) {
            await this.triggerAlert(alert, { currentVolume, previousVolume, volumeSpike });
        }
        this.previousValues.set(`${alert.id}-volume`, currentVolume);
    }
    async checkFundingRateAlert(alert) {
        const fundingRates = await this.hyperliquidService.getFundingRates();
        const assetFunding = fundingRates.find(fr => fr.coin === alert.asset);
        if (!assetFunding)
            return;
        const currentFundingRate = parseFloat(assetFunding.fundingRate) * 100; // Convert to percentage
        await database_service_1.db.alert.update({
            where: { id: alert.id },
            data: { currentValue: currentFundingRate },
        });
        if (this.checkCondition(currentFundingRate, alert.value, alert.condition)) {
            await this.triggerAlert(alert, { fundingRate: currentFundingRate });
        }
    }
    async checkLiquidationRiskAlert(alert) {
        if (!alert.user.walletAddress)
            return;
        const accountSummary = await this.hyperliquidService.getAccountSummary(alert.user.walletAddress);
        const position = accountSummary.assetPositions.find(pos => pos.coin === alert.asset);
        if (!position || !position.liquidationPx)
            return;
        const currentPrice = parseFloat(this.priceCache.get(alert.asset)?.toString() || '0');
        const liquidationPrice = parseFloat(position.liquidationPx);
        const entryPrice = parseFloat(position.entryPx);
        const riskPercentage = Math.abs(((currentPrice - liquidationPrice) / (entryPrice - liquidationPrice)) * 100);
        await database_service_1.db.alert.update({
            where: { id: alert.id },
            data: { currentValue: riskPercentage },
        });
        if (riskPercentage <= alert.value) {
            await this.triggerAlert(alert, {
                currentPrice,
                liquidationPrice,
                riskPercentage,
                position,
            });
        }
    }
    async checkPositionPnlAlert(alert) {
        if (!alert.user.walletAddress)
            return;
        const accountSummary = await this.hyperliquidService.getAccountSummary(alert.user.walletAddress);
        const position = accountSummary.assetPositions.find(pos => pos.coin === alert.asset);
        if (!position)
            return;
        const pnlPercentage = parseFloat(position.returnOnEquity) * 100;
        await database_service_1.db.alert.update({
            where: { id: alert.id },
            data: { currentValue: pnlPercentage },
        });
        if (this.checkCondition(pnlPercentage, alert.value, alert.condition)) {
            await this.triggerAlert(alert, {
                pnl: position.unrealizedPnl,
                pnlPercentage,
                position,
            });
        }
    }
    async checkBalanceChangeAlert(alert) {
        if (!alert.user.walletAddress)
            return;
        if (alert.market === client_1.MarketType.SPOT) {
            const balances = await this.hyperliquidService.getSpotBalances(alert.user.walletAddress);
            const assetBalance = balances.balances.find(b => b.coin === alert.asset);
            if (!assetBalance)
                return;
            const currentBalance = parseFloat(assetBalance.total);
            const previousBalance = this.previousValues.get(`${alert.id}-balance`) || currentBalance;
            const changePercent = ((currentBalance - previousBalance) / previousBalance) * 100;
            await database_service_1.db.alert.update({
                where: { id: alert.id },
                data: { currentValue: currentBalance },
            });
            if (Math.abs(changePercent) >= alert.value) {
                await this.triggerAlert(alert, {
                    currentBalance,
                    previousBalance,
                    changePercent,
                });
            }
            this.previousValues.set(`${alert.id}-balance`, currentBalance);
        }
    }
    async checkOrderFilledAlerts(orderUpdate) {
        const alerts = await database_service_1.db.alert.findMany({
            where: {
                type: client_1.AlertType.ORDER_FILLED,
                asset: orderUpdate.order.coin,
                isActive: true,
                triggered: false,
            },
            include: { user: true },
        });
        for (const alert of alerts) {
            await this.triggerAlert(alert, orderUpdate);
        }
    }
    checkCondition(currentValue, targetValue, condition) {
        switch (condition) {
            case client_1.AlertCondition.GREATER_THAN:
                return currentValue > targetValue;
            case client_1.AlertCondition.LESS_THAN:
                return currentValue < targetValue;
            case client_1.AlertCondition.EQUALS:
                return Math.abs(currentValue - targetValue) < 0.0001; // Small epsilon for float comparison
            default:
                return false;
        }
    }
    async triggerAlert(alert, data) {
        console.log(`Triggering alert ${alert.id} for user ${alert.userId}`);
        // Update alert status
        await database_service_1.db.alert.update({
            where: { id: alert.id },
            data: {
                triggered: true,
                lastTriggered: new Date(),
                triggerCount: { increment: 1 },
            },
        });
        // Create notification
        await this.notificationService.createNotification({
            userId: alert.userId,
            alertId: alert.id,
            type: 'ALERT_TRIGGERED',
            title: `Alert: ${alert.name}`,
            message: this.generateAlertMessage(alert, data),
            data,
            channels: {
                email: alert.notifyEmail,
                webhook: alert.notifyWebhook,
                inApp: alert.notifyInApp,
                discord: alert.notifyDiscord,
                telegram: alert.notifyTelegram,
            },
        });
        // Reset alert if it's a crossing condition
        if (alert.condition === client_1.AlertCondition.CROSSES_ABOVE ||
            alert.condition === client_1.AlertCondition.CROSSES_BELOW) {
            await database_service_1.db.alert.update({
                where: { id: alert.id },
                data: { triggered: false },
            });
        }
    }
    generateAlertMessage(alert, data) {
        switch (alert.type) {
            case client_1.AlertType.PRICE_ABOVE:
                return `${alert.asset} price is now ${data.currentPrice}, above your target of ${alert.value}`;
            case client_1.AlertType.PRICE_BELOW:
                return `${alert.asset} price is now ${data.currentPrice}, below your target of ${alert.value}`;
            case client_1.AlertType.PRICE_CHANGE_PERCENT:
                return `${alert.asset} price changed by ${data.changePercent}% in the last period`;
            case client_1.AlertType.VOLUME_SPIKE:
                return `${alert.asset} volume spiked by ${data.volumeSpike.toFixed(2)}%`;
            case client_1.AlertType.FUNDING_RATE:
                return `${alert.asset} funding rate is now ${data.fundingRate.toFixed(4)}%`;
            case client_1.AlertType.LIQUIDATION_RISK:
                return `Warning: ${alert.asset} position is ${data.riskPercentage.toFixed(2)}% away from liquidation`;
            case client_1.AlertType.ORDER_FILLED:
                return `Your ${alert.asset} order has been filled at ${data.px}`;
            case client_1.AlertType.POSITION_PNL:
                return `Your ${alert.asset} position P&L is ${data.pnlPercentage.toFixed(2)}%`;
            case client_1.AlertType.BALANCE_CHANGE:
                return `Your ${alert.asset} balance changed by ${data.changePercent.toFixed(2)}%`;
            default:
                return `Alert triggered for ${alert.asset}`;
        }
    }
}
exports.AlertMonitorService = AlertMonitorService;
