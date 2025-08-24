import React, { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  LinearProgress,
  IconButton,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  NotificationsActive,
  TrendingUp,
  TrendingDown,
  AccountBalanceWallet,
  Warning,
  CheckCircle,
  Refresh,
  Launch,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { apiService } from '../services/api';
import { websocketService } from '../services/websocket';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Alert as AlertType, MarketData, AccountSummary } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardStats {
  totalAlerts: number;
  activeAlerts: number;
  triggeredAlerts: number;
  alertsByType: Record<string, number>;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const { state: notificationState } = useNotifications();
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({});
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);

  // Fetch alert statistics
  const { data: alertStats, isLoading: alertStatsLoading, refetch: refetchAlertStats } = useQuery<DashboardStats>({
    queryKey: ['alertStats'],
    queryFn: apiService.getAlertStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent alerts
  const { data: recentAlertsData, isLoading: recentAlertsLoading } = useQuery({
    queryKey: ['recentAlerts'],
    queryFn: () => apiService.getAlerts({ limit: 5, isActive: true }),
    refetchInterval: 30000,
  });

  // Fetch asset contexts and transform to market data
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const contexts = await apiService.getAssetContexts();
      const marketDataMap: Record<string, MarketData> = {};
      
      contexts.forEach((ctx: any) => {
        if (['BTC', 'ETH', 'SOL', 'ARB'].includes(ctx.coin)) {
          const price = parseFloat(ctx.midPx || ctx.markPx || '0');
          const prevPrice = parseFloat(ctx.prevDayPx || '0');
          const priceChange24h = price - prevPrice;
          const priceChangePercent24h = prevPrice > 0 ? (priceChange24h / prevPrice) * 100 : 0;
          
          marketDataMap[ctx.coin] = {
            coin: ctx.coin,
            price,
            volume24h: parseFloat(ctx.dayNtlVlm || '0'),
            priceChange24h,
            priceChangePercent24h,
            high24h: price, // Not available in basic context
            low24h: price, // Not available in basic context
            fundingRate: parseFloat(ctx.funding || '0'),
            openInterest: parseFloat(ctx.openInterest || '0'),
            timestamp: new Date().toISOString(),
          };
        }
      });
      
      return marketDataMap;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch account summary if wallet address is available
  const { data: accountData } = useQuery({
    queryKey: ['accountSummary', authState.user?.walletAddress],
    queryFn: () => apiService.getAccountSummary(),
    enabled: !!authState.user?.walletAddress,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (accountData) {
      setAccountSummary(accountData);
    }
  }, [accountData]);
  
  useEffect(() => {
    if (assets) {
      setMarketData(assets);
      // Initialize price history
      Object.keys(assets).forEach(coin => {
        setPriceHistory(prev => ({
          ...prev,
          [coin]: [...(prev[coin] || []).slice(-29), assets[coin].price],
        }));
      });
    }
  }, [assets]);

  useEffect(() => {
    // Set up WebSocket listeners for real-time updates
    const handlePriceUpdate = (data: any) => {
      if (data.mids) {
        const newMarketData: Record<string, MarketData> = {};
        Object.entries(data.mids).forEach(([coin, price]) => {
          newMarketData[coin] = {
            coin,
            price: parseFloat(price as string),
            volume24h: 0,
            priceChange24h: 0,
            priceChangePercent24h: 0,
            high24h: 0,
            low24h: 0,
            timestamp: new Date().toISOString(),
          };

          // Update price history
          setPriceHistory(prev => ({
            ...prev,
            [coin]: [...(prev[coin] || []).slice(-29), parseFloat(price as string)],
          }));
        });
        setMarketData(prev => ({ ...prev, ...newMarketData }));
      }
    };

    websocketService.on('price:update', handlePriceUpdate);
    websocketService.subscribeToPrices(['ETH', 'BTC', 'SOL', 'ARB', 'OP']);

    if (authState.user?.walletAddress) {
      websocketService.subscribeToOrders();
      websocketService.subscribeToPositions();
    }

    return () => {
      websocketService.off('price:update', handlePriceUpdate);
    };
  }, [authState.user?.walletAddress]);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactElement;
    color: string;
    trend?: number;
    loading?: boolean;
  }> = ({ title, value, icon, color, trend, loading }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            {loading ? (
              <Skeleton width={80} height={40} />
            ) : (
              <Typography variant="h4" component="div" fontWeight="bold">
                {value}
              </Typography>
            )}
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend > 0 ? (
                  <TrendingUp color="success" fontSize="small" />
                ) : (
                  <TrendingDown color="error" fontSize="small" />
                )}
                <Typography
                  variant="body2"
                  color={trend > 0 ? 'success.main' : 'error.main'}
                  sx={{ ml: 0.5 }}
                >
                  {Math.abs(trend)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const PriceChart: React.FC<{ coin: string; data: number[] }> = ({ coin, data }) => {
    const chartData = {
      labels: Array.from({ length: data.length }, (_, i) => i),
      datasets: [
        {
          label: coin,
          data,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          display: false,
        },
        y: {
          display: false,
        },
      },
      elements: {
        point: {
          radius: 0,
        },
      },
    };

    return (
      <Box sx={{ height: 100 }}>
        <Line data={chartData} options={options} />
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Dashboard
        </Typography>
        <IconButton onClick={() => refetchAlertStats()}>
          <Refresh />
        </IconButton>
      </Box>

      {!authState.user?.walletAddress && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Connect your Hyperliquid wallet address in settings to enable position and order monitoring.
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="Active Alerts"
            value={alertStats?.activeAlerts ?? 0}
            icon={<NotificationsActive />}
            color="primary.main"
            loading={alertStatsLoading}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="Triggered Today"
            value={alertStats?.triggeredAlerts ?? 0}
            icon={<Warning />}
            color="warning.main"
            loading={alertStatsLoading}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="Total Alerts"
            value={alertStats?.totalAlerts ?? 0}
            icon={<CheckCircle />}
            color="success.main"
            loading={alertStatsLoading}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="Unread Notifications"
            value={notificationState.unreadCount}
            icon={<NotificationsActive />}
            color="error.main"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Market Overview */}
        <Grid xs={12} md={8}>
          <Card>
            <CardHeader
              title="Market Overview"
              action={
                <IconButton onClick={() => navigate('/market')}>
                  <Launch />
                </IconButton>
              }
            />
            <CardContent>
              <Grid container spacing={2}>
                {['ETH', 'BTC', 'SOL', 'ARB'].map((coin) => {
                  const data = marketData[coin];
                  const history = priceHistory[coin] || [];
                  return (
                    <Grid xs={12} sm={6} md={3} key={coin}>
                      <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {coin}
                        </Typography>
                        {data ? (
                          <>
                            <Typography variant="h5" color="primary">
                              ${data.price.toLocaleString()}
                            </Typography>
                            {history.length > 1 && <PriceChart coin={coin} data={history} />}
                          </>
                        ) : (
                          <Skeleton height={60} />
                        )}
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Summary */}
        <Grid xs={12} md={4}>
          <Card>
            <CardHeader
              title="Account Summary"
              avatar={<Avatar><AccountBalanceWallet /></Avatar>}
            />
            <CardContent>
              {authState.user?.walletAddress ? (
                accountSummary ? (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography>Account Value:</Typography>
                      <Typography fontWeight="bold">
                        ${parseFloat(accountSummary.marginSummary.accountValue).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography>Withdrawable:</Typography>
                      <Typography fontWeight="bold">
                        ${parseFloat(accountSummary.marginSummary.withdrawable).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography>Open Positions:</Typography>
                      <Typography fontWeight="bold">
                        {accountSummary.assetPositions.length}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={
                        (parseFloat(accountSummary.marginSummary.totalMarginUsed) /
                          parseFloat(accountSummary.marginSummary.accountValue)) *
                        100
                      }
                      sx={{ mt: 2 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                      Margin Usage
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Skeleton height={20} sx={{ mb: 1 }} />
                    <Skeleton height={20} sx={{ mb: 1 }} />
                    <Skeleton height={20} sx={{ mb: 2 }} />
                    <Skeleton height={10} />
                  </Box>
                )
              ) : (
                <Typography color="text.secondary">
                  Connect wallet to view account summary
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Alerts */}
        <Grid xs={12} md={6}>
          <Card>
            <CardHeader title="Recent Alerts" />
            <CardContent sx={{ pt: 0 }}>
              {recentAlertsLoading ? (
                <List>
                  {[...Array(3)].map((_, i) => (
                    <ListItem key={i} sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Skeleton variant="circular" width={40} height={40} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Skeleton width="60%" />}
                        secondary={<Skeleton width="40%" />}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : recentAlertsData?.alerts.length ? (
                <List sx={{ p: 0 }}>
                  {recentAlertsData.alerts.map((alert: AlertType) => (
                    <ListItem key={alert.id} sx={{ px: 0, py: 1 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: alert.isActive ? 'success.main' : 'grey.400' }}>
                          <NotificationsActive />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" fontWeight="medium">
                              {alert.name}
                            </Typography>
                            <Chip
                              label={alert.asset}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            Created {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                          </Typography>
                        }
                      />
                      <Chip
                        label={alert.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={alert.isActive ? 'success' : 'default'}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" textAlign="center">
                  No alerts created yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Notifications */}
        <Grid xs={12} md={6}>
          <Card>
            <CardHeader title="Recent Notifications" />
            <CardContent sx={{ pt: 0 }}>
              {notificationState.notifications.length ? (
                <List sx={{ p: 0 }}>
                  {notificationState.notifications.slice(0, 5).map((notification) => (
                    <ListItem key={notification.id} sx={{ px: 0, py: 1 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: notification.isRead ? 'grey.400' : 'primary.main' }}>
                          <NotificationsActive />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            fontWeight={notification.isRead ? 'normal' : 'medium'}
                          >
                            {notification.title}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </Typography>
                        }
                      />
                      {!notification.isRead && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                          }}
                        />
                      )}
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" textAlign="center">
                  No notifications yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};