"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const database_service_1 = require("../services/database.service");
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({ error: 'Access token required' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        const user = await database_service_1.db.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                walletAddress: true,
                isActive: true,
            },
        });
        if (!user || !user.isActive) {
            res.status(401).json({ error: 'Invalid or inactive user' });
            return;
        }
        req.user = {
            id: user.id,
            email: user.email || '',
            walletAddress: user.walletAddress || undefined,
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({ error: 'Token expired' });
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
        }
        else {
            res.status(500).json({ error: 'Authentication error' });
        }
    }
};
exports.authenticateToken = authenticateToken;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            next();
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        const user = await database_service_1.db.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                walletAddress: true,
                isActive: true,
            },
        });
        if (user && user.isActive) {
            req.user = {
                id: user.id,
                email: user.email || '',
                walletAddress: user.walletAddress || undefined,
            };
        }
        next();
    }
    catch (error) {
        // Invalid token, but continue without auth
        next();
    }
};
exports.optionalAuth = optionalAuth;
