import React from 'react';
import { IconButton, Tooltip, styled, keyframes } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext';

const glowAnimation = keyframes`
  0% {
    box-shadow: 0 0 5px currentColor;
  }
  50% {
    box-shadow: 0 0 20px currentColor, 0 0 30px currentColor;
  }
  100% {
    box-shadow: 0 0 5px currentColor;
  }
`;

const rotateAnimation = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const StyledToggleButton = styled(IconButton)(({ theme }) => ({
  position: 'relative',
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(45deg, #00F5FF 30%, #B388FF 90%)'
    : 'linear-gradient(45deg, #0091EA 30%, #7C4DFF 90%)',
  border: theme.palette.mode === 'dark'
    ? '2px solid rgba(0, 245, 255, 0.3)'
    : '2px solid rgba(0, 145, 234, 0.3)',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 4px 20px 0 rgba(0, 245, 255, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.1)'
    : '0 4px 20px 0 rgba(0, 145, 234, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.1)',
  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  overflow: 'hidden',
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: theme.palette.mode === 'dark'
      ? 'radial-gradient(circle at 50% 50%, rgba(0, 245, 255, 0.1) 0%, transparent 70%)'
      : 'radial-gradient(circle at 50% 50%, rgba(0, 145, 234, 0.1) 0%, transparent 70%)',
    borderRadius: '50%',
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  
  '& .MuiSvgIcon-root': {
    fontSize: '1.5rem',
    color: '#FFFFFF',
    transition: 'all 0.3s ease',
    filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))',
    zIndex: 1,
    position: 'relative',
  },
  
  '&:hover': {
    transform: 'scale(1.1) rotate(10deg)',
    animation: `${glowAnimation} 2s ease-in-out infinite`,
    boxShadow: theme.palette.mode === 'dark'
      ? '0 8px 40px 0 rgba(0, 245, 255, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.2)'
      : '0 8px 40px 0 rgba(0, 145, 234, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.2)',
    
    '&::before': {
      opacity: 1,
    },
    
    '& .MuiSvgIcon-root': {
      animation: `${rotateAnimation} 0.8s ease-in-out`,
      filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 1))',
    },
  },
  
  '&:active': {
    transform: 'scale(0.95)',
  },
}));

const ParticleEffect = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '2px',
  height: '2px',
  background: theme.palette.mode === 'dark' ? '#00F5FF' : '#0091EA',
  borderRadius: '50%',
  opacity: 0,
  pointerEvents: 'none',
  
  '&.animate': {
    animation: `
      ${keyframes`
        0% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(0);
        }
        50% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0);
        }
      `} 0.6s ease-out
    `,
  },
}));

export const ThemeToggle: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [showParticles, setShowParticles] = React.useState(false);

  const handleToggle = () => {
    setShowParticles(true);
    toggleTheme();
    
    // Reset particle animation
    setTimeout(() => setShowParticles(false), 600);
  };

  return (
    <Tooltip 
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      placement="bottom"
    >
      <StyledToggleButton
        onClick={handleToggle}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkMode ? <Brightness7 /> : <Brightness4 />}
        
        {/* Particle effects */}
        {[...Array(8)].map((_, i) => (
          <ParticleEffect
            key={i}
            className={showParticles ? 'animate' : ''}
            style={{
              animationDelay: `${i * 0.1}s`,
              transform: `
                translate(-50%, -50%) 
                rotate(${i * 45}deg) 
                translateY(-20px)
              `,
            }}
          />
        ))}
      </StyledToggleButton>
    </Tooltip>
  );
};