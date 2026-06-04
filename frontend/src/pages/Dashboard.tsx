// Dashboard — ADMIN metrics overview
// Displays 8 metric cards with Skeleton loading. CLIENTs are redirected.

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import PeopleIcon from '@mui/icons-material/PeopleOutlined';
import LayersIcon from '@mui/icons-material/LayersOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import HourglassIcon from '@mui/icons-material/HourglassEmptyOutlined';
import PaidIcon from '@mui/icons-material/PaidOutlined';
import AttachMoneyIcon from '@mui/icons-material/AttachMoneyOutlined';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { getDashboardMetrics } from '../api/dashboard.api';
import { getApiErrorMessage } from '../api/axiosInstance';
import { PageHeader } from '../components/common/PageHeader';
import type { DashboardMetrics } from '../types';

interface MetricConfig {
  key: keyof DashboardMetrics;
  label: string;
  icon: JSX.Element;
  accent: string;
  format?: (v: number) => string;
}

const METRICS: MetricConfig[] = [
  { key: 'totalUsers',           label: 'Total Users',            icon: <PeopleIcon />,       accent: '#6366F1' },
  { key: 'totalPlans',           label: 'Plans',                  icon: <LayersIcon />,       accent: '#0EA5E9' },
  { key: 'activeSubscriptions',  label: 'Active Subscriptions',   icon: <CheckCircleIcon />,  accent: '#16A34A' },
  { key: 'expiredSubscriptions', label: 'Expired Subscriptions',  icon: <CancelIcon />,       accent: '#DC2626' },
  { key: 'totalInvoices',        label: 'Total Invoices',         icon: <ReceiptIcon />,      accent: '#8B5CF6' },
  { key: 'pendingInvoices',      label: 'Pending Invoices',       icon: <HourglassIcon />,    accent: '#D97706' },
  { key: 'paidInvoices',         label: 'Paid Invoices',          icon: <PaidIcon />,         accent: '#16A34A' },
  {
    key: 'totalRevenue',
    label: 'Total Revenue',
    icon: <AttachMoneyIcon />,
    accent: '#0F172A',
    format: (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
];

const MetricCard = ({
  label, value, icon, accent, loading,
}: {
  label: string; value: string | number; icon: JSX.Element; accent: string; loading: boolean;
}): JSX.Element => (
  <Card>
    <CardContent sx={{ p: 2.5 }}>
      {loading ? (
        <>
          <Skeleton variant="circular" width={40} height={40} sx={{ mb: 1.5 }} />
          <Skeleton variant="text" width="60%" height={40} />
          <Skeleton variant="text" width="40%" />
        </>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              bgcolor: `${accent}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              '& svg': { color: accent, fontSize: 22 },
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary" lineHeight={1.2}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              {label}
            </Typography>
          </Box>
        </Box>
      )}
    </CardContent>
  </Card>
);

export const Dashboard = (): JSX.Element => {
  const { user } = useAuth();
  const { showError } = useSnackbar();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  if (user?.role !== 'ADMIN') return <Navigate to="/subscriptions" replace />;

  useEffect(() => {
    void (async () => {
      try {
        const data = await getDashboardMetrics();
        setMetrics(data);
      } catch (err) {
        showError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Platform overview and key metrics"
      />

      <Grid container spacing={2.5}>
        {METRICS.map((m) => (
          <Grid item xs={12} sm={6} md={3} key={m.key}>
            <MetricCard
              label={m.label}
              value={
                loading || !metrics
                  ? '—'
                  : (m.format ? m.format(metrics[m.key]) : String(metrics[m.key]))
              }
              icon={m.icon}
              accent={m.accent}
              loading={loading}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
