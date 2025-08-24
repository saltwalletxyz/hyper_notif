import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Avatar,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Person,
  Security,
  AccountBalanceWallet,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

interface ProfileForm {
  name: string;
  walletAddress: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const SettingsPage: React.FC = () => {
  const { state: authState, updateProfile } = useAuth();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const profileForm = useForm<ProfileForm>({
    defaultValues: {
      name: authState.user?.name || '',
      walletAddress: authState.user?.walletAddress || '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) => apiService.updateProfile(data),
    onSuccess: (updatedUser) => {
      updateProfile({ name: updatedUser.name, walletAddress: updatedUser.walletAddress });
      setSuccessMessage('Profile updated successfully');
      setErrorMessage('');
    },
    onError: (error: any) => {
      setErrorMessage(error.message || 'Failed to update profile');
      setSuccessMessage('');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) => 
      apiService.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      setPasswordDialogOpen(false);
      passwordForm.reset();
      setSuccessMessage('Password changed successfully');
      setErrorMessage('');
    },
    onError: (error: any) => {
      setErrorMessage(error.message || 'Failed to change password');
      setSuccessMessage('');
    },
  });

  const onProfileSubmit = (data: ProfileForm) => {
    profileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }
    passwordMutation.mutate(data);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Settings
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Settings */}
        <Grid xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <Person />
                </Avatar>
                <Typography variant="h6" fontWeight="bold">
                  Profile Information
                </Typography>
              </Box>

              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                <TextField
                  fullWidth
                  label="Full Name"
                  margin="normal"
                  {...profileForm.register('name', {
                    required: 'Name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                  error={!!profileForm.formState.errors.name}
                  helperText={profileForm.formState.errors.name?.message}
                />

                <TextField
                  fullWidth
                  label="Email"
                  value={authState.user?.email || ''}
                  disabled
                  margin="normal"
                  helperText="Email cannot be changed"
                />

                <TextField
                  fullWidth
                  label="Hyperliquid Wallet Address"
                  margin="normal"
                  {...profileForm.register('walletAddress', {
                    pattern: {
                      value: /^0x[a-fA-F0-9]{40}$/,
                      message: 'Invalid wallet address format',
                    },
                  })}
                  error={!!profileForm.formState.errors.walletAddress}
                  helperText={
                    profileForm.formState.errors.walletAddress?.message ||
                    'Connect your Hyperliquid wallet to enable position and order monitoring'
                  }
                />

                <Button
                  type="submit"
                  variant="contained"
                  sx={{ mt: 2 }}
                  disabled={profileMutation.isPending}
                >
                  Update Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Security Settings */}
        <Grid xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                  <Security />
                </Avatar>
                <Typography variant="h6" fontWeight="bold">
                  Security Settings
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Keep your account secure by using a strong password and enabling 
                two-factor authentication when available.
              </Typography>

              <Button
                variant="outlined"
                onClick={() => setPasswordDialogOpen(true)}
                sx={{ mb: 2 }}
              >
                Change Password
              </Button>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                Account Information
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Account created: {authState.user?.createdAt ? 
                  new Date(authState.user.createdAt).toLocaleDateString() : 'Unknown'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Wallet Connection Status */}
        <Grid xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'info.main' }}>
                  <AccountBalanceWallet />
                </Avatar>
                <Typography variant="h6" fontWeight="bold">
                  Wallet Connection
                </Typography>
              </Box>

              {authState.user?.walletAddress ? (
                <Alert severity="success">
                  <Typography fontWeight="bold">
                    Wallet Connected
                  </Typography>
                  <Typography variant="body2">
                    Address: {authState.user.walletAddress}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    You can now receive alerts for position changes, order fills, 
                    and liquidation risks.
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="warning">
                  <Typography fontWeight="bold">
                    No Wallet Connected
                  </Typography>
                  <Typography variant="body2">
                    Connect your Hyperliquid wallet address above to enable advanced 
                    features like position monitoring, order tracking, and liquidation alerts.
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* API Information */}
        <Grid xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                API Information
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                This application uses the Hyperliquid public API to fetch market data, 
                positions, and trading information. No private keys or trading permissions 
                are required or stored.
              </Typography>

              <Typography variant="body2" color="text.secondary">
                All notifications are sent in real-time using WebSocket connections 
                to ensure you never miss important market movements or account changes.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
        <DialogTitle>Change Password</DialogTitle>
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
          <DialogContent>
            <TextField
              fullWidth
              type="password"
              label="Current Password"
              margin="normal"
              {...passwordForm.register('currentPassword', {
                required: 'Current password is required',
              })}
              error={!!passwordForm.formState.errors.currentPassword}
              helperText={passwordForm.formState.errors.currentPassword?.message}
            />

            <TextField
              fullWidth
              type="password"
              label="New Password"
              margin="normal"
              {...passwordForm.register('newPassword', {
                required: 'New password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: 'Password must contain uppercase, lowercase, and number',
                },
              })}
              error={!!passwordForm.formState.errors.newPassword}
              helperText={passwordForm.formState.errors.newPassword?.message}
            />

            <TextField
              fullWidth
              type="password"
              label="Confirm New Password"
              margin="normal"
              {...passwordForm.register('confirmPassword', {
                required: 'Please confirm your password',
              })}
              error={!!passwordForm.formState.errors.confirmPassword}
              helperText={passwordForm.formState.errors.confirmPassword?.message}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={passwordMutation.isPending}
            >
              Change Password
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};