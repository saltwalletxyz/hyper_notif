import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/refresh-token', (req, res) => authController.refreshToken(req, res));

// Protected routes
router.get('/profile', authenticateToken, (req, res) => authController.getProfile(req, res));
router.put('/profile', authenticateToken, (req, res) => authController.updateProfile(req, res));
router.put('/notification-settings', authenticateToken, (req, res) => authController.updateNotificationSettings(req, res));
router.post('/change-password', authenticateToken, (req, res) => authController.changePassword(req, res));

// Wallet authentication routes
router.post('/wallet/connect', (req, res) => authController.connectWallet(req, res));
router.post('/wallet/register', (req, res) => authController.registerWithWallet(req, res));
router.post('/wallet/login', (req, res) => authController.walletLogin(req, res));
router.post('/wallet/disconnect', authenticateToken, (req, res) => authController.disconnectWallet(req, res));

export default router;