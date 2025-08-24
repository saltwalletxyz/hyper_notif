import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  User,
  AuthResponse,
  Alert,
  CreateAlertRequest,
  UpdateAlertRequest,
  Notification,
  MarketData,
  AccountSummary,
  ApiError,
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        
        return Promise.reject({
          message: error.response?.data?.error || error.message,
          status: error.response?.status,
          details: error.response?.data?.details,
        });
      }
    );
  }

  // Auth endpoints
  register = async (email: string, password: string, name?: string, walletAddress?: string): Promise<AuthResponse> => {
    const response = await this.client.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
      walletAddress,
    });
    return response.data;
  }

  login = async (email: string, password: string): Promise<AuthResponse> => {
    const response = await this.client.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  getProfile = async (): Promise<User> => {
    const response = await this.client.get<User>('/auth/profile');
    return response.data;
  }

  updateProfile = async (data: { name?: string; walletAddress?: string }): Promise<User> => {
    const response = await this.client.put<User>('/auth/profile', data);
    return response.data;
  }

  updateNotificationSettings = async (data: { discordUserId?: string; telegramChatId?: string }): Promise<User> => {
    const response = await this.client.put<User>('/auth/notification-settings', data);
    return response.data;
  }

  changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    await this.client.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  // Alert endpoints
  createAlert = async (data: CreateAlertRequest): Promise<Alert> => {
    const response = await this.client.post<Alert>('/alerts', data);
    return response.data;
  }

  getAlerts = async (params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    triggered?: boolean;
    type?: string;
    asset?: string;
  }): Promise<{
    alerts: Alert[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> => {
    const response = await this.client.get('/alerts', { params });
    return response.data;
  }

  getAlert = async (id: string): Promise<Alert> => {
    const response = await this.client.get<Alert>(`/alerts/${id}`);
    return response.data;
  }

  updateAlert = async (id: string, data: UpdateAlertRequest): Promise<Alert> => {
    const response = await this.client.put<Alert>(`/alerts/${id}`, data);
    return response.data;
  }

  deleteAlert = async (id: string): Promise<void> => {
    await this.client.delete(`/alerts/${id}`);
  }

  resetAlert = async (id: string): Promise<Alert> => {
    const response = await this.client.post<Alert>(`/alerts/${id}/reset`);
    return response.data;
  }

  getAlertStats = async (): Promise<{
    totalAlerts: number;
    activeAlerts: number;
    triggeredAlerts: number;
    alertsByType: Record<string, number>;
  }> => {
    const response = await this.client.get('/alerts/stats');
    return response.data;
  }

  // Notification endpoints
  getNotifications = async (params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
    channel?: string;
    type?: string;
  }): Promise<{
    notifications: Notification[];
    unreadCount: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> => {
    const response = await this.client.get('/notifications', { params });
    return response.data;
  }

  markNotificationAsRead = async (id: string): Promise<void> => {
    await this.client.post(`/notifications/${id}/read`);
  }

  markAllNotificationsAsRead = async (): Promise<void> => {
    await this.client.post('/notifications/mark-all-read');
  }

  deleteNotification = async (id: string): Promise<void> => {
    await this.client.delete(`/notifications/${id}`);
  }

  getNotificationStats = async (): Promise<{
    total: number;
    unread: number;
    byChannel: Record<string, number>;
    byType: Record<string, number>;
  }> => {
    const response = await this.client.get('/notifications/stats');
    return response.data;
  }

  // Market data endpoints
  getAssetContexts = async (): Promise<any[]> => {
    const response = await this.client.get('/market/assets');
    return response.data;
  }

  getMarketSnapshot = async (coin: string): Promise<MarketData> => {
    const response = await this.client.get<MarketData>(`/market/assets/${coin}`);
    return response.data;
  }

  getFundingRates = async (): Promise<any[]> => {
    const response = await this.client.get('/market/funding-rates');
    return response.data;
  }

  getAccountSummary = async (walletAddress?: string): Promise<AccountSummary> => {
    const response = await this.client.get('/market/account-summary', {
      params: walletAddress ? { wallet: walletAddress } : {},
    });
    return response.data;
  }

  getUserFills = async (walletAddress?: string, limit = 100): Promise<any[]> => {
    const response = await this.client.get('/market/user-fills', {
      params: {
        ...(walletAddress && { wallet: walletAddress }),
        limit,
      },
    });
    return response.data;
  }

  getOpenOrders = async (walletAddress?: string): Promise<any[]> => {
    const response = await this.client.get('/market/open-orders', {
      params: walletAddress ? { wallet: walletAddress } : {},
    });
    return response.data;
  }

  getSpotBalances = async (walletAddress?: string): Promise<any> => {
    const response = await this.client.get('/market/spot-balances', {
      params: walletAddress ? { wallet: walletAddress } : {},
    });
    return response.data;
  }

  // Wallet authentication endpoints
  connectWallet = async (walletAddress: string, walletType: string): Promise<{
    user?: User;
    token?: string;
    isNewUser: boolean;
    needsRegistration?: boolean;
  }> => {
    const response = await this.client.post('/auth/wallet/connect', {
      walletAddress,
      walletType,
    });
    return response.data;
  }

  registerWithWallet = async (
    walletAddress: string,
    walletType: string,
    email: string,
    name: string,
    password?: string
  ): Promise<AuthResponse> => {
    const response = await this.client.post<AuthResponse>('/auth/wallet/register', {
      walletAddress,
      walletType,
      email,
      name,
      password,
    });
    return response.data;
  }

  walletLogin = async (walletAddress: string, walletType?: string): Promise<AuthResponse> => {
    const response = await this.client.post<AuthResponse>('/auth/wallet/login', {
      walletAddress,
      walletType,
    });
    return response.data;
  }

  disconnectWallet = async (): Promise<void> => {
    await this.client.post('/auth/wallet/disconnect');
  }

  // Hyperliquid user data endpoints
  getUserData = async (): Promise<{
    walletAddress: string;
    lastSync: string;
    positions: any[];
    orders: any[];
    fillHistory: any[];
    accountValue: number;
    fundingHistory: any[];
  }> => {
    const response = await this.client.get('/hyperliquid/user/data');
    return response.data;
  }

  getUserPositions = async (): Promise<{ positions: any[] }> => {
    const response = await this.client.get('/hyperliquid/user/positions');
    return response.data;
  }

  getUserOrders = async (): Promise<{ orders: any[] }> => {
    const response = await this.client.get('/hyperliquid/user/orders');
    return response.data;
  }

  getUserFillHistory = async (limit = 50): Promise<{ fillHistory: any[] }> => {
    const response = await this.client.get('/hyperliquid/user/fills', {
      params: { limit },
    });
    return response.data;
  }

  getUserAccountValue = async (): Promise<{
    accountValue: number;
    lastSync: string;
    walletAddress: string;
  }> => {
    const response = await this.client.get('/hyperliquid/user/account-value');
    return response.data;
  }

  subscribeToUserUpdates = async (): Promise<{
    message: string;
    walletAddress: string;
  }> => {
    const response = await this.client.post('/hyperliquid/user/subscribe');
    return response.data;
  }
}

export const apiService = new ApiService();