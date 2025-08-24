import React from 'react';
import { Card, CardProps, styled, keyframes } from '@mui/material';

const shimmerAnimation = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(0, 245, 255, 0.2);
  }
  50% {
    box-shadow: 0 0 40px rgba(0, 245, 255, 0.4), 0 0 60px rgba(179, 136, 255, 0.3);
  }
`;

const floatAnimation = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-5px);
  }
`;

interface AnimatedCardProps extends Omit<CardProps, 'variant'> {
  variant?: 'default' | 'glow' | 'float' | 'shimmer';
  glowColor?: string;
}

const StyledAnimatedCard = styled(Card)<AnimatedCardProps>(({ theme, variant = 'default', glowColor }) => {
  const isDark = theme.palette.mode === 'dark';
  
  const baseStyles = {
    position: 'relative' as const,
    overflow: 'hidden',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    cursor: 'pointer',
    
    '&::before': {
      content: '""',
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: isDark 
        ? 'linear-gradient(135deg, rgba(0, 245, 255, 0.05) 0%, rgba(179, 136, 255, 0.05) 100%)'
        : 'linear-gradient(135deg, rgba(0, 145, 234, 0.05) 0%, rgba(124, 77, 255, 0.05) 100%)',
      opacity: 0,
      transition: 'opacity 0.3s ease',
      pointerEvents: 'none' as const,
    },
    
    '&:hover::before': {
      opacity: 1,
    },
  };

  const variantStyles = {
    default: {
      '&:hover': {
        transform: 'translateY(-8px) scale(1.02)',
      },
    },
    
    glow: {
      border: isDark 
        ? `1px solid ${glowColor || 'rgba(0, 245, 255, 0.3)'}`
        : `1px solid ${glowColor || 'rgba(0, 145, 234, 0.3)'}`,
      
      '&:hover': {
        transform: 'translateY(-8px)',
        animation: `${pulseGlow} 2s ease-in-out infinite`,
        boxShadow: isDark
          ? `0 20px 40px -12px ${glowColor || 'rgba(0, 245, 255, 0.4)'}, 0 0 0 1px ${glowColor || 'rgba(0, 245, 255, 0.2)'}`
          : `0 20px 40px -12px ${glowColor || 'rgba(0, 145, 234, 0.4)'}, 0 0 0 1px ${glowColor || 'rgba(0, 145, 234, 0.2)'}`,
      },
    },
    
    float: {
      animation: `${floatAnimation} 3s ease-in-out infinite`,
      '&:hover': {
        animation: 'none',
        transform: 'translateY(-12px) scale(1.05)',
      },
    },
    
    shimmer: {
      '&::after': {
        content: '""',
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `linear-gradient(
          90deg,
          transparent 0%,
          ${isDark ? 'rgba(0, 245, 255, 0.1)' : 'rgba(0, 145, 234, 0.1)'} 50%,
          transparent 100%
        )`,
        transform: 'translateX(-100%)',
        transition: 'transform 0.6s',
        pointerEvents: 'none' as const,
      },
      
      '&:hover::after': {
        animation: `${shimmerAnimation} 1s ease-in-out`,
      },
      
      '&:hover': {
        transform: 'translateY(-6px)',
      },
    },
  };

  const selectedVariantStyles = variantStyles[variant as keyof typeof variantStyles] || variantStyles.default;
  
  return {
    ...baseStyles,
    ...selectedVariantStyles,
  };
});

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  children, 
  variant = 'default',
  glowColor,
  ...props 
}) => {
  return (
    <StyledAnimatedCard variant={variant} glowColor={glowColor} {...props}>
      {children}
    </StyledAnimatedCard>
  );
};