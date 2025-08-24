import { Response } from 'express';
import { db } from '../services/database.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotificationService } from '../services/notification.service';

export class NotificationsController {
  constructor(private notificationService: NotificationService) {}

  async getNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { 
        page = '1', 
        limit = '20', 
        isRead,
        channel,
        type,
      } = req.query;

      const where: any = { userId };

      if (isRead !== undefined) {
        where.isRead = isRead === 'true';
      }

      if (channel) {
        where.channel = channel;
      }

      if (type) {
        where.type = type;
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const [notifications, total] = await Promise.all([
        db.notification.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            alert: {
              select: {
                id: true,
                name: true,
                type: true,
                asset: true,
              },
            },
          },
        }),
        db.notification.count({ where }),
      ]);

      const unreadCount = await this.notificationService.getUnreadCount(userId);

      res.json({
        notifications,
        unreadCount,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  }

  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await this.notificationService.markAsRead(id, userId);

      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      await this.notificationService.markAllAsRead(userId);

      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  }

  async deleteNotification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const notification = await db.notification.findFirst({
        where: { id, userId },
      });

      if (!notification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      await db.notification.delete({
        where: { id },
      });

      res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }

  async deleteAllNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { isRead } = req.query;

      const where: any = { userId };

      if (isRead !== undefined) {
        where.isRead = isRead === 'true';
      }

      const result = await db.notification.deleteMany({ where });

      res.json({ 
        message: 'Notifications deleted successfully',
        count: result.count,
      });
    } catch (error) {
      console.error('Delete all notifications error:', error);
      res.status(500).json({ error: 'Failed to delete notifications' });
    }
  }

  async getNotificationStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const [
        total,
        unread,
        byChannel,
        byType,
      ] = await Promise.all([
        db.notification.count({ where: { userId } }),
        db.notification.count({ where: { userId, isRead: false } }),
        db.notification.groupBy({
          by: ['channel'],
          where: { userId },
          _count: true,
        }),
        db.notification.groupBy({
          by: ['type'],
          where: { userId },
          _count: true,
        }),
      ]);

      res.json({
        total,
        unread,
        byChannel: byChannel.reduce((acc, item) => {
          acc[item.channel] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {} as Record<string, number>),
      });
    } catch (error) {
      console.error('Get notification stats error:', error);
      res.status(500).json({ error: 'Failed to get notification statistics' });
    }
  }
}