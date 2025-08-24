"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const client_1 = require("@prisma/client");
const nodemailer_1 = __importDefault(require("nodemailer"));
const axios_1 = __importDefault(require("axios"));
const database_service_1 = require("./database.service");
const config_1 = require("../config");
const crypto_1 = __importDefault(require("crypto"));
const discord_service_1 = require("./discord.service");
const telegram_service_1 = require("./telegram.service");
class NotificationService {
    transporter;
    socketConnections = new Map();
    discordService;
    telegramService;
    constructor() {
        // Initialize email transporter
        this.transporter = nodemailer_1.default.createTransport({
            host: config_1.config.email.host,
            port: config_1.config.email.port,
            secure: config_1.config.email.port === 465,
            auth: {
                user: config_1.config.email.user,
                pass: config_1.config.email.pass,
            },
        });
        // Initialize Discord and Telegram services
        this.discordService = new discord_service_1.DiscordService();
        this.telegramService = new telegram_service_1.TelegramService();
        // Initialize bot connections
        this.initializeBots();
    }
    async initializeBots() {
        try {
            await this.discordService.initialize();
        }
        catch (error) {
            console.error('Failed to initialize Discord service:', error);
        }
    }
    async createNotification(options) {
        const { userId, alertId, type, title, message, data, channels } = options;
        // Create in-app notification
        if (channels.inApp) {
            const notification = await database_service_1.db.notification.create({
                data: {
                    userId,
                    alertId,
                    type,
                    title,
                    message,
                    data,
                    channel: client_1.NotificationChannel.IN_APP,
                    status: client_1.NotificationStatus.DELIVERED,
                },
            });
            // Emit to connected socket if available
            this.emitToUser(userId, 'notification', notification);
        }
        // Send email notification
        if (channels.email) {
            await this.sendEmailNotification(userId, title, message, data);
        }
        // Send webhook notification
        if (channels.webhook) {
            await this.sendWebhookNotification(userId, { type, title, message, data });
        }
        // Send Discord notification
        if (channels.discord) {
            await this.sendDiscordNotification(userId, title, message, data);
        }
        // Send Telegram notification
        if (channels.telegram) {
            await this.sendTelegramNotification(userId, title, message, data);
        }
    }
    async sendEmailNotification(userId, subject, message, data) {
        try {
            const user = await database_service_1.db.user.findUnique({ where: { id: userId } });
            if (!user)
                return;
            const notification = await database_service_1.db.notification.create({
                data: {
                    userId,
                    type: client_1.NotificationType.ALERT_TRIGGERED,
                    title: subject,
                    message,
                    data,
                    channel: client_1.NotificationChannel.EMAIL,
                    status: client_1.NotificationStatus.PENDING,
                },
            });
            const htmlContent = this.generateEmailTemplate(subject, message, data);
            await this.transporter.sendMail({
                from: `"Hyperliquid Notify" <${config_1.config.email.user}>`,
                to: user.email || '',
                subject,
                text: message,
                html: htmlContent,
            });
            await database_service_1.db.notification.update({
                where: { id: notification.id },
                data: { status: client_1.NotificationStatus.DELIVERED },
            });
            console.log(`Email notification sent to ${user.email}`);
        }
        catch (error) {
            console.error('Error sending email notification:', error);
            await database_service_1.db.notification.updateMany({
                where: {
                    userId,
                    channel: client_1.NotificationChannel.EMAIL,
                    status: client_1.NotificationStatus.PENDING,
                },
                data: {
                    status: client_1.NotificationStatus.FAILED,
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            });
        }
    }
    async sendWebhookNotification(userId, payload) {
        try {
            const webhooks = await database_service_1.db.webhook.findMany({
                where: {
                    userId,
                    isActive: true,
                },
            });
            for (const webhook of webhooks) {
                const notification = await database_service_1.db.notification.create({
                    data: {
                        userId,
                        type: payload.type,
                        title: payload.title,
                        message: payload.message,
                        data: payload.data,
                        channel: client_1.NotificationChannel.WEBHOOK,
                        status: client_1.NotificationStatus.PENDING,
                    },
                });
                try {
                    const timestamp = Date.now();
                    const signature = this.generateWebhookSignature(webhook.secret || '', payload, timestamp);
                    await axios_1.default.post(webhook.url, payload, {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Webhook-Signature': signature,
                            'X-Webhook-Timestamp': timestamp.toString(),
                        },
                        timeout: 10000,
                    });
                    await database_service_1.db.notification.update({
                        where: { id: notification.id },
                        data: { status: client_1.NotificationStatus.DELIVERED },
                    });
                    await database_service_1.db.webhook.update({
                        where: { id: webhook.id },
                        data: {
                            lastUsed: new Date(),
                            failureCount: 0,
                        },
                    });
                    console.log(`Webhook notification sent to ${webhook.url}`);
                }
                catch (error) {
                    console.error(`Error sending webhook to ${webhook.url}:`, error);
                    await database_service_1.db.notification.update({
                        where: { id: notification.id },
                        data: {
                            status: client_1.NotificationStatus.FAILED,
                            error: error instanceof Error ? error.message : 'Unknown error',
                        },
                    });
                    await database_service_1.db.webhook.update({
                        where: { id: webhook.id },
                        data: {
                            failureCount: { increment: 1 },
                        },
                    });
                    // Disable webhook after too many failures
                    if (webhook.failureCount >= 5) {
                        await database_service_1.db.webhook.update({
                            where: { id: webhook.id },
                            data: { isActive: false },
                        });
                    }
                }
            }
        }
        catch (error) {
            console.error('Error processing webhook notifications:', error);
        }
    }
    generateWebhookSignature(secret, payload, timestamp) {
        const message = `${timestamp}.${JSON.stringify(payload)}`;
        return crypto_1.default.createHmac('sha256', secret).update(message).digest('hex');
    }
    generateEmailTemplate(subject, message, data) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f5f5f5;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px 20px;
            }
            .alert-box {
              background-color: #f8f9fa;
              border-left: 4px solid #667eea;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .data-table th,
            .data-table td {
              padding: 10px;
              text-align: left;
              border-bottom: 1px solid #e0e0e0;
            }
            .data-table th {
              background-color: #f8f9fa;
              font-weight: 600;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Hyperliquid Notify</h1>
            </div>
            <div class="content">
              <h2>${subject}</h2>
              <div class="alert-box">
                <p>${message}</p>
              </div>
              ${data ? this.generateDataTable(data) : ''}
              <div style="text-align: center;">
                <a href="${config_1.config.frontend.url}/alerts" class="button">View in Dashboard</a>
              </div>
            </div>
            <div class="footer">
              <p>You received this email because you have active alerts on Hyperliquid Notify.</p>
              <p>To manage your notification preferences, visit your dashboard.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    }
    generateDataTable(data) {
        if (!data || typeof data !== 'object')
            return '';
        const rows = Object.entries(data)
            .filter(([key]) => key !== 'position') // Filter out complex objects
            .map(([key, value]) => {
            const formattedKey = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase());
            let formattedValue = value;
            if (typeof value === 'number') {
                formattedValue = value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                });
            }
            return `
          <tr>
            <th>${formattedKey}</th>
            <td>${formattedValue}</td>
          </tr>
        `;
        })
            .join('');
        return `
      <table class="data-table">
        ${rows}
      </table>
    `;
    }
    // Socket.io connection management
    addSocketConnection(userId, socket) {
        this.socketConnections.set(userId, socket);
    }
    removeSocketConnection(userId) {
        this.socketConnections.delete(userId);
    }
    emitToUser(userId, event, data) {
        const socket = this.socketConnections.get(userId);
        if (socket) {
            socket.emit(event, data);
        }
    }
    async getUnreadCount(userId) {
        return database_service_1.db.notification.count({
            where: {
                userId,
                isRead: false,
            },
        });
    }
    async markAsRead(notificationId, userId) {
        await database_service_1.db.notification.updateMany({
            where: {
                id: notificationId,
                userId,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }
    async markAllAsRead(userId) {
        await database_service_1.db.notification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }
    async sendDiscordNotification(userId, title, message, data) {
        try {
            const user = await database_service_1.db.user.findUnique({
                where: { id: userId },
                select: { discordUserId: true, email: true }
            });
            if (!user?.discordUserId) {
                console.log(`Discord notification skipped: User ${userId} has no Discord ID configured`);
                return;
            }
            const notification = await database_service_1.db.notification.create({
                data: {
                    userId,
                    type: client_1.NotificationType.ALERT_TRIGGERED,
                    title,
                    message,
                    data,
                    channel: client_1.NotificationChannel.DISCORD,
                    status: client_1.NotificationStatus.PENDING,
                },
            });
            await this.discordService.sendNotification(user.discordUserId, title, message, data);
            await database_service_1.db.notification.update({
                where: { id: notification.id },
                data: { status: client_1.NotificationStatus.DELIVERED },
            });
            console.log(`Discord notification sent to user ${user.discordUserId}`);
        }
        catch (error) {
            console.error('Error sending Discord notification:', error);
            await database_service_1.db.notification.updateMany({
                where: {
                    userId,
                    channel: client_1.NotificationChannel.DISCORD,
                    status: client_1.NotificationStatus.PENDING,
                },
                data: {
                    status: client_1.NotificationStatus.FAILED,
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            });
        }
    }
    async sendTelegramNotification(userId, title, message, data) {
        try {
            const user = await database_service_1.db.user.findUnique({
                where: { id: userId },
                select: { telegramChatId: true, email: true }
            });
            if (!user?.telegramChatId) {
                console.log(`Telegram notification skipped: User ${userId} has no Telegram chat ID configured`);
                return;
            }
            const notification = await database_service_1.db.notification.create({
                data: {
                    userId,
                    type: client_1.NotificationType.ALERT_TRIGGERED,
                    title,
                    message,
                    data,
                    channel: client_1.NotificationChannel.TELEGRAM,
                    status: client_1.NotificationStatus.PENDING,
                },
            });
            await this.telegramService.sendNotification(user.telegramChatId, title, message, data);
            await database_service_1.db.notification.update({
                where: { id: notification.id },
                data: { status: client_1.NotificationStatus.DELIVERED },
            });
            console.log(`Telegram notification sent to chat ${user.telegramChatId}`);
        }
        catch (error) {
            console.error('Error sending Telegram notification:', error);
            await database_service_1.db.notification.updateMany({
                where: {
                    userId,
                    channel: client_1.NotificationChannel.TELEGRAM,
                    status: client_1.NotificationStatus.PENDING,
                },
                data: {
                    status: client_1.NotificationStatus.FAILED,
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            });
        }
    }
}
exports.NotificationService = NotificationService;
