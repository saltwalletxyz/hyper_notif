import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { config } from '../config';

export class DiscordService {
  private client: Client;
  private isReady = false;

  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.DirectMessages],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.once('ready', () => {
      console.log(`Discord bot logged in as ${this.client.user?.tag}`);
      this.isReady = true;
    });

    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
    });
  }

  async initialize(): Promise<void> {
    if (!config.discord?.botToken) {
      console.warn('Discord bot token not configured');
      return;
    }

    try {
      await this.client.login(config.discord.botToken);
    } catch (error) {
      console.error('Failed to initialize Discord bot:', error);
    }
  }

  async sendNotification(
    userId: string,
    title: string,
    message: string,
    data?: any
  ): Promise<boolean> {
    if (!this.isReady) {
      console.error('Discord bot not ready');
      return false;
    }

    try {
      const user = await this.client.users.fetch(userId);
      if (!user) {
        console.error(`Discord user ${userId} not found`);
        return false;
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(message)
        .setColor('#667eea')
        .setTimestamp()
        .setFooter({ text: 'Hyperliquid Notify' });

      // Add alert data as fields if available
      if (data) {
        if (data.asset) embed.addFields({ name: 'Asset', value: data.asset, inline: true });
        if (data.currentPrice) embed.addFields({ name: 'Current Price', value: `$${data.currentPrice}`, inline: true });
        if (data.targetPrice) embed.addFields({ name: 'Target Price', value: `$${data.targetPrice}`, inline: true });
        if (data.condition) embed.addFields({ name: 'Condition', value: data.condition, inline: true });
      }

      await user.send({ embeds: [embed] });
      console.log(`Discord notification sent to ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error sending Discord notification to ${userId}:`, error);
      return false;
    }
  }

  async testConnection(userId: string): Promise<boolean> {
    try {
      const user = await this.client.users.fetch(userId);
      return !!user;
    } catch (error) {
      return false;
    }
  }

  isConnected(): boolean {
    return this.isReady;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
    }
  }
}