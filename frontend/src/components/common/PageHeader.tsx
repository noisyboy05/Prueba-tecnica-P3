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
  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
    <Box>
      <Typography variant="h5" fontWeight={700} color="text.primary">
        {title}
      </Typography>
      {subtitle !== undefined && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {actions !== undefined && <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box>}
  </Box>
);
