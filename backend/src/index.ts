import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

import { config } from './config';
import { databaseService } from './services/database.service';
import { HyperliquidService } from './services/hyperliquid.service';
import { NotificationService } from './services/notification.service';
import { AlertMonitorService } from './services/alertMonitor.service';
import { SocketHandler } from './websocket/socketHandler';

// Routes
import authRoutes from './routes/auth.routes';
import alertsRoutes from './routes/alerts.routes';
import notificationsRoutes from './routes/notifications.routes';
import marketRoutes from './routes/market.routes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  },
});

// Services
const hyperliquidService = new HyperliquidService(config.hyperliquid);
const notificationService = new NotificationService();
const alertMonitorService = new AlertMonitorService(hyperliquidService, notificationService);
const socketHandler = new SocketHandler(io, notificationService, hyperliquidService);

// Middleware
app.use(helmet());
app.use(cors(config.cors));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await databaseService.healthCheck();
    const status = dbHealthy ? 'healthy' : 'unhealthy';
    const httpStatus = dbHealthy ? 200 : 503;
    
    res.status(httpStatus).json({
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        websocket: hyperliquidService.isWebSocketConnected() ? 'connected' : 'disconnected',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/market', marketRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
    message: config.nodeEnv === 'development' ? err.message : undefined,
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
  await databaseService.disconnect();
  
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await databaseService.connect();
    console.log('Database connected');
    
    // Connect to Hyperliquid WebSocket
    hyperliquidService.connectWebSocket();
    
    // Start alert monitoring
    await alertMonitorService.startMonitoring();
    
    // Start HTTP server
    httpServer.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();