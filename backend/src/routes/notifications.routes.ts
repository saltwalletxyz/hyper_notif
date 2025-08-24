import { Router } from 'express';
import { NotificationsController } from '../controllers/notifications.controller';
import { NotificationService } from '../services/notification.service';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const notificationService = new NotificationService();
const notificationsController = new NotificationsController(notificationService);

// All routes require authentication
router.use(authenticateToken);

router.get('/', (req, res) => notificationsController.getNotifications(req, res));
router.get('/stats', (req, res) => notificationsController.getNotificationStats(req, res));
router.post('/mark-all-read', (req, res) => notificationsController.markAllAsRead(req, res));
router.delete('/all', (req, res) => notificationsController.deleteAllNotifications(req, res));
router.post('/:id/read', (req, res) => notificationsController.markAsRead(req, res));
router.delete('/:id', (req, res) => notificationsController.deleteNotification(req, res));

export default router;