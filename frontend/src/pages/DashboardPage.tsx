import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { Alert as AlertType, MarketData, AccountSummary } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AnimatedCard } from '../components/ui/AnimatedCard';
import { GlowingButton } from '../components/ui/GlowingButton';
import { FuturisticProgress } from '../components/ui/FuturisticProgress';

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
  const { isDarkMode } = useCustomTheme();
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({});
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [lastChartUpdate, setLastChartUpdate] = useState<number>(Date.now());

  // Safe parsing functions to handle NaN values
  const safeParseFloat = (value: string | number | undefined | null, fallback: number = 0): number => {
    if (value === undefined || value === null || value === '' || value === 'NaN') return fallback;
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(parsed) ? fallback : parsed;
  };

  const formatCurrency = (value: string | number | undefined | null): string => {
    const num = safeParseFloat(value);
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPercentage = (value: string | number | undefined | null): string => {
    const num = safeParseFloat(value);
    return num.toFixed(2);
  };

  // Theme-aware colors
  const getThemeColors = () => {
    if (isDarkMode) {
      return {
        primary: '#00F5FF',
        secondary: '#B388FF',
        accent: '#FF1744',
        success: '#00E676',
        warning: '#FFD740',
        error: '#FF5722',
        primaryGradient: 'linear-gradient(45deg, #00F5FF 30%, #B388FF 90%)',
        cardBorder: 'rgba(0, 245, 255, 0.2)',
        cardBackground: 'linear-gradient(135deg, rgba(0, 245, 255, 0.05) 0%, rgba(179, 136, 255, 0.05) 100%)',
      };
    } else {
      return {
        primary: '#1565C0',       // Much darker blue
        secondary: '#512DA8',     // Much darker purple
        accent: '#C2185B',        // Darker pink
        success: '#2E7D32',       // Darker green
        warning: '#F57C00',       // Darker orange
        error: '#D32F2F',         // Darker red
        primaryGradient: 'linear-gradient(45deg, #1565C0 30%, #512DA8 90%)',
        cardBorder: 'rgba(21, 101, 192, 0.4)',
        cardBackground: 'linear-gradient(135deg, rgba(21, 101, 192, 0.08) 0%, rgba(81, 45, 168, 0.08) 100%)',
      };
    }
  };

  const themeColors = getThemeColors();

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

  const handlePriceUpdate = useCallback((data: any) => {
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
      });
      
      // Update market data immediately for price display
      setMarketData(prev => ({ ...prev, ...newMarketData }));
      
      // Update price history only every 30 seconds for chart
      const now = Date.now();
      setLastChartUpdate(prevTime => {
        if (now - prevTime >= 30000) { // 30 seconds
          Object.entries(data.mids).forEach(([coin, price]) => {
            setPriceHistory(prev => ({
              ...prev,
              [coin]: [...(prev[coin] || []).slice(-29), parseFloat(price as string)],
            }));
          });
          return now;
        }
        return prevTime;
      });
    }
  }, []);

  useEffect(() => {
    // Set up WebSocket listeners for real-time updates
    websocketService.on('price:update', handlePriceUpdate);
    websocketService.subscribeToPrices(['ETH', 'BTC', 'SOL', 'ARB', 'OP']);

    if (authState.user?.walletAddress) {
      websocketService.subscribeToOrders();
      websocketService.subscribeToPositions();
    }

    return () => {
      websocketService.off('price:update', handlePriceUpdate);
    };
  }, [authState.user?.walletAddress, handlePriceUpdate]);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactElement;
    color: string;
    trend?: number;
    loading?: boolean;
  }> = ({ title, value, icon, color, trend, loading }) => (
    <AnimatedCard variant="glow" glowColor={color} sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography 
              color="textSecondary" 
              gutterBottom 
              variant="h6"
              sx={{ 
                fontSize: '0.875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {title}
            </Typography>
            {loading ? (
              <Skeleton width={80} height={40} />
            ) : (
              <Typography 
                variant="h4" 
                component="div" 
                fontWeight="bold"
                sx={{
                  color: isDarkMode ? '#FFFFFF' : '#1A1A1A',
                  textShadow: isDarkMode ? `0 0 20px ${color}60` : `0 2px 8px ${color}40`,
                  fontSize: '2rem',
                  letterSpacing: '0.5px',
                  fontWeight: 700,
                }}
              >
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
                  sx={{ 
                    ml: 0.5,
                    fontWeight: 600,
                    textShadow: trend > 0 ? '0 0 10px rgba(0, 230, 118, 0.5)' : '0 0 10px rgba(244, 67, 54, 0.5)'
                  }}
                >
                  {Math.abs(trend)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar 
            sx={{ 
              background: `linear-gradient(135deg, ${color} 0%, ${color}60 100%)`,
              width: 56, 
              height: 56,
              boxShadow: `0 8px 24px ${color}40`,
              border: `2px solid ${color}30`,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </AnimatedCard>
  );

  const PriceChart: React.FC<{ coin: string; data: number[] }> = ({ coin, data }) => {
    const chartData = useMemo(() => ({
      labels: Array.from({ length: data.length }, (_, i) => i),
      datasets: [
        {
          label: coin,
          data,
          borderColor: isDarkMode ? 'rgba(0, 245, 255, 0.8)' : 'rgba(21, 101, 192, 0.9)',
          backgroundColor: isDarkMode ? 'rgba(0, 245, 255, 0.1)' : 'rgba(21, 101, 192, 0.15)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: isDarkMode ? '#00F5FF' : '#1565C0',
          pointBorderColor: isDarkMode ? '#00F5FF' : '#1565C0',
          pointHoverBackgroundColor: isDarkMode ? '#B388FF' : '#512DA8',
          pointHoverBorderColor: isDarkMode ? '#B388FF' : '#512DA8',
          shadowColor: isDarkMode ? 'rgba(0, 245, 255, 0.5)' : 'rgba(21, 101, 192, 0.4)',
          shadowBlur: 10,
        },
      ],
    }), [coin, data, isDarkMode]);

    const options = useMemo(() => ({
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
      animation: {
        duration: 0, // Disable animations to prevent flickering
      },
    }), []);

    return (
      <Box sx={{ height: 100 }}>
        <Line data={chartData} options={options} />
      </Box>
    );
  };

  // Memoized version of PriceChart with deep comparison
  const MemoizedPriceChart = React.memo(PriceChart, (prevProps, nextProps) => {
    return (
      prevProps.coin === nextProps.coin &&
      prevProps.data.length === nextProps.data.length &&
      prevProps.data.every((val, index) => val === nextProps.data[index])
    );
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography 
          variant="h4" 
          fontWeight="bold"
          sx={{
            color: isDarkMode ? 'transparent' : themeColors.primary,
            background: isDarkMode ? themeColors.primaryGradient : 'transparent',
            backgroundClip: isDarkMode ? 'text' : 'initial',
            WebkitBackgroundClip: isDarkMode ? 'text' : 'initial',
            WebkitTextFillColor: isDarkMode ? 'transparent' : 'initial',
            textShadow: isDarkMode 
              ? '0 0 30px rgba(0, 245, 255, 0.3)'
              : `0 4px 16px ${themeColors.primary}30`,
            fontSize: '2.5rem',
            letterSpacing: '0.5px',
          }}
        >
          Dashboard
        </Typography>
        <GlowingButton 
          size="small" 
          onClick={() => refetchAlertStats()}
          sx={{ minWidth: 'auto', px: 3, py: 1.5 }}
        >
          <Refresh sx={{ mr: 1 }} />
          Refresh
        </GlowingButton>
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
          <AnimatedCard variant="shimmer">
            <CardHeader
              title={
                <Typography 
                  variant="h5" 
                  fontWeight="bold"
                  sx={{
                    color: isDarkMode ? 'transparent' : themeColors.primary,
                    background: isDarkMode ? themeColors.primaryGradient : 'transparent',
                    backgroundClip: isDarkMode ? 'text' : 'initial',
                    WebkitBackgroundClip: isDarkMode ? 'text' : 'initial',
                    WebkitTextFillColor: isDarkMode ? 'transparent' : 'initial',
                  }}
                >
                  Market Overview
                </Typography>
              }
              action={
                <GlowingButton 
                  size="small"
                  onClick={() => navigate('/market')}
                  sx={{ minWidth: 'auto', px: 2 }}
                >
                  <Launch sx={{ fontSize: '1.2rem' }} />
                </GlowingButton>
              }
            />
            <CardContent>
              <Grid container spacing={2}>
                {['ETH', 'BTC', 'SOL', 'ARB'].map((coin) => {
                  const data = marketData[coin];
                  const history = priceHistory[coin] || [];
                  
                  return (
                    <Grid xs={12} sm={6} md={3} key={coin}>
                      <AnimatedCard 
                        variant="float" 
                        sx={{ 
                          p: 2,
                          background: themeColors.cardBackground,
                          border: `1px solid ${themeColors.cardBorder}`,
                          borderRadius: 3,
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: isDarkMode 
                              ? `linear-gradient(135deg, rgba(0, 245, 255, 0.1) 0%, rgba(179, 136, 255, 0.1) 50%, transparent 100%)`
                              : `linear-gradient(135deg, rgba(0, 145, 234, 0.12) 0%, rgba(124, 77, 255, 0.12) 50%, transparent 100%)`,
                            opacity: 0,
                            transition: 'opacity 0.3s ease',
                            pointerEvents: 'none',
                          },
                          '&:hover::before': {
                            opacity: 1,
                          },
                        }}
                      >
                        <Typography 
                          variant="h6" 
                          fontWeight="bold"
                          sx={{
                            mb: 1,
                            color: themeColors.primary,
                            textShadow: isDarkMode 
                              ? `0 0 10px ${themeColors.primary}50`
                              : `0 2px 8px ${themeColors.primary}30`,
                            fontSize: '1.1rem',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {coin}
                        </Typography>
                        {data ? (
                          <>
                            <Typography 
                              variant="h5" 
                              sx={{
                                color: isDarkMode ? 'transparent' : themeColors.primary,
                                background: isDarkMode ? themeColors.primaryGradient : 'transparent',
                                backgroundClip: isDarkMode ? 'text' : 'initial',
                                WebkitBackgroundClip: isDarkMode ? 'text' : 'initial',
                                WebkitTextFillColor: isDarkMode ? 'transparent' : 'initial',
                                fontWeight: 'bold',
                                mb: 2,
                                textShadow: isDarkMode 
                                  ? '0 0 20px rgba(0, 245, 255, 0.3)'
                                  : `0 2px 12px ${themeColors.primary}40`,
                              }}
                            >
                              ${data.price.toLocaleString()}
                            </Typography>
                            {history.length > 1 && (
                              <Box sx={{ 
                                position: 'relative',
                                '&::after': {
                                  content: '""',
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  height: '2px',
                                  background: themeColors.primaryGradient,
                                  borderRadius: '1px',
                                  opacity: isDarkMode ? 0.6 : 0.8,
                                },
                              }}>
                                <MemoizedPriceChart coin={coin} data={[...history]} />
                              </Box>
                            )}
                          </>
                        ) : (
                          <Skeleton height={60} />
                        )}
                      </AnimatedCard>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </AnimatedCard>
        </Grid>

        {/* Account Summary & Portfolio */}
        <Grid xs={12} md={8}>
          <AnimatedCard variant="glow" glowColor="rgba(0, 245, 255, 0.4)">
            <CardHeader
              title={
                <Typography 
                  variant="h5" 
                  fontWeight="bold"
                  sx={{
                    color: isDarkMode ? 'transparent' : themeColors.primary,
                    background: isDarkMode ? themeColors.primaryGradient : 'transparent',
                    backgroundClip: isDarkMode ? 'text' : 'initial',
                    WebkitBackgroundClip: isDarkMode ? 'text' : 'initial',
                    WebkitTextFillColor: isDarkMode ? 'transparent' : 'initial',
                  }}
                >
                  Account Summary & Portfolio
                </Typography>
              }
              avatar={
                <Avatar sx={{
                  background: themeColors.primaryGradient,
                  boxShadow: isDarkMode 
                    ? '0 8px 24px rgba(0, 245, 255, 0.4)'
                    : '0 8px 24px rgba(0, 145, 234, 0.3)',
                  border: `2px solid ${themeColors.cardBorder}`,
                }}>
                  <AccountBalanceWallet />
                </Avatar>
              }
            />
            <CardContent>
              {authState.user?.walletAddress ? (
                accountSummary ? (
                  <Box>
                    {/* Account Summary Stats */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="primary" fontWeight="bold">
                            ${formatCurrency(accountSummary.marginSummary.accountValue)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Account Value
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="success.main" fontWeight="bold">
                            ${formatCurrency(accountSummary.withdrawable)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Withdrawable
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="warning.main" fontWeight="bold">
                            ${formatCurrency(accountSummary.marginSummary.totalMarginUsed)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Margin Used
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="info.main" fontWeight="bold">
                            {accountSummary.assetPositions.length}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Positions
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Margin Usage Bar */}
                    <Box sx={{ mb: 3 }}>
                      <FuturisticProgress
                        value={safeParseFloat(accountSummary.marginSummary.totalMarginUsed)}
                        max={safeParseFloat(accountSummary.marginSummary.accountValue, 1)}
                        label="Margin Usage"
                        color="warning"
                        animated={true}
                        showPercentage={true}
                        height={14}
                      />
                    </Box>

                    {/* Portfolio Analytics */}
                    {accountSummary.assetPositions.length > 0 && (
                      <Box sx={{ 
                        mb: 3, 
                        p: 2, 
                        background: themeColors.cardBackground,
                        border: `1px solid ${themeColors.cardBorder}`,
                        borderRadius: 2,
                      }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          Portfolio Summary
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">Total PnL</Typography>
                            {(() => {
                              const totalPnL = accountSummary.assetPositions.reduce((total, pos) => {
                                return total + safeParseFloat(pos.unrealizedPnl);
                              }, 0);
                              return (
                                <Typography
                                  variant="h6"
                                  fontWeight="bold"
                                  color={totalPnL >= 0 ? 'success.main' : 'error.main'}
                                >
                                  {totalPnL >= 0 ? '+' : ''}${formatCurrency(totalPnL)}
                                </Typography>
                              );
                            })()}
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" color="text.secondary">Avg. ROE</Typography>
                            {(() => {
                              const avgROE = accountSummary.assetPositions.length > 0 
                                ? accountSummary.assetPositions.reduce((total, pos) => {
                                    return total + safeParseFloat(pos.returnOnEquity);
                                  }, 0) / accountSummary.assetPositions.length * 100
                                : 0;
                              return (
                                <Typography
                                  variant="h6"
                                  fontWeight="bold"
                                  color={avgROE >= 0 ? 'success.main' : 'error.main'}
                                >
                                  {avgROE >= 0 ? '+' : ''}{formatPercentage(avgROE)}%
                                </Typography>
                              );
                            })()}
                          </Box>
                        </Box>
                      </Box>
                    )}

                    {/* Portfolio Positions */}
                    {accountSummary.assetPositions.length > 0 ? (
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                          <TrendingUp sx={{ mr: 1 }} />
                          Your Positions ({accountSummary.assetPositions.length})
                        </Typography>
                        <List sx={{ p: 0 }}>
                          {accountSummary.assetPositions.map((position, index) => {
                            const pnl = safeParseFloat(position.unrealizedPnl);
                            const pnlPercent = safeParseFloat(position.returnOnEquity) * 100;
                            const isProfit = pnl >= 0;
                            const positionSize = safeParseFloat(position.szi);
                            const entryPrice = safeParseFloat(position.entryPx);
                            const positionValue = safeParseFloat(position.positionValue);
                            const leverage = safeParseFloat(position.leverage?.value, 1);
                            
                            return (
                              <ListItem
                                key={position.coin}
                                sx={{
                                  px: 0,
                                  py: 1,
                                  borderBottom: index < accountSummary.assetPositions.length - 1 ? 1 : 0,
                                  borderColor: 'divider'
                                }}
                              >
                                <ListItemAvatar>
                                  <Avatar sx={{ 
                                    bgcolor: isProfit ? 'success.main' : 'error.main',
                                    width: 40,
                                    height: 40
                                  }}>
                                    <Typography variant="caption" fontWeight="bold">
                                      {position.coin}
                                    </Typography>
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Box>
                                        <Typography variant="body1" fontWeight="bold">
                                          {position.coin}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {Math.abs(positionSize).toFixed(4)} {position.coin} • {leverage.toFixed(1)}x
                                        </Typography>
                                      </Box>
                                      <Box sx={{ textAlign: 'right' }}>
                                        <Typography
                                          variant="body2"
                                          fontWeight="bold"
                                          color={isProfit ? 'success.main' : 'error.main'}
                                        >
                                          {isProfit ? '+' : ''}${formatCurrency(pnl)}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color={isProfit ? 'success.main' : 'error.main'}
                                        >
                                          {isProfit ? '+' : ''}{formatPercentage(pnlPercent)}%
                                        </Typography>
                                      </Box>
                                    </Box>
                                  }
                                  secondary={
                                    <Box>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">
                                          Entry: ${formatCurrency(entryPrice)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          Value: ${formatCurrency(positionValue)}
                                        </Typography>
                                      </Box>
                                      {position.liquidationPx && (
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                          <Typography variant="caption" color="warning.main">
                                            Liquidation: ${formatCurrency(safeParseFloat(position.liquidationPx))}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            Margin: ${formatCurrency(safeParseFloat(position.marginUsed))}
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  }
                                />
                              </ListItem>
                            );
                          })}
                        </List>
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          No active positions
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Open a position on Hyperliquid to see it here
                        </Typography>
                      </Box>
                    )}
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
                  Connect wallet to view account summary and portfolio
                </Typography>
              )}
            </CardContent>
          </AnimatedCard>
        </Grid>

        {/* Recent Alerts */}
        <Grid xs={12} md={4}>
          <AnimatedCard variant="glow" glowColor="rgba(255, 23, 68, 0.4)">
            <CardHeader 
              title={
                <Typography 
                  variant="h6" 
                  fontWeight="bold"
                  sx={{
                    color: isDarkMode ? 'transparent' : themeColors.accent,
                    background: isDarkMode 
                      ? 'linear-gradient(45deg, #FF1744 30%, #E91E63 90%)'
                      : 'transparent',
                    backgroundClip: isDarkMode ? 'text' : 'initial',
                    WebkitBackgroundClip: isDarkMode ? 'text' : 'initial',
                    WebkitTextFillColor: isDarkMode ? 'transparent' : 'initial',
                  }}
                >
                  Recent Alerts
                </Typography>
              } 
            />
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
          </AnimatedCard>
        </Grid>

        {/* Recent Notifications */}
        <Grid xs={12} md={8}>
          <AnimatedCard variant="glow" glowColor="rgba(0, 230, 118, 0.4)">
            <CardHeader 
              title={
                <Typography 
                  variant="h6" 
                  fontWeight="bold"
                  sx={{
                    color: isDarkMode ? 'transparent' : themeColors.success,
                    background: isDarkMode 
                      ? 'linear-gradient(45deg, #00E676 30%, #69F0AE 90%)'
                      : 'transparent',
                    backgroundClip: isDarkMode ? 'text' : 'initial',
                    WebkitBackgroundClip: isDarkMode ? 'text' : 'initial',
                    WebkitTextFillColor: isDarkMode ? 'transparent' : 'initial',
                  }}
                >
                  Recent Notifications
                </Typography>
              } 
            />
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
          </AnimatedCard>
        </Grid>
      </Grid>
    </Box>
  );
};