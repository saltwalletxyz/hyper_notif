"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const authController = new auth_controller_1.AuthController();
// Public routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/refresh-token', (req, res) => authController.refreshToken(req, res));
// Protected routes
router.get('/profile', auth_middleware_1.authenticateToken, (req, res) => authController.getProfile(req, res));
router.put('/profile', auth_middleware_1.authenticateToken, (req, res) => authController.updateProfile(req, res));
router.put('/notification-settings', auth_middleware_1.authenticateToken, (req, res) => authController.updateNotificationSettings(req, res));
router.post('/change-password', auth_middleware_1.authenticateToken, (req, res) => authController.changePassword(req, res));
// Wallet authentication routes
router.post('/wallet/connect', (req, res) => authController.connectWallet(req, res));
router.post('/wallet/register', (req, res) => authController.registerWithWallet(req, res));
router.post('/wallet/login', (req, res) => authController.walletLogin(req, res));
router.post('/wallet/disconnect', auth_middleware_1.authenticateToken, (req, res) => authController.disconnectWallet(req, res));
exports.default = router;
