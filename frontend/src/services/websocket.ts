import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:5001';

export type WebSocketEvent = 
  | 'notification'
  | 'notification:count'
  | 'alerts:count'
  | 'alert:update'
  | 'price:update'
  | 'order:update'
  | 'fill:new'
  | 'position:update'
  | 'funding:update';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(WS_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }
      
      this.attemptReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      
      if (error.message === 'Authentication required' || error.message === 'Authentication failed') {
        // Clear invalid token and redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        this.attemptReconnect();
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.socket?.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  on(event: WebSocketEvent | string, callback: (data: any) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: WebSocketEvent | string, callback?: (data: any) => void): void {
    this.socket?.off(event, callback);
  }

  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }

  // Subscription methods
  subscribeToPrices(coins: string[]): void {
    this.emit('subscribe:prices', coins);
  }

  subscribeToOrders(): void {
    this.emit('subscribe:orders');
  }

  subscribeToPositions(): void {
    this.emit('subscribe:positions');
  }

  unsubscribeFromPrices(): void {
    this.emit('unsubscribe:prices');
  }

  unsubscribeFromOrders(): void {
    this.emit('unsubscribe:orders');
  }

  unsubscribeFromPositions(): void {
    this.emit('unsubscribe:positions');
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const websocketService = new WebSocketService();