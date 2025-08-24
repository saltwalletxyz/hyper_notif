"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./config");
const database_service_1 = require("./services/database.service");
const hyperliquid_service_1 = require("./services/hyperliquid.service");
const notification_service_1 = require("./services/notification.service");
const alertMonitor_service_1 = require("./services/alertMonitor.service");
const socketHandler_1 = require("./websocket/socketHandler");
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const alerts_routes_1 = __importDefault(require("./routes/alerts.routes"));
const notifications_routes_1 = __importDefault(require("./routes/notifications.routes"));
const market_routes_1 = __importDefault(require("./routes/market.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: config_1.config.cors.origin,
        credentials: config_1.config.cors.credentials,
    },
});
// Services
const hyperliquidService = new hyperliquid_service_1.HyperliquidService(config_1.config.hyperliquid);
const notificationService = new notification_service_1.NotificationService();
const alertMonitorService = new alertMonitor_service_1.AlertMonitorService(hyperliquidService, notificationService);
const socketHandler = new socketHandler_1.SocketHandler(io, notificationService, hyperliquidService);
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)(config_1.config.cors));
app.use((0, compression_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check
app.get('/health', async (req, res) => {
    try {
        const dbHealthy = await database_service_1.databaseService.healthCheck();
        const status = dbHealthy ? 'healthy' : 'unhealthy';
        const httpStatus = dbHealthy ? 200 : 503;
        res.status(httpStatus).json({
            status,
            timestamp: new Date().toISOString(),
            services: {
                database: dbHealthy ? 'healthy' : 'unhealthy',
                websocket: hyperliquidService.listenerCount('connected') > 0 ? 'connected' : 'disconnected',
            },
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: 'Health check failed',
        });
    }
});
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/alerts', alerts_routes_1.default);
app.use('/api/notifications', notifications_routes_1.default);
app.use('/api/market', market_routes_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation error',
            details: err.errors,
        });
    }
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'Unauthorized',
        });
    }
    res.status(500).json({
        error: 'Internal server error',
        message: config_1.config.nodeEnv === 'development' ? err.message : undefined,
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('Shutting down gracefully...');
    // Stop accepting new connections
    httpServer.close(() => {
        console.log('HTTP server closed');
    });
    // Stop monitoring
    alertMonitorService.stopMonitoring();
    // Disconnect WebSocket
    hyperliquidService.disconnect();
    // Close database connection
    await database_service_1.databaseService.disconnect();
    process.exit(0);
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
// Start server
const startServer = async () => {
    try {
        // Connect to database
        await database_service_1.databaseService.connect();
        console.log('Database connected');
        // Connect to Hyperliquid WebSocket
        hyperliquidService.connectWebSocket();
        // Start alert monitoring
        await alertMonitorService.startMonitoring();
        // Start HTTP server
        httpServer.listen(config_1.config.port, () => {
            console.log(`Server running on port ${config_1.config.port}`);
            console.log(`Environment: ${config_1.config.nodeEnv}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
