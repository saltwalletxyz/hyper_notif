"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_service_1 = require("../services/database.service");
const config_1 = require("../config");
class AuthController {
    async register(req, res) {
        try {
            const { email, password, name, walletAddress } = req.body;
            // Validate input
            if (!email || !password) {
                res.status(400).json({ error: 'Email and password are required' });
                return;
            }
            // Check if user already exists
            const existingUser = await database_service_1.db.user.findFirst({
                where: {
                    OR: [
                        { email },
                        ...(walletAddress ? [{ walletAddress }] : []),
                    ],
                },
            });
            if (existingUser) {
                res.status(409).json({ error: 'User already exists' });
                return;
            }
            // Hash password
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            // Create user
            const user = await database_service_1.db.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    walletAddress,
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    walletAddress: true,
                    createdAt: true,
                },
            });
            // Generate token
            const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
            res.status(201).json({
                user,
                token,
            });
        }
        catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }
    async login(req, res) {
        try {
            const { email, password } = req.body;
            // Validate input
            if (!email || !password) {
                res.status(400).json({ error: 'Email and password are required' });
                return;
            }
            // Find user
            const user = await database_service_1.db.user.findUnique({
                where: { email },
            });
            if (!user) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }
            // Check password
            const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
            if (!isValidPassword) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }
            // Check if user is active
            if (!user.isActive) {
                res.status(401).json({ error: 'Account is inactive' });
                return;
            }
            // Generate token
            const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    walletAddress: user.walletAddress,
                },
                token,
            });
        }
        catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }
    async refreshToken(req, res) {
        try {
            const { token } = req.body;
            if (!token) {
                res.status(400).json({ error: 'Token is required' });
                return;
            }
            // Verify old token (even if expired)
            const decoded = jsonwebtoken_1.default.decode(token);
            if (!decoded || !decoded.userId) {
                res.status(401).json({ error: 'Invalid token' });
                return;
            }
            // Check if user still exists and is active
            const user = await database_service_1.db.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    email: true,
                    isActive: true,
                },
            });
            if (!user || !user.isActive) {
                res.status(401).json({ error: 'User not found or inactive' });
                return;
            }
            // Generate new token
            const newToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
            res.json({ token: newToken });
        }
        catch (error) {
            console.error('Token refresh error:', error);
            res.status(500).json({ error: 'Token refresh failed' });
        }
    }
    async changePassword(req, res) {
        try {
            const userId = req.user?.id;
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) {
                res.status(400).json({ error: 'Current and new passwords are required' });
                return;
            }
            // Get user
            const user = await database_service_1.db.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            // Verify current password
            const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password);
            if (!isValidPassword) {
                res.status(401).json({ error: 'Current password is incorrect' });
                return;
            }
            // Hash new password
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
            // Update password
            await database_service_1.db.user.update({
                where: { id: userId },
                data: { password: hashedPassword },
            });
            res.json({ message: 'Password changed successfully' });
        }
        catch (error) {
            console.error('Password change error:', error);
            res.status(500).json({ error: 'Password change failed' });
        }
    }
    async getProfile(req, res) {
        try {
            const userId = req.user?.id;
            const user = await database_service_1.db.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    walletAddress: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            alerts: true,
                            notifications: true,
                        },
                    },
                },
            });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            res.json(user);
        }
        catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ error: 'Failed to get profile' });
        }
    }
    async updateProfile(req, res) {
        try {
            const userId = req.user?.id;
            const { name, walletAddress } = req.body;
            // Check if wallet address is already taken
            if (walletAddress) {
                const existingUser = await database_service_1.db.user.findFirst({
                    where: {
                        walletAddress,
                        NOT: { id: userId },
                    },
                });
                if (existingUser) {
                    res.status(409).json({ error: 'Wallet address already in use' });
                    return;
                }
            }
            const updatedUser = await database_service_1.db.user.update({
                where: { id: userId },
                data: {
                    name,
                    walletAddress,
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    walletAddress: true,
                    updatedAt: true,
                },
            });
            res.json(updatedUser);
        }
        catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ error: 'Failed to update profile' });
        }
    }
}
exports.AuthController = AuthController;
