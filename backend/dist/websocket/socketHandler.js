"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketHandler = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const database_service_1 = require("../services/database.service");
class SocketHandler {
    io;
    notificationService;
    hyperliquidService;
    constructor(io, notificationService, hyperliquidService) {
        this.io = io;
        this.notificationService = notificationService;
        this.hyperliquidService = hyperliquidService;
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    setupMiddleware() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Authentication required'));
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
                    return next(new Error('Invalid or inactive user'));
                }
                socket.userId = user.id;
                socket.user = user;
                next();
            }
            catch (error) {
                next(new Error('Authentication failed'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            const userId = socket.userId;
            const user = socket.user;
            console.log(`User ${userId} connected via WebSocket`);
            // Add socket connection to notification service
            this.notificationService.addSocketConnection(userId, socket);
            // Join user-specific room
            socket.join(`user:${userId}`);
            // Send initial data
            this.sendInitialData(socket, userId);
            // Handle real-time subscriptions
            socket.on('subscribe:prices', (coins) => {
                this.handlePriceSubscription(socket, coins);
            });
            socket.on('subscribe:orders', () => {
                if (user.walletAddress) {
                    this.handleOrderSubscription(socket, user.walletAddress);
                }
            });
            socket.on('subscribe:positions', () => {
                if (user.walletAddress) {
                    this.handlePositionSubscription(socket, user.walletAddress);
                }
            });
            socket.on('unsubscribe:prices', () => {
                socket.leave('prices');
            });
            socket.on('unsubscribe:orders', () => {
                socket.leave(`orders:${user.walletAddress}`);
            });
            socket.on('unsubscribe:positions', () => {
                socket.leave(`positions:${user.walletAddress}`);
            });
            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`User ${userId} disconnected`);
                this.notificationService.removeSocketConnection(userId);
            });
        });
        // Forward Hyperliquid events to appropriate rooms
        this.setupHyperliquidEventForwarding();
    }
    async sendInitialData(socket, userId) {
        try {
            // Send unread notification count
            const unreadCount = await this.notificationService.getUnreadCount(userId);
            socket.emit('notification:count', { unread: unreadCount });
            // Send active alerts count
            const activeAlerts = await database_service_1.db.alert.count({
                where: {
                    userId,
                    isActive: true,
                },
            });
            socket.emit('alerts:count', { active: activeAlerts });
        }
        catch (error) {
            console.error('Error sending initial data:', error);
        }
    }
    handlePriceSubscription(socket, coins) {
        socket.join('prices');
        socket.emit('subscribed:prices', { coins });
        // If not already subscribed to all prices, subscribe
        if (!this.hyperliquidService.listenerCount('priceUpdate')) {
            this.hyperliquidService.subscribeToPrices();
        }
    }
    handleOrderSubscription(socket, walletAddress) {
        socket.join(`orders:${walletAddress}`);
        socket.emit('subscribed:orders');
        // Subscribe to user updates if not already
        this.hyperliquidService.subscribeToUserUpdates(walletAddress);
    }
    handlePositionSubscription(socket, walletAddress) {
        socket.join(`positions:${walletAddress}`);
        socket.emit('subscribed:positions');
        // Subscribe to user updates if not already
        this.hyperliquidService.subscribeToUserUpdates(walletAddress);
    }
    setupHyperliquidEventForwarding() {
        // Forward price updates
        this.hyperliquidService.on('priceUpdate', (data) => {
            this.io.to('prices').emit('price:update', data);
        });
        // Forward order updates
        this.hyperliquidService.on('orderUpdate', (data) => {
            // Extract wallet address from the order data
            const walletAddress = data.user;
            if (walletAddress) {
                this.io.to(`orders:${walletAddress}`).emit('order:update', data);
            }
        });
        // Forward user fills
        this.hyperliquidService.on('userFill', (data) => {
            const walletAddress = data.user;
            if (walletAddress) {
                this.io.to(`orders:${walletAddress}`).emit('fill:new', data);
                this.io.to(`positions:${walletAddress}`).emit('position:update', data);
            }
        });
        // Forward funding updates
        this.hyperliquidService.on('userFunding', (data) => {
            const walletAddress = data.user;
            if (walletAddress) {
                this.io.to(`positions:${walletAddress}`).emit('funding:update', data);
            }
        });
    }
    broadcastToUser(userId, event, data) {
        this.io.to(`user:${userId}`).emit(event, data);
    }
    broadcastToAll(event, data) {
        this.io.emit(event, data);
    }
}
exports.SocketHandler = SocketHandler;
