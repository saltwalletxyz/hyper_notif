import { NotificationType, NotificationChannel, NotificationStatus } from '@prisma/client';
import nodemailer from 'nodemailer';
import axios from 'axios';
import { db } from './database.service';
import { config } from '../config';
import crypto from 'crypto';

interface NotificationOptions {
  userId: string;
  alertId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  channels: {
    email?: boolean;
    webhook?: boolean;
    inApp?: boolean;
  };
}

export class NotificationService {
  private transporter: nodemailer.Transporter;
  private socketConnections: Map<string, any> = new Map();

  constructor() {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

  async createNotification(options: NotificationOptions): Promise<void> {
    const { userId, alertId, type, title, message, data, channels } = options;

    // Create in-app notification
    if (channels.inApp) {
      const notification = await db.notification.create({
        data: {
          userId,
          alertId,
          type,
          title,
          message,
          data,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.DELIVERED,
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
  }

  private async sendEmailNotification(
    userId: string,
    subject: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) return;

      const notification = await db.notification.create({
        data: {
          userId,
          type: NotificationType.ALERT_TRIGGERED,
          title: subject,
          message,
          data,
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.PENDING,
        },
      });

      const htmlContent = this.generateEmailTemplate(subject, message, data);

      await this.transporter.sendMail({
        from: `"Hyperliquid Notify" <${config.email.user}>`,
        to: user.email,
        subject,
        text: message,
        html: htmlContent,
      });

      await db.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.DELIVERED },
      });

      console.log(`Email notification sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending email notification:', error);
      
      await db.notification.updateMany({
        where: {
          userId,
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.PENDING,
        },
        data: {
          status: NotificationStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  private async sendWebhookNotification(userId: string, payload: any): Promise<void> {
    try {
      const webhooks = await db.webhook.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      for (const webhook of webhooks) {
        const notification = await db.notification.create({
          data: {
            userId,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            data: payload.data,
            channel: NotificationChannel.WEBHOOK,
            status: NotificationStatus.PENDING,
          },
        });

        try {
          const timestamp = Date.now();
          const signature = this.generateWebhookSignature(webhook.secret || '', payload, timestamp);

          await axios.post(webhook.url, payload, {
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Webhook-Timestamp': timestamp.toString(),
            },
            timeout: 10000,
          });

          await db.notification.update({
            where: { id: notification.id },
            data: { status: NotificationStatus.DELIVERED },
          });

          await db.webhook.update({
            where: { id: webhook.id },
            data: {
              lastUsed: new Date(),
              failureCount: 0,
            },
          });

          console.log(`Webhook notification sent to ${webhook.url}`);
        } catch (error) {
          console.error(`Error sending webhook to ${webhook.url}:`, error);

          await db.notification.update({
            where: { id: notification.id },
            data: {
              status: NotificationStatus.FAILED,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });

          await db.webhook.update({
            where: { id: webhook.id },
            data: {
              failureCount: { increment: 1 },
            },
          });

          // Disable webhook after too many failures
          if (webhook.failureCount >= 5) {
            await db.webhook.update({
              where: { id: webhook.id },
              data: { isActive: false },
            });
          }
        }
      }
    } catch (error) {
      console.error('Error processing webhook notifications:', error);
    }
  }

  private generateWebhookSignature(secret: string, payload: any, timestamp: number): string {
    const message = `${timestamp}.${JSON.stringify(payload)}`;
    return crypto.createHmac('sha256', secret).update(message).digest('hex');
  }

  private generateEmailTemplate(subject: string, message: string, data?: any): string {
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
                <a href="${config.frontend.url}/alerts" class="button">View in Dashboard</a>
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

  private generateDataTable(data: any): string {
    if (!data || typeof data !== 'object') return '';

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
  addSocketConnection(userId: string, socket: any): void {
    this.socketConnections.set(userId, socket);
  }

  removeSocketConnection(userId: string): void {
    this.socketConnections.delete(userId);
  }

  emitToUser(userId: string, event: string, data: any): void {
    const socket = this.socketConnections.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    return db.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await db.notification.updateMany({
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

  async markAllAsRead(userId: string): Promise<void> {
    await db.notification.updateMany({
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
}