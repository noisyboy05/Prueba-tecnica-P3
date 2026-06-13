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

      {/*
        IMPORTANT — padding ordering:
        The "p" shorthand generates responsive @media rules that include
        padding-top. Those @media rules are emitted AFTER the "pt" rule in
        the generated CSS, which silently overrides padding-top: 88px with
        padding-top: 24px (md) or 16px (xs), hiding the PageHeader title
        and action buttons under the fixed TopBar.
        Fix: use "px" (left+right) and "pb" (bottom) so "pt" is never
        overridden by a shorthand that also sets padding-top.
      */}
      <Box
        sx={{
          flexGrow: 1,
          pt: `${TOPBAR_HEIGHT + 24}px`, // push content below fixed TopBar (64 + 24 = 88px)
          px: { xs: 2, md: 3 },          // horizontal padding only — does NOT affect pt
          pb: { xs: 2, md: 3 },          // bottom padding only   — does NOT affect pt
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
