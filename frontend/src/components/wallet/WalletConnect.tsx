import React, { useState, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  AccountBalanceWallet,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { ethers } from 'ethers';

interface WalletConnectProps {
  open: boolean;
  onClose: () => void;
  onWalletConnected: (walletData: WalletConnectionData) => void;
}

interface WalletConnectionData {
  address: string;
  walletType: string;
  chainId: number;
}

interface WalletProvider {
  name: string;
  icon: string;
  provider: any;
  detect: () => boolean;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ open, onClose, onWalletConnected }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<WalletConnectionData | null>(null);

  // Wallet providers configuration
  const walletProviders: WalletProvider[] = [
    {
      name: 'MetaMask',
      icon: '🦊',
      provider: (window as any).ethereum,
      detect: () => typeof (window as any).ethereum !== 'undefined' && (window as any).ethereum.isMetaMask,
    },
    {
      name: 'Coinbase Wallet',
      icon: '🔵',
      provider: (window as any).ethereum,
      detect: () => typeof (window as any).ethereum !== 'undefined' && (window as any).ethereum.isCoinbaseWallet,
    },
    {
      name: 'Trust Wallet',
      icon: '🔷',
      provider: (window as any).ethereum,
      detect: () => typeof (window as any).ethereum !== 'undefined' && (window as any).ethereum.isTrust,
    },
  ];

  const connectWallet = useCallback(async (walletProvider: WalletProvider) => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!walletProvider.detect()) {
        throw new Error(`${walletProvider.name} not detected. Please install the extension.`);
      }

      // Request account access
      const accounts = await walletProvider.provider.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
      }

      // Get chain ID
      const chainId = await walletProvider.provider.request({
        method: 'eth_chainId',
      });

      // Validate Ethereum address
      const address = ethers.getAddress(accounts[0]); // This will throw if invalid
      
      const walletData: WalletConnectionData = {
        address: address.toLowerCase(), // Store as lowercase for consistency
        walletType: walletProvider.name,
        chainId: parseInt(chainId, 16),
      };

      setConnectedWallet(walletData);
      
      // Call parent callback after short delay for better UX
      setTimeout(() => {
        onWalletConnected(walletData);
      }, 1500);

    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, [onWalletConnected]);

  const handleClose = useCallback(() => {
    if (!isConnecting) {
      setError(null);
      setConnectedWallet(null);
      onClose();
    }
  }, [isConnecting, onClose]);

  // Handle account changes
  React.useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setConnectedWallet(null);
        setError('Wallet disconnected');
      }
    };

    const handleChainChanged = (chainId: string) => {
      // Force page reload on chain change for safety
      window.location.reload();
    };

    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
      (window as any).ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if ((window as any).ethereum) {
        (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
        (window as any).ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountBalanceWallet />
          <Typography variant="h6" fontWeight="bold">
            Connect Your Wallet
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(211, 47, 47, 0.1)' }}>
            {error}
          </Alert>
        )}

        {connectedWallet ? (
          <Card sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
            <CardContent sx={{ textAlign: 'center', color: 'white' }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: '#4caf50', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Wallet Connected Successfully!
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
                {connectedWallet.walletType}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {connectedWallet.address}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 1 }}>
                Chain ID: {connectedWallet.chainId}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <>
            <Typography variant="body1" sx={{ mb: 3, textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>
              Connect your decentralized wallet to access your Hyperliquid trading data and create personalized alerts.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {walletProviders.map((provider) => (
                <Card 
                  key={provider.name}
                  sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    cursor: provider.detect() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    '&:hover': provider.detect() ? {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      transform: 'translateY(-2px)',
                    } : {},
                    opacity: provider.detect() ? 1 : 0.5,
                  }}
                  onClick={() => provider.detect() && !isConnecting && connectWallet(provider)}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontSize: 24 }}>{provider.icon}</Typography>
                      <Box>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          {provider.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          {provider.detect() ? 'Available' : 'Not installed'}
                        </Typography>
                      </Box>
                    </Box>
                    {isConnecting ? (
                      <CircularProgress size={24} sx={{ color: 'white' }} />
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={!provider.detect()}
                        sx={{
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                          color: 'white',
                          '&:hover': {
                            borderColor: 'white',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          },
                        }}
                      >
                        Connect
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Divider sx={{ my: 3, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

            <Alert 
              severity="info" 
              sx={{ 
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                color: 'rgba(255, 255, 255, 0.9)',
                '& .MuiAlert-icon': { color: '#2196f3' }
              }}
            >
              <Typography variant="body2">
                <strong>New to crypto wallets?</strong><br />
                We recommend MetaMask for beginners. It's secure, easy to use, and supports all features.
              </Typography>
            </Alert>
          </>
        )}
      </DialogContent>

      {!connectedWallet && (
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleClose}
            variant="outlined"
            sx={{ 
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: 'white',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default WalletConnect;