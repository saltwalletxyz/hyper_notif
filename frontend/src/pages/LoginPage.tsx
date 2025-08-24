import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  keyframes,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  AccountBalanceWallet,
  DarkMode,
  LightMode,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { AnimatedCard } from '../components/ui/AnimatedCard';
import { GlowingButton } from '../components/ui/GlowingButton';
import WalletConnect from '../components/wallet/WalletConnect';

// Animations
const floatAnimation = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(0, 245, 255, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(0, 245, 255, 0.6);
  }
`;

const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

interface LoginForm {
  email: string;
  password: string;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, state, walletLogin } = useAuth();
  const { state: walletState } = useWallet();
  const { isDarkMode, toggleTheme } = useCustomTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // Theme-aware colors
  const getThemeColors = () => {
    if (isDarkMode) {
      return {
        primary: '#00F5FF',
        secondary: '#B388FF',
        primaryGradient: 'linear-gradient(135deg, #00F5FF 0%, #B388FF 100%)',
        backgroundGradient: 'radial-gradient(ellipse at top, rgba(16, 18, 27, 1) 0%, rgba(10, 10, 15, 1) 100%)',
        cardBackground: 'linear-gradient(145deg, rgba(16, 18, 27, 0.95) 0%, rgba(20, 25, 40, 0.95) 100%)',
        cardBorder: 'rgba(0, 245, 255, 0.2)',
        textPrimary: '#FFFFFF',
        textSecondary: 'rgba(255, 255, 255, 0.7)',
      };
    } else {
      return {
        primary: '#1565C0',
        secondary: '#512DA8',
        primaryGradient: 'linear-gradient(135deg, #1565C0 0%, #512DA8 100%)',
        backgroundGradient: 'radial-gradient(ellipse at top, rgba(248, 249, 250, 1) 0%, rgba(233, 236, 239, 1) 100%)',
        cardBackground: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
        cardBorder: 'rgba(21, 101, 192, 0.3)',
        textPrimary: '#1A1A1A',
        textSecondary: 'rgba(0, 0, 0, 0.6)',
      };
    }
  };

  const themeColors = getThemeColors();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError('');
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    }
  };

  const handleWalletConnected = async (walletData: { address: string; walletType: string; chainId: number }) => {
    setError('');
    try {
      await walletLogin(walletData.address, walletData.walletType);
      setWalletModalOpen(false);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Wallet login failed. Please try again.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: themeColors.backgroundGradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 3,
        position: 'relative',
        overflow: 'hidden',
        // Floating particles background
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDarkMode
            ? `radial-gradient(circle at 20% 80%, rgba(0, 245, 255, 0.1) 0%, transparent 50%),
               radial-gradient(circle at 80% 20%, rgba(179, 136, 255, 0.1) 0%, transparent 50%),
               radial-gradient(circle at 40% 40%, rgba(255, 23, 68, 0.05) 0%, transparent 50%)`
            : `radial-gradient(circle at 20% 80%, rgba(21, 101, 192, 0.1) 0%, transparent 50%),
               radial-gradient(circle at 80% 20%, rgba(81, 45, 168, 0.1) 0%, transparent 50%),
               radial-gradient(circle at 40% 40%, rgba(194, 24, 91, 0.05) 0%, transparent 50%)`,
          animation: `${floatAnimation} 6s ease-in-out infinite`,
          pointerEvents: 'none',
        },
      }}
    >
      {/* Theme Toggle Button - Fixed Position */}
      <IconButton
        onClick={toggleTheme}
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1000,
          backgroundColor: isDarkMode ? 'rgba(0, 245, 255, 0.1)' : 'rgba(21, 101, 192, 0.1)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${isDarkMode ? 'rgba(0, 245, 255, 0.3)' : 'rgba(21, 101, 192, 0.3)'}`,
          color: isDarkMode ? '#00F5FF' : '#1565C0',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: isDarkMode ? 'rgba(0, 245, 255, 0.2)' : 'rgba(21, 101, 192, 0.2)',
            transform: 'scale(1.05)',
            boxShadow: `0 4px 20px ${isDarkMode ? 'rgba(0, 245, 255, 0.3)' : 'rgba(21, 101, 192, 0.3)'}`,
          },
        }}
      >
        {isDarkMode ? <LightMode /> : <DarkMode />}
      </IconButton>

      <Container maxWidth="sm">
        <AnimatedCard
          variant="glow"
          glowColor={themeColors.primary + '40'}
          sx={{
            p: 4,
            borderRadius: 4,
            backdropFilter: 'blur(20px)',
            background: themeColors.cardBackground,
            border: `1px solid ${themeColors.cardBorder}`,
            animation: `${slideInUp} 0.8s ease-out`,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: `linear-gradient(90deg, transparent, rgba(255, 255, 255, ${isDarkMode ? 0.1 : 0.2}), transparent)`,
              animation: `${shimmer} 3s ease-in-out infinite`,
              pointerEvents: 'none',
            },
          }}
        >
          <Box 
            sx={{ 
              textAlign: 'center', 
              mb: 4,
              animation: `${slideInUp} 0.8s ease-out 0.2s both`,
            }}
          >
            <Typography
              variant="h3"
              fontWeight="bold"
              sx={{
                background: isDarkMode 
                  ? 'linear-gradient(135deg, #00F5FF 0%, #B388FF 100%)'
                  : themeColors.primaryGradient,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
                animation: isDarkMode ? `${pulseGlow} 3s ease-in-out infinite` : 'none',
                fontSize: { xs: '2rem', md: '3rem' },
                letterSpacing: '0.5px',
                textShadow: isDarkMode ? '0 0 30px rgba(0, 245, 255, 0.3)' : 'none',
                border: 'none !important',
                outline: 'none !important',
                boxShadow: 'none !important',
                textDecoration: 'none !important',
                '&:before, &:after': {
                  border: 'none !important',
                },
                '&:focus, &:hover, &:active': {
                  border: 'none !important',
                  outline: 'none !important',
                  boxShadow: 'none !important',
                },
              }}
            >
              Hyperliquid Notify
            </Typography>
            <Typography 
              variant="h6" 
              sx={{
                color: themeColors.textSecondary,
                fontSize: '1.1rem',
                fontWeight: 400,
              }}
            >
              Sign in to your account
            </Typography>
          </Box>

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                animation: `${slideInUp} 0.5s ease-out`,
                borderRadius: 2,
                backgroundColor: isDarkMode ? 'rgba(255, 87, 34, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                color: isDarkMode ? '#FF8A65' : '#D32F2F',
                border: `1px solid ${isDarkMode ? 'rgba(255, 87, 34, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
                '& .MuiAlert-icon': {
                  color: isDarkMode ? '#FF8A65' : '#D32F2F',
                },
              }}
            >
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{
              animation: `${slideInUp} 0.8s ease-out 0.4s both`,
            }}
          >
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              variant="outlined"
              placeholder="Enter your email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: themeColors.primary }} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 2,
                  backgroundColor: 'transparent',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 12px ${themeColors.primary}20`,
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'transparent',
                    boxShadow: `0 0 0 2px ${themeColors.primary}40`,
                  },
                },
              }}
              InputLabelProps={{
                sx: {
                  color: themeColors.textSecondary,
                  '&.Mui-focused': {
                    color: themeColors.primary,
                  },
                },
              }}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: themeColors.cardBorder,
                    transition: 'border-color 0.3s ease',
                  },
                  '&:hover fieldset': {
                    borderColor: themeColors.primary + '80',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: themeColors.primary,
                  },
                },
                '& .MuiInputBase-input': {
                  color: themeColors.textPrimary,
                  '&::placeholder': {
                    color: themeColors.textSecondary,
                    opacity: 0.8,
                  },
                  '&:-webkit-autofill': {
                    WebkitBoxShadow: `0 0 0 1000px ${isDarkMode ? 'rgba(16, 18, 27, 1)' : 'rgba(255, 255, 255, 1)'} inset !important`,
                    WebkitTextFillColor: `${themeColors.textPrimary} !important`,
                    transition: 'background-color 5000s ease-in-out 0s',
                  },
                  '&:-webkit-autofill:hover': {
                    WebkitBoxShadow: `0 0 0 1000px ${isDarkMode ? 'rgba(16, 18, 27, 1)' : 'rgba(255, 255, 255, 1)'} inset !important`,
                    WebkitTextFillColor: `${themeColors.textPrimary} !important`,
                  },
                  '&:-webkit-autofill:focus': {
                    WebkitBoxShadow: `0 0 0 1000px ${isDarkMode ? 'rgba(16, 18, 27, 1)' : 'rgba(255, 255, 255, 1)'} inset !important`,
                    WebkitTextFillColor: `${themeColors.textPrimary} !important`,
                  },
                },
                '& .MuiFormHelperText-root': {
                  color: isDarkMode ? '#FF8A65' : '#D32F2F',
                },
              }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              margin="normal"
              variant="outlined"
              placeholder="Enter your password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: themeColors.primary }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{
                        color: themeColors.textSecondary,
                        '&:hover': {
                          color: themeColors.primary,
                        },
                      }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 2,
                  backgroundColor: 'transparent',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 12px ${themeColors.primary}20`,
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'transparent',
                    boxShadow: `0 0 0 2px ${themeColors.primary}40`,
                  },
                },
              }}
              InputLabelProps={{
                sx: {
                  color: themeColors.textSecondary,
                  '&.Mui-focused': {
                    color: themeColors.primary,
                  },
                },
              }}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: themeColors.cardBorder,
                    transition: 'border-color 0.3s ease',
                  },
                  '&:hover fieldset': {
                    borderColor: themeColors.primary + '80',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: themeColors.primary,
                  },
                },
                '& .MuiInputBase-input': {
                  color: themeColors.textPrimary,
                  '&::placeholder': {
                    color: themeColors.textSecondary,
                    opacity: 0.8,
                  },
                  '&:-webkit-autofill': {
                    WebkitBoxShadow: `0 0 0 1000px ${isDarkMode ? 'rgba(16, 18, 27, 1)' : 'rgba(255, 255, 255, 1)'} inset !important`,
                    WebkitTextFillColor: `${themeColors.textPrimary} !important`,
                    transition: 'background-color 5000s ease-in-out 0s',
                  },
                  '&:-webkit-autofill:hover': {
                    WebkitBoxShadow: `0 0 0 1000px ${isDarkMode ? 'rgba(16, 18, 27, 1)' : 'rgba(255, 255, 255, 1)'} inset !important`,
                    WebkitTextFillColor: `${themeColors.textPrimary} !important`,
                  },
                  '&:-webkit-autofill:focus': {
                    WebkitBoxShadow: `0 0 0 1000px ${isDarkMode ? 'rgba(16, 18, 27, 1)' : 'rgba(255, 255, 255, 1)'} inset !important`,
                    WebkitTextFillColor: `${themeColors.textPrimary} !important`,
                  },
                },
                '& .MuiFormHelperText-root': {
                  color: isDarkMode ? '#FF8A65' : '#D32F2F',
                },
              }}
            />

            <GlowingButton
              type="submit"
              fullWidth
              size="large"
              disabled={isSubmitting || state.isLoading}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 2,
                background: themeColors.primaryGradient,
                color: '#FFFFFF',
                boxShadow: `0 4px 20px ${themeColors.primary}40`,
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 30px ${themeColors.primary}60`,
                },
                '&:active': {
                  transform: 'translateY(0px)',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                  transition: 'left 0.5s',
                },
                '&:hover::before': {
                  left: '100%',
                },
              }}
            >
              {isSubmitting || state.isLoading ? 'Signing In...' : 'Sign In'}
            </GlowingButton>

            <Divider 
              sx={{ 
                my: 3,
                '&::before, &::after': {
                  borderColor: themeColors.cardBorder,
                },
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  color: themeColors.textSecondary,
                  fontWeight: 500,
                  px: 2,
                }}
              >
                OR
              </Typography>
            </Divider>

            <GlowingButton
              fullWidth
              size="large"
              variant="outlined"
              onClick={() => setWalletModalOpen(true)}
              disabled={state.isLoading}
              startIcon={<AccountBalanceWallet />}
              sx={{
                mb: 2,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 2,
                border: `2px solid ${themeColors.primary}`,
                color: themeColors.primary,
                backgroundColor: 'transparent',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: themeColors.primary + '10',
                  borderColor: themeColors.primary,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 25px ${themeColors.primary}30`,
                },
                '&:active': {
                  transform: 'translateY(0px)',
                },
              }}
            >
              Connect Wallet
            </GlowingButton>

            <Box 
              sx={{ 
                textAlign: 'center',
                animation: `${slideInUp} 0.8s ease-out 0.8s both`,
              }}
            >
              <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                Don't have an account?{' '}
                <Link
                  component={RouterLink}
                  to="/register"
                  sx={{
                    color: themeColors.primary,
                    fontWeight: 600,
                    textDecoration: 'none',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      textDecoration: 'none',
                      textShadow: isDarkMode ? `0 0 8px ${themeColors.primary}80` : 'none',
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: -2,
                      left: 0,
                      width: 0,
                      height: 2,
                      background: themeColors.primaryGradient,
                      transition: 'width 0.3s ease',
                    },
                    '&:hover::after': {
                      width: '100%',
                    },
                  }}
                >
                  Sign up
                </Link>
              </Typography>
            </Box>
          </Box>

          <Box 
            sx={{ 
              mt: 4, 
              textAlign: 'center',
              animation: `${slideInUp} 0.8s ease-out 1s both`,
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: themeColors.textSecondary,
                fontSize: '0.875rem',
                fontStyle: 'italic',
              }}
            >
              Advanced notification system for Hyperliquid traders
            </Typography>
          </Box>
        </AnimatedCard>

        <WalletConnect
          open={walletModalOpen}
          onClose={() => setWalletModalOpen(false)}
          onWalletConnected={handleWalletConnected}
        />
      </Container>
    </Box>
  );
};