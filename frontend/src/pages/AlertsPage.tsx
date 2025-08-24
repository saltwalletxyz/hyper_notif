import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as ActivateIcon,
  Pause as DeactivateIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { apiService } from '../services/api';
import { Alert as AlertType, AlertType as AlertTypeEnum, AlertCondition, MarketType, CreateAlertRequest } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { websocketService } from '../services/websocket';
import { useEffect } from 'react';

export const AlertsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => apiService.getAlerts({ limit: 50 }),
    refetchInterval: 60000, // Reduced frequency since we have real-time updates
  });

  // Listen for real-time alert updates
  useEffect(() => {
    const handleAlertUpdate = (update: { id: string; currentValue: number; asset: string }) => {
      // Update the cached alert data
      queryClient.setQueryData(['alerts'], (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          alerts: oldData.alerts.map((alert: AlertType) => 
            alert.id === update.id 
              ? { ...alert, currentValue: update.currentValue }
              : alert
          ),
        };
      });
    };

    // Subscribe to alert updates
    websocketService.on('alert:update', handleAlertUpdate);

    // Subscribe to price updates for all alert assets
    if (alertsData?.alerts) {
      const uniqueAssets = Array.from(new Set(alertsData.alerts.map(alert => alert.asset)));
      websocketService.subscribeToPrices(uniqueAssets);
    }

    return () => {
      websocketService.off('alert:update', handleAlertUpdate);
      websocketService.unsubscribeFromPrices();
    };
  }, [queryClient, alertsData?.alerts]);

  const createMutation = useMutation({
    mutationFn: apiService.createAlert,
    onSuccess: (result) => {
      console.log('Alert created successfully:', result);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setDialogOpen(false);
      reset();
    },
    onError: (error) => {
      console.error('Alert creation failed:', error);
      alert('Failed to create alert: ' + (error as any)?.message || 'Unknown error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiService.updateAlert(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setDialogOpen(false);
      setEditingAlert(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: apiService.deleteAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setDeleteConfirm(null);
    },
  });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateAlertRequest>({
    defaultValues: {
      name: '',
      type: AlertTypeEnum.PRICE_ABOVE,
      asset: 'ETH',
      market: MarketType.PERPETUAL,
      condition: AlertCondition.GREATER_THAN,
      value: 0,
      notifyEmail: true,
      notifyWebhook: false,
      notifyInApp: true,
      notifyDiscord: false,
      notifyTelegram: false,
    },
  });

  const handleCreateAlert = () => {
    setEditingAlert(null);
    reset();
    setDialogOpen(true);
  };

  const handleEditAlert = (alert: AlertType) => {
    setEditingAlert(alert);
    reset({
      name: alert.name,
      type: alert.type,
      asset: alert.asset,
      market: alert.market,
      condition: alert.condition,
      value: alert.value,
      notifyEmail: alert.notifyEmail,
      notifyWebhook: alert.notifyWebhook,
      notifyInApp: alert.notifyInApp,
      notifyDiscord: alert.notifyDiscord,
      notifyTelegram: alert.notifyTelegram,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: CreateAlertRequest) => {
    console.log('Form submitted with data:', data);
    console.log('editingAlert:', editingAlert);
    console.log('createMutation.isPending:', createMutation.isPending);
    
    try {
      if (editingAlert) {
        console.log('Updating existing alert');
        await updateMutation.mutateAsync({ id: editingAlert.id, data });
      } else {
        console.log('Creating new alert');
        await createMutation.mutateAsync(data);
      }
      console.log('Alert operation completed successfully');
    } catch (error) {
      console.error('Alert submission error:', error);
    }
  };

  const handleToggleActive = (alert: AlertType) => {
    updateMutation.mutate({
      id: alert.id,
      data: { isActive: !alert.isActive },
    });
  };

  const getAlertTypeColor = (type: AlertTypeEnum) => {
    switch (type) {
      case AlertTypeEnum.PRICE_ABOVE:
        return 'success';
      case AlertTypeEnum.PRICE_BELOW:
        return 'error';
      case AlertTypeEnum.PRICE_CHANGE_PERCENT:
        return 'warning';
      case AlertTypeEnum.VOLUME_SPIKE:
        return 'info';
      case AlertTypeEnum.FUNDING_RATE:
        return 'secondary';
      case AlertTypeEnum.LIQUIDATION_RISK:
        return 'error';
      case AlertTypeEnum.ORDER_FILLED:
        return 'primary';
      case AlertTypeEnum.POSITION_PNL:
        return 'success';
      case AlertTypeEnum.BALANCE_CHANGE:
        return 'info';
      default:
        return 'default';
    }
  };

  const formatAlertType = (type: AlertTypeEnum) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const assets = ['ETH', 'BTC', 'SOL', 'ARB', 'OP', 'AVAX', 'MATIC', 'ATOM', 'DOT', 'ADA'];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Alerts
        </Typography>
        <Box>
          <IconButton onClick={() => queryClient.invalidateQueries({ queryKey: ['alerts'] })}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {alertsData?.alerts.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You haven't created any alerts yet. Click the + button to create your first alert.
        </Alert>
      )}

      <Grid container spacing={3}>
        {alertsData?.alerts.map((alert) => (
          <Grid xs={12} sm={6} md={4} key={alert.id}>
            <Card
              sx={{
                height: '100%',
                border: alert.triggered ? '2px solid' : '1px solid',
                borderColor: alert.triggered ? 'warning.main' : 'divider',
                bgcolor: alert.isActive ? 'background.paper' : 'action.hover',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ flex: 1 }}>
                    {alert.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleActive(alert)}
                      color={alert.isActive ? 'primary' : 'default'}
                    >
                      {alert.isActive ? <DeactivateIcon /> : <ActivateIcon />}
                    </IconButton>
                    <IconButton size="small" onClick={() => handleEditAlert(alert)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setDeleteConfirm(alert.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={formatAlertType(alert.type)}
                    color={getAlertTypeColor(alert.type)}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip
                    label={alert.asset}
                    variant="outlined"
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip
                    label={alert.isActive ? 'Active' : 'Inactive'}
                    color={alert.isActive ? 'success' : 'default'}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Target: {alert.value}
                  {alert.currentValue !== null && (
                    <> | Current: {alert.currentValue}</>
                  )}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Created {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                  </Typography>
                  {alert.triggered && (
                    <Chip
                      label={`Triggered ${alert.triggerCount}x`}
                      color="warning"
                      size="small"
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleCreateAlert}
      >
        <AddIcon />
      </Fab>

      {/* Create/Edit Alert Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          {editingAlert ? 'Edit Alert' : 'Create New Alert'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} onError={(e) => console.error('Form error:', e)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid xs={12}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Alert name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Alert Name"
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>

              <Grid xs={6}>
                <Controller
                  name="asset"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Asset"
                    >
                      {assets.map((asset) => (
                        <MenuItem key={asset} value={asset}>
                          {asset}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid xs={6}>
                <Controller
                  name="market"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Market"
                    >
                      <MenuItem value={MarketType.PERPETUAL}>Perpetual</MenuItem>
                      <MenuItem value={MarketType.SPOT}>Spot</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>

              <Grid xs={6}>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Alert Type"
                    >
                      {Object.values(AlertTypeEnum).map((type) => (
                        <MenuItem key={type} value={type}>
                          {formatAlertType(type)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid xs={6}>
                <Controller
                  name="condition"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Condition"
                    >
                      <MenuItem value={AlertCondition.GREATER_THAN}>Greater Than</MenuItem>
                      <MenuItem value={AlertCondition.LESS_THAN}>Less Than</MenuItem>
                      <MenuItem value={AlertCondition.EQUALS}>Equals</MenuItem>
                      <MenuItem value={AlertCondition.CROSSES_ABOVE}>Crosses Above</MenuItem>
                      <MenuItem value={AlertCondition.CROSSES_BELOW}>Crosses Below</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>

              <Grid xs={12}>
                <Controller
                  name="value"
                  control={control}
                  rules={{ required: 'Value is required', min: { value: 0, message: 'Value must be positive' } }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Target Value"
                      error={!!errors.value}
                      helperText={errors.value?.message}
                    />
                  )}
                />
              </Grid>

              <Grid xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Notification Channels
                </Typography>
                <Controller
                  name="notifyEmail"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <FormControlLabel
                      control={<Switch checked={value} onChange={onChange} />}
                      label="Email"
                    />
                  )}
                />
                <Controller
                  name="notifyInApp"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <FormControlLabel
                      control={<Switch checked={value} onChange={onChange} />}
                      label="In-App"
                    />
                  )}
                />
                <Controller
                  name="notifyWebhook"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <FormControlLabel
                      control={<Switch checked={value} onChange={onChange} />}
                      label="Webhook"
                    />
                  )}
                />
                <Controller
                  name="notifyDiscord"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <FormControlLabel
                      control={<Switch checked={value} onChange={onChange} />}
                      label="Discord"
                    />
                  )}
                />
                <Controller
                  name="notifyTelegram"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <FormControlLabel
                      control={<Switch checked={value} onChange={onChange} />}
                      label="Telegram"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={(e) => {
                console.log('Create Alert button clicked');
                console.log('Form errors:', errors);
                console.log('Mutation pending:', createMutation.isPending, updateMutation.isPending);
              }}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Creating...' : (editingAlert ? 'Update' : 'Create')} Alert
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Alert</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this alert? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};