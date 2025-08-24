import { Request, Response } from 'express';
import { AlertType, AlertCondition, MarketType } from '@prisma/client';
import { db } from '../services/database.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class AlertsController {
  async createAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const {
        name,
        type,
        asset,
        market = MarketType.PERPETUAL,
        condition,
        value,
        notifyEmail = true,
        notifyWebhook = false,
        notifyInApp = true,
        notifyDiscord = false,
        notifyTelegram = false,
        metadata,
      } = req.body;

      // Validate input
      if (!name || !type || !asset || !condition || value === undefined) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Validate alert type
      if (!Object.values(AlertType).includes(type)) {
        res.status(400).json({ error: 'Invalid alert type' });
        return;
      }

      // Validate condition
      if (!Object.values(AlertCondition).includes(condition)) {
        res.status(400).json({ error: 'Invalid alert condition' });
        return;
      }

      // Create alert
      const alert = await db.alert.create({
        data: {
          userId,
          name,
          type,
          asset,
          market,
          condition,
          value: parseFloat(value),
          notifyEmail,
          notifyWebhook,
          notifyInApp,
          notifyDiscord,
          notifyTelegram,
          metadata,
        },
      });

      res.status(201).json(alert);
    } catch (error) {
      console.error('Create alert error:', error);
      res.status(500).json({ error: 'Failed to create alert' });
    }
  }

  async getAlerts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { 
        page = '1', 
        limit = '20', 
        isActive, 
        triggered,
        type,
        asset,
      } = req.query;

      const where: any = { userId };

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      if (triggered !== undefined) {
        where.triggered = triggered === 'true';
      }

      if (type) {
        where.type = type as AlertType;
      }

      if (asset) {
        where.asset = asset as string;
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const [alerts, total] = await Promise.all([
        db.alert.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        db.alert.count({ where }),
      ]);

      res.json({
        alerts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Get alerts error:', error);
      res.status(500).json({ error: 'Failed to get alerts' });
    }
  }

  async getAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const alert = await db.alert.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          notifications: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!alert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      res.json(alert);
    } catch (error) {
      console.error('Get alert error:', error);
      res.status(500).json({ error: 'Failed to get alert' });
    }
  }

  async updateAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const {
        name,
        value,
        isActive,
        notifyEmail,
        notifyWebhook,
        notifyInApp,
        notifyDiscord,
        notifyTelegram,
        metadata,
      } = req.body;

      // Check if alert exists and belongs to user
      const existingAlert = await db.alert.findFirst({
        where: { id, userId },
      });

      if (!existingAlert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      // Prepare update data
      const updateData: any = {};

      if (name !== undefined) updateData.name = name;
      if (value !== undefined) updateData.value = parseFloat(value);
      if (isActive !== undefined) updateData.isActive = isActive;
      if (notifyEmail !== undefined) updateData.notifyEmail = notifyEmail;
      if (notifyWebhook !== undefined) updateData.notifyWebhook = notifyWebhook;
      if (notifyInApp !== undefined) updateData.notifyInApp = notifyInApp;
      if (notifyDiscord !== undefined) updateData.notifyDiscord = notifyDiscord;
      if (notifyTelegram !== undefined) updateData.notifyTelegram = notifyTelegram;
      if (metadata !== undefined) updateData.metadata = metadata;

      // Reset triggered status if alert is being reactivated
      if (isActive === true && existingAlert.triggered) {
        updateData.triggered = false;
      }

      const updatedAlert = await db.alert.update({
        where: { id },
        data: updateData,
      });

      res.json(updatedAlert);
    } catch (error) {
      console.error('Update alert error:', error);
      res.status(500).json({ error: 'Failed to update alert' });
    }
  }

  async deleteAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      // Check if alert exists and belongs to user
      const alert = await db.alert.findFirst({
        where: { id, userId },
      });

      if (!alert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      await db.alert.delete({
        where: { id },
      });

      res.json({ message: 'Alert deleted successfully' });
    } catch (error) {
      console.error('Delete alert error:', error);
      res.status(500).json({ error: 'Failed to delete alert' });
    }
  }

  async getAlertStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const [
        totalAlerts,
        activeAlerts,
        triggeredAlerts,
        alertsByType,
      ] = await Promise.all([
        db.alert.count({ where: { userId } }),
        db.alert.count({ where: { userId, isActive: true } }),
        db.alert.count({ where: { userId, triggered: true } }),
        db.alert.groupBy({
          by: ['type'],
          where: { userId },
          _count: true,
        }),
      ]);

      res.json({
        totalAlerts,
        activeAlerts,
        triggeredAlerts,
        alertsByType: alertsByType.reduce((acc, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {} as Record<string, number>),
      });
    } catch (error) {
      console.error('Get alert stats error:', error);
      res.status(500).json({ error: 'Failed to get alert statistics' });
    }
  }

  async resetAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      // Check if alert exists and belongs to user
      const alert = await db.alert.findFirst({
        where: { id, userId },
      });

      if (!alert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      const updatedAlert = await db.alert.update({
        where: { id },
        data: {
          triggered: false,
          isActive: true,
        },
      });

      res.json(updatedAlert);
    } catch (error) {
      console.error('Reset alert error:', error);
      res.status(500).json({ error: 'Failed to reset alert' });
    }
  }
}