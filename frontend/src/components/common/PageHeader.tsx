// PageHeader — consistent page title + optional subtitle + right-side actions

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const PageHeader = ({ title, subtitle, actions }: PageHeaderProps): JSX.Element => (
  <Box sx={{ mb: 3 }}>
    {/* Title row — always visible, button inline with the h5 title */}
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',   // button vertically centered with the title line
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Typography variant="h5" fontWeight={700} color="text.primary" lineHeight={1.3}>
        {title}
      </Typography>
      {actions !== undefined && (
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          {actions}
        </Box>
      )}
    </Box>

    {/* Subtitle on its own line, below the title+button row */}
    {subtitle !== undefined && (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {subtitle}
      </Typography>
    )}
  </Box>
);
