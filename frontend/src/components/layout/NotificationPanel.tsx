import React, { useEffect, useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  Button,
  Chip,
  Avatar,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  NotificationsActive,
  TrendingUp,
  CheckCircle,
  Error,
  Warning,
  Info,
  MarkEmailRead,
  DeleteSweep,
} from '@mui/icons-material';
import { useNotifications } from '../../contexts/NotificationContext';
import { apiService } from '../../services/api';
import { Notification, NotificationType } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.ALERT_TRIGGERED:
      return <NotificationsActive color="warning" />;
    case NotificationType.ORDER_UPDATE:
      return <TrendingUp color="info" />;
    case NotificationType.POSITION_UPDATE:
      return <TrendingUp color="success" />;
    case NotificationType.SYSTEM_MESSAGE:
      return <Info color="info" />;
    case NotificationType.MARKET_UPDATE:
      return <TrendingUp color="primary" />;
    default:
      return <Info color="info" />;
  }
};

const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case NotificationType.ALERT_TRIGGERED:
      return 'warning';
    case NotificationType.ORDER_UPDATE:
      return 'info';
    case NotificationType.POSITION_UPDATE:
      return 'success';
    case NotificationType.SYSTEM_MESSAGE:
      return 'info';
    case NotificationType.MARKET_UPDATE:
      return 'primary';
    default:
      return 'default';
  }
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  open,
  onClose,
}) => {
  const { state, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await apiService.getNotifications({ limit: 50 });
      setNotifications(response.notifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.isRead) return;

    try {
      await apiService.markNotificationAsRead(notification.id);
      markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsAsRead();
      markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notification: Notification) => {
    try {
      await apiService.deleteNotification(notification.id);
      removeNotification(notification.id);
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100vw', sm: 400 },
          bgcolor: 'background.paper',
        },
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight="bold">
            Notifications
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        {state.unreadCount > 0 && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<MarkEmailRead />}
              onClick={handleMarkAllAsRead}
            >
              Mark All Read
            </Button>
            <Chip
              label={`${state.unreadCount} unread`}
              size="small"
              color="error"
            />
          </Box>
        )}
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsActive sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.selected',
                    },
                  }}
                  onClick={() => handleMarkAsRead(notification)}
                >
                  <Box sx={{ display: 'flex', width: '100%', mb: 1 }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        mr: 2,
                        bgcolor: `${getNotificationColor(notification.type)}.light`,
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                    
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={notification.isRead ? 400 : 600}
                          sx={{ flex: 1 }}
                        >
                          {notification.title}
                        </Typography>
                        {!notification.isRead && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              ml: 1,
                            }}
                          />
                        )}
                      </Box>
                      
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          mb: 1,
                        }}
                      >
                        {notification.message}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </Typography>
                        
                        {notification.alert && (
                          <Chip
                            label={notification.alert.asset}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        )}
                      </Box>
                    </Box>
                    
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification);
                      }}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      <DeleteSweep fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
                
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
};