import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Notification as NotificationModel } from '../types';
import { websocketService } from '../services/websocket';
import { useAuth } from './AuthContext';

interface NotificationState {
  notifications: NotificationModel[];
  unreadCount: number;
  alertCount: number;
}

interface NotificationContextType {
  state: NotificationState;
  addNotification: (notification: NotificationModel) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { state: authState } = useAuth();
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    alertCount: 0,
  });

  useEffect(() => {
    if (!authState.isAuthenticated) {
      setState({
        notifications: [],
        unreadCount: 0,
        alertCount: 0,
      });
      return;
    }

    // WebSocket event listeners
    const handleNotification = (notification: NotificationModel) => {
      addNotification(notification);
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
        });
      }
    };

    const handleNotificationCount = (data: { unread: number }) => {
      setState(prev => ({
        ...prev,
        unreadCount: data.unread,
      }));
    };

    const handleAlertCount = (data: { active: number }) => {
      setState(prev => ({
        ...prev,
        alertCount: data.active,
      }));
    };

    // Subscribe to WebSocket events
    websocketService.on('notification', handleNotification);
    websocketService.on('notification:count', handleNotificationCount);
    websocketService.on('alerts:count', handleAlertCount);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup on unmount
    return () => {
      websocketService.off('notification', handleNotification);
      websocketService.off('notification:count', handleNotificationCount);
      websocketService.off('alerts:count', handleAlertCount);
    };
  }, [authState.isAuthenticated]);

  const addNotification = (notification: NotificationModel) => {
    setState(prev => ({
      ...prev,
      notifications: [notification, ...prev.notifications.slice(0, 49)], // Keep last 50
      unreadCount: prev.unreadCount + (notification.isRead ? 0 : 1),
    }));
  };

  const removeNotification = (id: string) => {
    setState(prev => {
      const notification = prev.notifications.find(n => n.id === id);
      return {
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== id),
        unreadCount: notification && !notification.isRead 
          ? prev.unreadCount - 1 
          : prev.unreadCount,
      };
    });
  };

  const markAsRead = (id: string) => {
    setState(prev => {
      const notification = prev.notifications.find(n => n.id === id);
      if (!notification || notification.isRead) return prev;

      return {
        ...prev,
        notifications: prev.notifications.map(n =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        ),
        unreadCount: prev.unreadCount - 1,
      };
    });
  };

  const markAllAsRead = () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        n.isRead ? n : { ...n, isRead: true, readAt: new Date().toISOString() }
      ),
      unreadCount: 0,
    }));
  };

  const clearNotifications = () => {
    setState(prev => ({
      ...prev,
      notifications: [],
      unreadCount: 0,
    }));
  };

  const contextValue: NotificationContextType = {
    state,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};