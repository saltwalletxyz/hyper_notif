import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';

export class TelegramService {
  private bot: TelegramBot | null = null;
  private isReady = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!config.telegram?.botToken) {
      console.warn('Telegram bot token not configured');
      return;
    }

    try {
      this.bot = new TelegramBot(config.telegram.botToken, { polling: true });
      
      // Set up command handlers
      this.setupCommands();
      
      // Test the bot connection
      const botInfo = await this.bot.getMe();
      console.log(`Telegram bot initialized: @${botInfo.username}`);
      this.isReady = true;
    } catch (error) {
      console.error('Failed to initialize Telegram bot:', error);
    }
  }

  private setupCommands(): void {
    if (!this.bot) return;

    // Handle /start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id.toString();
      await this.sendSetupInstructions(chatId);
    });

    // Handle /help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id.toString();
      const helpMessage = `🤖 *Hyperliquid Notify Bot Commands*

/start - Get your Chat ID and setup instructions
/help - Show this help message
/test - Test notification delivery

Your Chat ID: \`${chatId}\`

Copy your Chat ID and add it to your notification settings in the Hyperliquid Notify app to receive alerts!`;

      await this.bot!.sendMessage(chatId, helpMessage, {
        parse_mode: 'Markdown',
      });
    });

    // Handle /test command
    this.bot.onText(/\/test/, async (msg) => {
      const chatId = msg.chat.id.toString();
      await this.testConnection(chatId);
    });
  }

  async sendNotification(
    chatId: string,
    title: string,
    message: string,
    data?: any
  ): Promise<boolean> {
    if (!this.bot || !this.isReady) {
      console.error('Telegram bot not ready');
      return false;
    }

    try {
      let formattedMessage = `🚨 *${title}*\n\n${message}`;

      // Add alert data if available
      if (data) {
        formattedMessage += '\n\n';
        if (data.asset) formattedMessage += `📊 *Asset:* ${data.asset}\n`;
        if (data.currentPrice) formattedMessage += `💰 *Current Price:* $${data.currentPrice}\n`;
        if (data.targetPrice) formattedMessage += `🎯 *Target Price:* $${data.targetPrice}\n`;
        if (data.condition) formattedMessage += `⚖️ *Condition:* ${data.condition}\n`;
      }

      formattedMessage += '\n_Sent by Hyperliquid Notify_';

      await this.bot.sendMessage(chatId, formattedMessage, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      });

      console.log(`Telegram notification sent to ${chatId}`);
      return true;
    } catch (error) {
      console.error(`Error sending Telegram notification to ${chatId}:`, error);
      return false;
    }
  }

  async testConnection(chatId: string): Promise<boolean> {
    if (!this.bot || !this.isReady) return false;

    try {
      await this.bot.sendMessage(chatId, '✅ Connection test successful!');
      return true;
    } catch (error) {
      console.error(`Telegram connection test failed for ${chatId}:`, error);
      return false;
    }
  }

  async sendSetupInstructions(chatId: string): Promise<boolean> {
    if (!this.bot || !this.isReady) return false;

    try {
      const message = `🤖 *Welcome to Hyperliquid Notify!*

To receive notifications:
1. Your Chat ID is: \`${chatId}\`
2. Copy this ID and paste it in your Hyperliquid Notify settings
3. Enable Telegram notifications for your alerts

You'll now receive real-time notifications for price alerts, position changes, and market updates!`;

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
      });

      return true;
    } catch (error) {
      console.error(`Error sending setup instructions to ${chatId}:`, error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.isReady;
  }

  getBotUsername(): string | null {
    return this.bot?.getMe().then(me => me.username).catch(() => null) || null;
  }
}