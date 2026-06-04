// Sidebar — permanent navigation drawer with role-aware menu items
// Dark background (#1A1A1A) with white text — premium executive look

import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { Link, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/SpaceDashboard';
import LayersIcon from '@mui/icons-material/Layers';
import RepeatIcon from '@mui/icons-material/Repeat';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  width: number;
}

const ADMIN_NAV = [
  { label: 'Dashboard',     icon: <DashboardIcon />,    path: '/dashboard' },
  { label: 'Plans',         icon: <LayersIcon />,       path: '/plans' },
  { label: 'Subscriptions', icon: <RepeatIcon />,       path: '/subscriptions' },
  { label: 'Invoices',      icon: <ReceiptLongIcon />,  path: '/invoices' },
];

const CLIENT_NAV = [
  { label: 'Subscription', icon: <RepeatIcon />,      path: '/subscriptions' },
  { label: 'Invoices',     icon: <ReceiptLongIcon />,  path: '/invoices' },
];

export const Sidebar = ({ width }: SidebarProps): JSX.Element => {
  const { user } = useAuth();
  const location = useLocation();
  const navItems = user?.role === 'ADMIN' ? ADMIN_NAV : CLIENT_NAV;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          backgroundColor: '#1A1A1A',
          color: '#FFFFFF',
          border: 'none',
        },
      }}
    >
      {/* Brand */}
      <Box sx={{ px: 3, py: 3, pb: 2 }}>
        <Typography variant="h6" fontWeight={700} color="#FFFFFF" letterSpacing="-0.3px">
          SaaS Flow
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block' }}>
          {user?.role === 'ADMIN' ? 'Admin Portal' : 'Client Portal'}
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2, mb: 1 }} />

      <List sx={{ px: 1.5 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                sx={{
                  borderRadius: 2,
                  color: active ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                  backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: '#FFFFFF',
                  },
                  transition: 'all 0.15s ease',
                }}
              >
                <ListItemIcon
                  sx={{ color: 'inherit', minWidth: 36, '& svg': { fontSize: 20 } }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* User section at bottom */}
      <Box sx={{ mt: 'auto', px: 2.5, py: 2.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block', mb: 0.25 }}>
          Signed in as
        </Typography>
        <Typography variant="body2" fontWeight={500} color="#FFFFFF" noWrap>
          {user?.name}
        </Typography>
      </Box>
    </Drawer>
  );
};
