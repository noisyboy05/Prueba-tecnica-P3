// TopBar — fixed app bar with breadcrumb + user actions

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const SIDEBAR_WIDTH = 240;

interface TopBarProps {
  height: number;
}

export const TopBar = ({ height }: TopBarProps): JSX.Element => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    void navigate('/login');
  };

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '';

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
        ml: `${SIDEBAR_WIDTH}px`,
        height,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ height: '100%', minHeight: `${height}px !important` }}>
        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            label={user?.role}
            size="small"
            sx={{
              bgcolor: user?.role === 'ADMIN' ? '#0F172A' : '#EFF6FF',
              color: user?.role === 'ADMIN' ? '#FFFFFF' : '#1D4ED8',
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
            }}
          />
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.main',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {initials}
          </Avatar>
          <Typography variant="body2" fontWeight={500} sx={{ display: { xs: 'none', sm: 'block' } }}>
            {user?.name}
          </Typography>
          <Button
            size="small"
            onClick={handleLogout}
            startIcon={<LogoutIcon sx={{ fontSize: '1rem !important' }} />}
            sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
