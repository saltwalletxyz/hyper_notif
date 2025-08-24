import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Skeleton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Refresh,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { websocketService } from '../services/websocket';
import { MarketData } from '../types';

export const MarketPage: React.FC = () => {
  const [liveData, setLiveData] = useState<Record<string, any>>({});

  const { data: assets, isLoading, refetch } = useQuery({
    queryKey: ['assetContexts'],
    queryFn: apiService.getAssetContexts,
    refetchInterval: 30000,
  });

  useEffect(() => {
    const handlePriceUpdate = (data: any) => {
      if (data.mids) {
        setLiveData(prev => ({ ...prev, ...data.mids }));
      }
    };

    websocketService.on('price:update', handlePriceUpdate);
    websocketService.subscribeToPrices(['ETH', 'BTC', 'SOL', 'ARB', 'OP']);

    return () => {
      websocketService.off('price:update', handlePriceUpdate);
    };
  }, []);

  const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const formatVolume = (volume: string | number) => {
    const num = typeof volume === 'string' ? parseFloat(volume) : volume;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const calculatePriceChange = (current: string, prev: string) => {
    const currentPrice = parseFloat(current);
    const prevPrice = parseFloat(prev);
    const change = ((currentPrice - prevPrice) / prevPrice) * 100;
    return change;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Market Data
        </Typography>
        <IconButton onClick={() => refetch()}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Market Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {['ETH', 'BTC', 'SOL', 'ARB'].map((coin) => {
          const assetData = assets?.find((a: any) => a.coin === coin);
          const livePrice = liveData[coin];
          const currentPrice = livePrice || (assetData ? parseFloat(assetData.midPx) : 0);
          const prevPrice = assetData ? parseFloat(assetData.prevDayPx) : 0;
          const priceChange = prevPrice ? calculatePriceChange(currentPrice.toString(), assetData.prevDayPx) : 0;

          return (
            <Grid xs={12} sm={6} md={3} key={coin}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {coin}
                    </Typography>
                    <Chip
                      icon={priceChange >= 0 ? <TrendingUp /> : <TrendingDown />}
                      label={`${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`}
                      color={priceChange >= 0 ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  
                  {isLoading ? (
                    <Skeleton height={40} width="60%" />
                  ) : (
                    <Typography variant="h5" color="primary" fontWeight="bold">
                      ${formatPrice(currentPrice)}
                    </Typography>
                  )}
                  
                  {assetData && (
                    <Typography variant="body2" color="text.secondary">
                      24h Vol: {formatVolume(assetData.dayNtlVlm)}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Market Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            All Assets
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Asset</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">24h Change</TableCell>
                  <TableCell align="right">Volume</TableCell>
                  <TableCell align="right">Open Interest</TableCell>
                  <TableCell align="right">Funding Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton width={60} /></TableCell>
                      <TableCell align="right"><Skeleton width={80} /></TableCell>
                      <TableCell align="right"><Skeleton width={60} /></TableCell>
                      <TableCell align="right"><Skeleton width={80} /></TableCell>
                      <TableCell align="right"><Skeleton width={80} /></TableCell>
                      <TableCell align="right"><Skeleton width={60} /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  assets?.map((asset: any) => {
                    const livePrice = liveData[asset.coin];
                    const currentPrice = livePrice || parseFloat(asset.midPx);
                    const priceChange = calculatePriceChange(currentPrice.toString(), asset.prevDayPx);
                    const fundingRate = parseFloat(asset.funding) * 100;

                    return (
                      <TableRow key={asset.coin} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography fontWeight="medium">
                              {asset.coin}
                            </Typography>
                            {livePrice && (
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: 'success.main',
                                  ml: 1,
                                }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                          ${formatPrice(currentPrice)}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`}
                            color={priceChange >= 0 ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatVolume(asset.dayNtlVlm)}
                        </TableCell>
                        <TableCell align="right">
                          {formatVolume(asset.openInterest)}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            color={fundingRate >= 0 ? 'success.main' : 'error.main'}
                            fontWeight="medium"
                          >
                            {fundingRate >= 0 ? '+' : ''}{fundingRate.toFixed(4)}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};