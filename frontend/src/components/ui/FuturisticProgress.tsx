import React from 'react';
import { Box, LinearProgress, styled, keyframes, Typography, useTheme } from '@mui/material';

const scanAnimation = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const glowPulse = keyframes`
  0%, 100% {
    box-shadow: 
      0 0 10px currentColor,
      inset 0 0 10px rgba(255, 255, 255, 0.1);
  }
  50% {
    box-shadow: 
      0 0 20px currentColor,
      0 0 30px currentColor,
      inset 0 0 20px rgba(255, 255, 255, 0.2);
  }
`;

interface FuturisticProgressProps {
  value: number;
  max?: number;
  label?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  animated?: boolean;
  showPercentage?: boolean;
  height?: number;
}

const StyledProgressContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  position: 'relative',
}));

const StyledProgress = styled(LinearProgress)<{ 
  progressColor: string; 
  animated: boolean; 
  progressHeight: number; 
}>(({ theme, progressColor, animated, progressHeight }) => {
  const isDark = theme.palette.mode === 'dark';
  
  return {
    height: progressHeight,
    borderRadius: progressHeight / 2,
    backgroundColor: isDark 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(0, 0, 0, 0.05)',
    border: isDark 
      ? '1px solid rgba(0, 245, 255, 0.2)' 
      : '1px solid rgba(0, 145, 234, 0.2)',
    overflow: 'hidden',
    position: 'relative',
    
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: isDark
        ? 'linear-gradient(90deg, transparent 0%, rgba(0, 245, 255, 0.1) 50%, transparent 100%)'
        : 'linear-gradient(90deg, transparent 0%, rgba(0, 145, 234, 0.1) 50%, transparent 100%)',
      backgroundSize: '200% 100%',
      animation: animated ? `${scanAnimation} 2s ease-in-out infinite` : 'none',
      pointerEvents: 'none',
    },
    
    '& .MuiLinearProgress-bar': {
      borderRadius: progressHeight / 2,
      background: progressColor,
      position: 'relative',
      overflow: 'hidden',
      animation: animated ? `${glowPulse} 2s ease-in-out infinite` : 'none',
      
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(
          90deg,
          transparent 0%,
          rgba(255, 255, 255, 0.3) 30%,
          rgba(255, 255, 255, 0.1) 70%,
          transparent 100%
        )`,
        backgroundSize: '200% 100%',
        animation: animated ? `${scanAnimation} 3s linear infinite` : 'none',
      },
    },
  };
});

const ProgressLabel = styled(Typography)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(1),
  fontSize: '0.875rem',
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

const PercentageText = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  fontWeight: 700,
  color: theme.palette.primary.main,
  textShadow: theme.palette.mode === 'dark' 
    ? '0 0 10px currentColor' 
    : 'none',
}));

export const FuturisticProgress: React.FC<FuturisticProgressProps> = ({
  value,
  max = 100,
  label,
  color = 'primary',
  animated = true,
  showPercentage = true,
  height = 12,
}) => {
  const theme = useTheme();
  const percentage = Math.min((value / max) * 100, 100);
  const isDark = theme.palette.mode === 'dark';
  
  const getProgressColor = (colorName: string, isDark: boolean) => {
    const colors = {
      primary: isDark 
        ? 'linear-gradient(45deg, #00F5FF 0%, #B388FF 100%)'
        : 'linear-gradient(45deg, #0091EA 0%, #7C4DFF 100%)',
      secondary: isDark
        ? 'linear-gradient(45deg, #FF1744 0%, #E91E63 100%)'
        : 'linear-gradient(45deg, #E91E63 0%, #AD1457 100%)',
      success: isDark
        ? 'linear-gradient(45deg, #00E676 0%, #69F0AE 100%)'
        : 'linear-gradient(45deg, #4CAF50 0%, #81C784 100%)',
      warning: isDark
        ? 'linear-gradient(45deg, #FFD740 0%, #FFFF72 100%)'
        : 'linear-gradient(45deg, #FF9800 0%, #FFB74D 100%)',
      error: isDark
        ? 'linear-gradient(45deg, #FF5722 0%, #FF8A65 100%)'
        : 'linear-gradient(45deg, #F44336 0%, #E57373 100%)',
    };
    return colors[colorName as keyof typeof colors] || colors.primary;
  };

  return (
    <StyledProgressContainer>
      {(label || showPercentage) && (
        <ProgressLabel>
          {label && <span>{label}</span>}
          {showPercentage && (
            <PercentageText>
              {percentage.toFixed(1)}%
            </PercentageText>
          )}
        </ProgressLabel>
      )}
      
      <StyledProgress
        variant="determinate"
        value={percentage}
        progressColor={getProgressColor(color, isDark)}
        animated={animated}
        progressHeight={height}
      />
    </StyledProgressContainer>
  );
};