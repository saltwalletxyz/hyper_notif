import { Request, Response } from 'express';
import { HyperliquidService } from '../services/hyperliquid.service';
import { config } from '../config';
import { db } from '../services/database.service';

const hyperliquidService = new HyperliquidService(config.hyperliquid);

export class HyperliquidController {
  async getUserData(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Get user wallet address
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true, hyperliquidLastSync: true },
      });

      if (!user || !user.walletAddress) {
        res.status(400).json({ error: 'No wallet address associated with account' });
        return;
      }

      // Sync user data from Hyperliquid
      const hyperliquidData = await hyperliquidService.syncUserData(user.walletAddress);

      // Update user's cached account value and sync timestamp
      await db.user.update({
        where: { id: userId },
        data: {
          hyperliquidAccountValue: hyperliquidData.accountValue,
          hyperliquidLastSync: new Date(),
        },
      });

      res.json({
        walletAddress: user.walletAddress,
        lastSync: new Date().toISOString(),
        ...hyperliquidData,
      });
    } catch (error) {
      console.error('Get user data error:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  }

  async getUserPositions(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true },
      });

      if (!user || !user.walletAddress) {
        res.status(400).json({ error: 'No wallet address associated with account' });
        return;
      }

      const positions = await hyperliquidService.getUserPositions(user.walletAddress);
      res.json({ positions });
    } catch (error) {
      console.error('Get user positions error:', error);
      res.status(500).json({ error: 'Failed to fetch positions' });
    }
  }

  async getUserOrders(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true },
      });

      if (!user || !user.walletAddress) {
        res.status(400).json({ error: 'No wallet address associated with account' });
        return;
      }

      const orders = await hyperliquidService.getUserOrders(user.walletAddress);
      res.json({ orders });
    } catch (error) {
      console.error('Get user orders error:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  async getUserFillHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const limit = parseInt(req.query.limit as string) || 50;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true },
      });

      if (!user || !user.walletAddress) {
        res.status(400).json({ error: 'No wallet address associated with account' });
        return;
      }

      const fillHistory = await hyperliquidService.getUserFillHistory(user.walletAddress, limit);
      res.json({ fillHistory });
    } catch (error) {
      console.error('Get user fill history error:', error);
      res.status(500).json({ error: 'Failed to fetch fill history' });
    }
  }

  async getAccountValue(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { 
          walletAddress: true, 
          hyperliquidAccountValue: true,
          hyperliquidLastSync: true,
        },
      });

      if (!user || !user.walletAddress) {
        res.status(400).json({ error: 'No wallet address associated with account' });
        return;
      }

      // Use cached value if recent (within 5 minutes), otherwise fetch fresh
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      let accountValue = user.hyperliquidAccountValue;

      if (!user.hyperliquidLastSync || user.hyperliquidLastSync < fiveMinutesAgo) {
        accountValue = await hyperliquidService.getUserAccountValue(user.walletAddress);
        
        // Update cached value
        await db.user.update({
          where: { id: userId },
          data: {
            hyperliquidAccountValue: accountValue,
            hyperliquidLastSync: new Date(),
          },
        });
      }

      res.json({ 
        accountValue,
        lastSync: user.hyperliquidLastSync,
        walletAddress: user.walletAddress,
      });
    } catch (error) {
      console.error('Get account value error:', error);
      res.status(500).json({ error: 'Failed to fetch account value' });
    }
  }

  async subscribeToUserUpdates(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true },
      });

      if (!user || !user.walletAddress) {
        res.status(400).json({ error: 'No wallet address associated with account' });
        return;
      }

      // Subscribe to user-specific WebSocket updates
      hyperliquidService.subscribeToUserUpdates(user.walletAddress);

      res.json({ 
        message: 'Subscribed to real-time updates',
        walletAddress: user.walletAddress,
      });
    } catch (error) {
      console.error('Subscribe to user updates error:', error);
      res.status(500).json({ error: 'Failed to subscribe to updates' });
    }
  }
}