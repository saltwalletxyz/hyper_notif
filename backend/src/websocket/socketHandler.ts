import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { NotificationService } from '../services/notification.service';
import { HyperliquidService } from '../services/hyperliquid.service';
import { db } from '../services/database.service';

export class SocketHandler {
  private io: Server;
  private notificationService: NotificationService;
  private hyperliquidService: HyperliquidService;

  constructor(
    io: Server, 
    notificationService: NotificationService,
    hyperliquidService: HyperliquidService
  ) {
    this.io = io;
    this.notificationService = notificationService;
    this.hyperliquidService = hyperliquidService;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, config.jwt.secret) as any;
        
        const user = await db.user.findUnique({
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

        (socket as any).userId = user.id;
        (socket as any).user = user;
        
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      const userId = (socket as any).userId;
      const user = (socket as any).user;
      
      console.log(`User ${userId} connected via WebSocket`);
      
      // Add socket connection to notification service
      this.notificationService.addSocketConnection(userId, socket);
      
      // Join user-specific room
      socket.join(`user:${userId}`);
      
      // Send initial data
      this.sendInitialData(socket, userId);
      
      // Handle real-time subscriptions
      socket.on('subscribe:prices', (coins: string[]) => {
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

  private async sendInitialData(socket: any, userId: string): Promise<void> {
    try {
      // Send unread notification count
      const unreadCount = await this.notificationService.getUnreadCount(userId);
      socket.emit('notification:count', { unread: unreadCount });
      
      // Send active alerts count
      const activeAlerts = await db.alert.count({
        where: {
          userId,
          isActive: true,
        },
      });
      socket.emit('alerts:count', { active: activeAlerts });
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  private handlePriceSubscription(socket: any, coins: string[]): void {
    socket.join('prices');
    socket.emit('subscribed:prices', { coins });
    
    // If not already subscribed to all prices, subscribe
    if (!this.hyperliquidService.listenerCount('priceUpdate')) {
      this.hyperliquidService.subscribeToPrices();
    }
  }

  private handleOrderSubscription(socket: any, walletAddress: string): void {
    socket.join(`orders:${walletAddress}`);
    socket.emit('subscribed:orders');
    
    // Subscribe to user updates if not already
    this.hyperliquidService.subscribeToUserUpdates(walletAddress);
  }

  private handlePositionSubscription(socket: any, walletAddress: string): void {
    socket.join(`positions:${walletAddress}`);
    socket.emit('subscribed:positions');
    
    // Subscribe to user updates if not already
    this.hyperliquidService.subscribeToUserUpdates(walletAddress);
  }

  private setupHyperliquidEventForwarding(): void {
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

  public broadcastToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }
}