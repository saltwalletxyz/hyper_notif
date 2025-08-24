import React from 'react';
import { Button, ButtonProps, styled, keyframes } from '@mui/material';

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 
      0 0 20px currentColor,
      0 4px 15px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow: 
      0 0 30px currentColor,
      0 0 40px currentColor,
      0 4px 20px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

interface GlowingButtonProps extends ButtonProps {
  glowColor?: string;
  animated?: boolean;
}

const StyledGlowingButton = styled(Button)<GlowingButtonProps>(({ theme, glowColor, animated = true }) => {
  const isDark = theme.palette.mode === 'dark';
  const primaryColor = glowColor || (isDark ? '#00F5FF' : '#0091EA');
  const secondaryColor = isDark ? '#B388FF' : '#7C4DFF';
  
  return {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '16px',
    padding: '12px 32px',
    fontSize: '1rem',
    fontWeight: 700,
    textTransform: 'none',
    letterSpacing: '0.5px',
    border: 'none',
    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
    color: '#FFFFFF',
    boxShadow: `
      0 0 20px ${primaryColor}40,
      0 4px 15px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      inset 0 -1px 0 rgba(0, 0, 0, 0.1)
    `,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: animated ? `linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.2) 50%,
        transparent 100%
      )` : 'none',
      transition: 'left 0.5s',
      pointerEvents: 'none',
    },
    
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '0',
      height: '0',
      background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
      borderRadius: '50%',
      transform: 'translate(-50%, -50%)',
      transition: 'all 0.3s ease',
      pointerEvents: 'none',
    },
    
    '&:hover': {
      transform: 'translateY(-2px) scale(1.05)',
      animation: animated ? `${pulseGlow} 2s ease-in-out infinite` : 'none',
      boxShadow: `
        0 0 30px ${primaryColor}60,
        0 0 50px ${primaryColor}40,
        0 8px 25px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.3),
        inset 0 -1px 0 rgba(0, 0, 0, 0.1)
      `,
      
      '&::before': {
        left: '100%',
      },
      
      '&::after': {
        width: '120%',
        height: '120%',
        opacity: 0,
      },
    },
    
    '&:active': {
      transform: 'translateY(0) scale(0.98)',
      boxShadow: `
        0 0 15px ${primaryColor}40,
        0 2px 8px rgba(0, 0, 0, 0.2),
        inset 0 2px 4px rgba(0, 0, 0, 0.1)
      `,
    },
    
    '&:disabled': {
      background: isDark ? '#2a2a2a' : '#e0e0e0',
      color: isDark ? '#666' : '#999',
      boxShadow: 'none',
      animation: 'none',
      transform: 'none',
      cursor: 'not-allowed',
    },
    
    // Ripple effect enhancement
    '& .MuiTouchRipple-root': {
      color: 'rgba(255, 255, 255, 0.3)',
    },
    
    // Focus styles
    '&:focus-visible': {
      outline: `2px solid ${primaryColor}`,
      outlineOffset: '2px',
    },
  };
});

export const GlowingButton: React.FC<GlowingButtonProps> = ({ 
  children, 
  glowColor, 
  animated = true, 
  ...props 
}) => {
  return (
    <StyledGlowingButton 
      glowColor={glowColor} 
      animated={animated} 
      {...props}
    >
      {children}
    </StyledGlowingButton>
  );
};