import { Router } from 'express';
import { HyperliquidController } from '../controllers/hyperliquid.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const hyperliquidController = new HyperliquidController();

// All routes require authentication
router.use(authenticateToken);

// User data routes
router.get('/user/data', (req, res) => hyperliquidController.getUserData(req, res));
router.get('/user/positions', (req, res) => hyperliquidController.getUserPositions(req, res));
router.get('/user/orders', (req, res) => hyperliquidController.getUserOrders(req, res));
router.get('/user/fills', (req, res) => hyperliquidController.getUserFillHistory(req, res));
router.get('/user/account-value', (req, res) => hyperliquidController.getAccountValue(req, res));
router.post('/user/subscribe', (req, res) => hyperliquidController.subscribeToUserUpdates(req, res));

export default router;