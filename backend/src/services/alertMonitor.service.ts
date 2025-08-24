import { AlertType, AlertCondition, Alert, MarketType } from '@prisma/client';
import { db } from './database.service';
import { HyperliquidService } from './hyperliquid.service';
import { NotificationService } from './notification.service';
import { MarketSnapshot } from '../types/hyperliquid';

export class AlertMonitorService {
  private hyperliquidService: HyperliquidService;
  private notificationService: NotificationService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private priceCache: Map<string, number> = new Map();
  private previousValues: Map<string, number> = new Map();
  private socketHandler: any = null;

  constructor(
    hyperliquidService: HyperliquidService,
    notificationService: NotificationService
  ) {
    this.hyperliquidService = hyperliquidService;
    this.notificationService = notificationService;
  }

  setSocketHandler(socketHandler: any): void {
    this.socketHandler = socketHandler;
  }

  async startMonitoring(): Promise<void> {
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

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('Alert monitoring service stopped');
  }

  private setupWebSocketListeners(): void {
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

  private async handlePriceUpdate(data: any): Promise<void> {
    console.log('Received price update:', data);
    
    // Update price cache - Hyperliquid sends {"mids": {"BTC": "114856.5", "ETH": "4814.65", ...}}
    if (data && data.mids) {
      Object.entries(data.mids).forEach(([coin, price]) => {
        const numPrice = parseFloat(price as string);
        this.priceCache.set(coin, numPrice);
        console.log(`Updated price for ${coin}: ${numPrice}`);
      });
    }

    // Check price-related alerts
    await this.checkPriceAlerts();
  }

  private async handleOrderUpdate(data: any): Promise<void> {
    if (data.status === 'filled') {
      await this.checkOrderFilledAlerts(data);
    }
  }

  private async handleUserFill(data: any): Promise<void> {
    // Handle user fill events for order filled alerts
    const alerts = await db.alert.findMany({
      where: {
        type: AlertType.ORDER_FILLED,
        isActive: true,
        triggered: false,
      },
      include: { user: true },
    });

    for (const alert of alerts) {
      if (alert.metadata && (alert.metadata as any).orderId === data.oid) {
        await this.triggerAlert(alert, {
          fillPrice: data.px,
          fillSize: data.sz,
          side: data.side,
        });
      }
    }
  }

  private async checkAlerts(): Promise<void> {
    try {
      const activeAlerts = await db.alert.findMany({
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
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  private async checkAlert(alert: Alert & { user: any }): Promise<void> {
    try {
      switch (alert.type) {
        case AlertType.PRICE_ABOVE:
        case AlertType.PRICE_BELOW:
        case AlertType.PRICE_CHANGE_PERCENT:
          await this.checkPriceAlert(alert);
          break;
        case AlertType.VOLUME_SPIKE:
          await this.checkVolumeAlert(alert);
          break;
        case AlertType.FUNDING_RATE:
          await this.checkFundingRateAlert(alert);
          break;
        case AlertType.LIQUIDATION_RISK:
          await this.checkLiquidationRiskAlert(alert);
          break;
        case AlertType.POSITION_PNL:
          await this.checkPositionPnlAlert(alert);
          break;
        case AlertType.BALANCE_CHANGE:
          await this.checkBalanceChangeAlert(alert);
          break;
      }
    } catch (error) {
      console.error(`Error checking alert ${alert.id}:`, error);
    }
  }

  private async checkPriceAlerts(): Promise<void> {
    const priceAlerts = await db.alert.findMany({
      where: {
        type: {
          in: [AlertType.PRICE_ABOVE, AlertType.PRICE_BELOW, AlertType.PRICE_CHANGE_PERCENT],
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

  private async checkPriceAlert(alert: Alert & { user: any }): Promise<void> {
    let currentPrice: number;

    // Check cache first
    if (this.priceCache.has(alert.asset)) {
      currentPrice = this.priceCache.get(alert.asset)!;
    } else {
      // Fetch from API if not in cache
      const snapshot = await this.hyperliquidService.getMarketSnapshot(alert.asset);
      currentPrice = snapshot.price;
      this.priceCache.set(alert.asset, currentPrice);
    }

    // Update current value
    const updatedAlert = await db.alert.update({
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
      case AlertType.PRICE_ABOVE:
        // Only trigger if already triggered=false AND price crosses above
        if (!alert.triggered) {
          shouldTrigger = previousPrice <= alert.value && currentPrice > alert.value;
        }
        break;
      case AlertType.PRICE_BELOW:
        // Only trigger if already triggered=false AND price crosses below
        if (!alert.triggered) {
          shouldTrigger = previousPrice >= alert.value && currentPrice < alert.value;
        }
        break;
      case AlertType.PRICE_CHANGE_PERCENT:
        const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
        shouldTrigger = Math.abs(changePercent) >= alert.value;
        break;
    }

    // Check for explicit crossing conditions
    if (alert.condition === AlertCondition.CROSSES_ABOVE) {
      shouldTrigger = previousPrice <= alert.value && currentPrice > alert.value;
    } else if (alert.condition === AlertCondition.CROSSES_BELOW) {
      shouldTrigger = previousPrice >= alert.value && currentPrice < alert.value;
    }

    if (shouldTrigger && !alert.triggered) {
      await this.triggerAlert(alert, { currentPrice, previousPrice });
    }

    // Reset alert if price moves to opposite side (so it can trigger again)
    if (alert.triggered) {
      let shouldReset = false;
      
      if (alert.type === AlertType.PRICE_ABOVE && currentPrice <= alert.value) {
        shouldReset = true;
      } else if (alert.type === AlertType.PRICE_BELOW && currentPrice >= alert.value) {
        shouldReset = true;
      }
      
      if (shouldReset) {
        await db.alert.update({
          where: { id: alert.id },
          data: { triggered: false },
        });
        console.log(`Reset alert ${alert.id} (${alert.name}) - price moved to opposite side`);
      }
    }

    // Update previous value
    this.previousValues.set(`${alert.id}-price`, currentPrice);
  }

  private async checkVolumeAlert(alert: Alert & { user: any }): Promise<void> {
    const snapshot = await this.hyperliquidService.getMarketSnapshot(alert.asset);
    const currentVolume = snapshot.volume24h;

    await db.alert.update({
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

  private async checkFundingRateAlert(alert: Alert & { user: any }): Promise<void> {
    const fundingRates = await this.hyperliquidService.getFundingRates();
    const assetFunding = fundingRates.find(fr => fr.coin === alert.asset);

    if (!assetFunding) return;

    const currentFundingRate = parseFloat(assetFunding.fundingRate) * 100; // Convert to percentage

    await db.alert.update({
      where: { id: alert.id },
      data: { currentValue: currentFundingRate },
    });

    if (this.checkCondition(currentFundingRate, alert.value, alert.condition)) {
      await this.triggerAlert(alert, { fundingRate: currentFundingRate });
    }
  }

  private async checkLiquidationRiskAlert(alert: Alert & { user: any }): Promise<void> {
    if (!alert.user.walletAddress) return;

    const accountSummary = await this.hyperliquidService.getAccountSummary(
      alert.user.walletAddress
    );

    const position = accountSummary.assetPositions.find(
      pos => pos.coin === alert.asset
    );

    if (!position || !position.liquidationPx) return;

    const currentPrice = parseFloat(this.priceCache.get(alert.asset)?.toString() || '0');
    const liquidationPrice = parseFloat(position.liquidationPx);
    const entryPrice = parseFloat(position.entryPx);

    const riskPercentage = Math.abs(
      ((currentPrice - liquidationPrice) / (entryPrice - liquidationPrice)) * 100
    );

    await db.alert.update({
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

  private async checkPositionPnlAlert(alert: Alert & { user: any }): Promise<void> {
    if (!alert.user.walletAddress) return;

    const accountSummary = await this.hyperliquidService.getAccountSummary(
      alert.user.walletAddress
    );

    const position = accountSummary.assetPositions.find(
      pos => pos.coin === alert.asset
    );

    if (!position) return;

    const pnlPercentage = parseFloat(position.returnOnEquity) * 100;

    await db.alert.update({
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

  private async checkBalanceChangeAlert(alert: Alert & { user: any }): Promise<void> {
    if (!alert.user.walletAddress) return;

    if (alert.market === MarketType.SPOT) {
      const balances = await this.hyperliquidService.getSpotBalances(
        alert.user.walletAddress
      );
      const assetBalance = balances.balances.find(b => b.coin === alert.asset);

      if (!assetBalance) return;

      const currentBalance = parseFloat(assetBalance.total);
      const previousBalance = this.previousValues.get(`${alert.id}-balance`) || currentBalance;
      const changePercent = ((currentBalance - previousBalance) / previousBalance) * 100;

      await db.alert.update({
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

  private async checkOrderFilledAlerts(orderUpdate: any): Promise<void> {
    const alerts = await db.alert.findMany({
      where: {
        type: AlertType.ORDER_FILLED,
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

  private checkCondition(
    currentValue: number,
    targetValue: number,
    condition: AlertCondition
  ): boolean {
    switch (condition) {
      case AlertCondition.GREATER_THAN:
        return currentValue > targetValue;
      case AlertCondition.LESS_THAN:
        return currentValue < targetValue;
      case AlertCondition.EQUALS:
        return Math.abs(currentValue - targetValue) < 0.0001; // Small epsilon for float comparison
      default:
        return false;
    }
  }

  private async triggerAlert(alert: Alert & { user: any }, data: any): Promise<void> {
    console.log(`Triggering alert ${alert.id} for user ${alert.userId}`);

    // Update alert status
    await db.alert.update({
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
    if (
      alert.condition === AlertCondition.CROSSES_ABOVE ||
      alert.condition === AlertCondition.CROSSES_BELOW
    ) {
      await db.alert.update({
        where: { id: alert.id },
        data: { triggered: false },
      });
    }
  }

  private generateAlertMessage(alert: Alert, data: any): string {
    switch (alert.type) {
      case AlertType.PRICE_ABOVE:
        return `${alert.asset} price is now ${data.currentPrice}, above your target of ${alert.value}`;
      case AlertType.PRICE_BELOW:
        return `${alert.asset} price is now ${data.currentPrice}, below your target of ${alert.value}`;
      case AlertType.PRICE_CHANGE_PERCENT:
        return `${alert.asset} price changed by ${data.changePercent}% in the last period`;
      case AlertType.VOLUME_SPIKE:
        return `${alert.asset} volume spiked by ${data.volumeSpike.toFixed(2)}%`;
      case AlertType.FUNDING_RATE:
        return `${alert.asset} funding rate is now ${data.fundingRate.toFixed(4)}%`;
      case AlertType.LIQUIDATION_RISK:
        return `Warning: ${alert.asset} position is ${data.riskPercentage.toFixed(2)}% away from liquidation`;
      case AlertType.ORDER_FILLED:
        return `Your ${alert.asset} order has been filled at ${data.px}`;
      case AlertType.POSITION_PNL:
        return `Your ${alert.asset} position P&L is ${data.pnlPercentage.toFixed(2)}%`;
      case AlertType.BALANCE_CHANGE:
        return `Your ${alert.asset} balance changed by ${data.changePercent.toFixed(2)}%`;
      default:
        return `Alert triggered for ${alert.asset}`;
    }
  }
}