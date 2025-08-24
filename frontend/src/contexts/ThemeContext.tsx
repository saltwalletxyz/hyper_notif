import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createTheme, ThemeProvider, Theme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

interface ThemeContextProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const createFuturisticTheme = (isDark: boolean) => {
  const primaryColor = isDark ? '#00F5FF' : '#1565C0';
  const secondaryColor = isDark ? '#FF1744' : '#C2185B';
  const accentColor = isDark ? '#B388FF' : '#512DA8';
  const successColor = isDark ? '#00E676' : '#2E7D32';
  const warningColor = isDark ? '#FFD740' : '#F57C00';
  const errorColor = isDark ? '#FF5722' : '#D32F2F';

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: primaryColor,
        light: isDark ? '#4DFFFF' : '#1976D2',
        dark: isDark ? '#00BCD4' : '#0D47A1',
        contrastText: isDark ? '#000000' : '#FFFFFF',
      },
      secondary: {
        main: secondaryColor,
        light: isDark ? '#FF5983' : '#F06292',
        dark: isDark ? '#C51162' : '#AD1457',
        contrastText: '#FFFFFF',
      },
      background: {
        default: isDark ? '#0A0A0F' : '#F8F9FA',
        paper: isDark ? 'rgba(16, 18, 27, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      },
      text: {
        primary: isDark ? '#FFFFFF' : '#1A1A1A',
        secondary: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
      },
      success: {
        main: successColor,
        light: isDark ? '#69F0AE' : '#81C784',
        dark: isDark ? '#00C853' : '#388E3C',
      },
      warning: {
        main: warningColor,
        light: isDark ? '#FFFF72' : '#FFB74D',
        dark: isDark ? '#FFC107' : '#F57C00',
      },
      error: {
        main: errorColor,
        light: isDark ? '#FF8A65' : '#E57373',
        dark: isDark ? '#D32F2F' : '#C62828',
      },
      divider: isDark ? 'rgba(0, 245, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        letterSpacing: '-0.01562em',
        background: isDark 
          ? 'linear-gradient(45deg, #00F5FF 30%, #B388FF 90%)'
          : 'linear-gradient(45deg, #0091EA 30%, #7C4DFF 90%)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      },
      h4: {
        fontSize: '2.125rem',
        fontWeight: 600,
        letterSpacing: '0.00735em',
      },
      h6: {
        fontSize: '1.25rem',
        fontWeight: 600,
        letterSpacing: '0.0075em',
      },
      body1: {
        fontSize: '1rem',
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: '0.00938em',
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0.02857em',
      },
    },
    shape: {
      borderRadius: 16,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: isDark 
              ? 'radial-gradient(ellipse at top, rgba(16, 18, 27, 1) 0%, rgba(10, 10, 15, 1) 100%)'
              : 'radial-gradient(ellipse at top, rgba(248, 249, 250, 1) 0%, rgba(233, 236, 239, 1) 100%)',
            backgroundAttachment: 'fixed',
            minHeight: '100vh',
            overflow: 'overlay',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: isDark 
                ? 'linear-gradient(180deg, #00F5FF 0%, #B388FF 100%)'
                : 'linear-gradient(180deg, #0091EA 0%, #7C4DFF 100%)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: isDark 
                ? 'linear-gradient(180deg, #4DFFFF 0%, #E1BEE7 100%)'
                : 'linear-gradient(180deg, #40C4FF 0%, #9575CD 100%)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            background: isDark
              ? 'linear-gradient(145deg, rgba(16, 18, 27, 0.95) 0%, rgba(20, 25, 40, 0.95) 100%)'
              : 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: isDark 
              ? '1px solid rgba(0, 245, 255, 0.2)'
              : '1px solid rgba(0, 145, 234, 0.2)',
            boxShadow: isDark
              ? '0 8px 32px 0 rgba(0, 245, 255, 0.15), 0 0 0 1px rgba(0, 245, 255, 0.05)'
              : '0 8px 32px 0 rgba(0, 145, 234, 0.15), 0 0 0 1px rgba(0, 145, 234, 0.05)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: isDark
                ? '0 12px 48px 0 rgba(0, 245, 255, 0.25), 0 0 0 1px rgba(0, 245, 255, 0.1)'
                : '0 12px 48px 0 rgba(0, 145, 234, 0.25), 0 0 0 1px rgba(0, 145, 234, 0.1)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
            padding: '10px 24px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
              transition: 'left 0.5s',
            },
            '&:hover::before': {
              left: '100%',
            },
          },
          contained: {
            background: isDark
              ? 'linear-gradient(45deg, #00F5FF 30%, #B388FF 90%)'
              : 'linear-gradient(45deg, #0091EA 30%, #7C4DFF 90%)',
            boxShadow: isDark
              ? '0 4px 20px 0 rgba(0, 245, 255, 0.4)'
              : '0 4px 20px 0 rgba(0, 145, 234, 0.4)',
            '&:hover': {
              boxShadow: isDark
                ? '0 6px 30px 0 rgba(0, 245, 255, 0.6)'
                : '0 6px 30px 0 rgba(0, 145, 234, 0.6)',
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              background: isDark
                ? 'rgba(0, 245, 255, 0.08)'
                : 'rgba(0, 145, 234, 0.08)',
              transform: 'scale(1.05)',
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 8,
            borderRadius: 5,
            backgroundColor: isDark
              ? 'rgba(0, 245, 255, 0.1)'
              : 'rgba(0, 145, 234, 0.1)',
          },
          bar: {
            borderRadius: 5,
            background: isDark
              ? 'linear-gradient(45deg, #00F5FF 30%, #B388FF 90%)'
              : 'linear-gradient(45deg, #0091EA 30%, #7C4DFF 90%)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(10px)',
            border: isDark 
              ? '1px solid rgba(0, 245, 255, 0.3)'
              : '1px solid rgba(0, 145, 234, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: isDark
                ? '0 4px 20px 0 rgba(0, 245, 255, 0.3)'
                : '0 4px 20px 0 rgba(0, 145, 234, 0.3)',
            },
          },
        },
      },
    },
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
    },
  });
};

interface FuturisticThemeProviderProps {
  children: ReactNode;
}

export const FuturisticThemeProvider: React.FC<FuturisticThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('themeMode');
    return saved ? JSON.parse(saved) : true; // Default to dark mode
  });

  const theme = React.useMemo(() => createFuturisticTheme(isDarkMode), [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('themeMode', JSON.stringify(newMode));
      return newMode;
    });
  };

  useEffect(() => {
    localStorage.setItem('themeMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};