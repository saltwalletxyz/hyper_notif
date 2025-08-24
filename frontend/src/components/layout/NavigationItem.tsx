import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Box,
} from '@mui/material';

interface NavigationItemProps {
  text: string;
  icon: React.ReactElement;
  path: string;
  badge?: number;
  onClick?: () => void;
}

export const NavigationItem: React.FC<NavigationItemProps> = ({
  text,
  icon,
  path,
  badge,
  onClick,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === path;

  const handleClick = () => {
    navigate(path);
    onClick?.();
  };

  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <ListItemButton
        onClick={handleClick}
        sx={{
          borderRadius: 2,
          minHeight: 48,
          bgcolor: isActive ? 'primary.main' : 'transparent',
          color: isActive ? 'primary.contrastText' : 'text.primary',
          '&:hover': {
            bgcolor: isActive ? 'primary.dark' : 'action.hover',
          },
          '&.Mui-selected': {
            bgcolor: 'primary.main',
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 40,
            color: 'inherit',
          }}
        >
          {badge ? (
            <Badge badgeContent={badge} color="error" max={999}>
              {icon}
            </Badge>
          ) : (
            icon
          )}
        </ListItemIcon>
        <ListItemText
          primary={text}
          primaryTypographyProps={{
            fontWeight: isActive ? 600 : 400,
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};