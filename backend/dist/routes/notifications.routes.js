"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notifications_controller_1 = require("../controllers/notifications.controller");
const notification_service_1 = require("../services/notification.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const notificationService = new notification_service_1.NotificationService();
const notificationsController = new notifications_controller_1.NotificationsController(notificationService);
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
router.get('/', (req, res) => notificationsController.getNotifications(req, res));
router.get('/stats', (req, res) => notificationsController.getNotificationStats(req, res));
router.post('/mark-all-read', (req, res) => notificationsController.markAllAsRead(req, res));
router.delete('/all', (req, res) => notificationsController.deleteAllNotifications(req, res));
router.post('/:id/read', (req, res) => notificationsController.markAsRead(req, res));
router.delete('/:id', (req, res) => notificationsController.deleteNotification(req, res));
exports.default = router;
