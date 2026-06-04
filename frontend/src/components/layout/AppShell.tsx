// AppShell — authenticated layout wrapper
// Permanent sidebar (desktop) + Top bar + scrollable main content

import Box from '@mui/material/Box';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

const SIDEBAR_WIDTH = 240;
const TOPBAR_HEIGHT = 64;

export const AppShell = (): JSX.Element => (
  <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
    <Sidebar width={SIDEBAR_WIDTH} />

    <Box
      component="main"
      sx={{
        flexGrow: 1,
        ml: `${SIDEBAR_WIDTH}px`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <TopBar height={TOPBAR_HEIGHT} />

      <Box
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          pt: `${TOPBAR_HEIGHT + 24}px`,
          maxWidth: 1440,
          width: '100%',
          mx: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  </Box>
);
