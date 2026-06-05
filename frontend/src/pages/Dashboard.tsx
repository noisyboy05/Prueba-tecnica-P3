// Dashboard — Premium ADMIN metrics overview
// Only uses DashboardMetrics from the existing GET /api/dashboard endpoint.
// No new endpoints, no chart libraries, only Material UI.

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';

// Icons — Metric cards
import PeopleAltIcon from '@mui/icons-material/PeopleAltOutlined';
import LayersIcon from '@mui/icons-material/LayersOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import HighlightOffIcon from '@mui/icons-material/HighlightOffOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmptyOutlined';
import PaidIcon from '@mui/icons-material/PaidOutlined';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { getDashboardMetrics } from '../api/dashboard.api';
import { getApiErrorMessage } from '../api/axiosInstance';
import { PageHeader } from '../components/common/PageHeader';
import type { DashboardMetrics } from '../types';

// ── Metric card configuration ─────────────────────────────────────────────────

interface MetricConfig {
  key: keyof DashboardMetrics;
  label: string;
  description: string;
  icon: JSX.Element;
  color: string;
  format?: (v: number) => string;
}

const METRICS: MetricConfig[] = [
  {
    key: 'totalUsers',
    label: 'Total Users',
    description: 'Registered platform users',
    icon: <PeopleAltIcon />,
    color: '#2563EB',
  },
  {
    key: 'totalPlans',
    label: 'Subscription Tiers',
    description: 'BRONZE · SILVER · GOLD',
    icon: <LayersIcon />,
    color: '#0891B2',
  },
  {
    key: 'activeSubscriptions',
    label: 'Active Subscriptions',
    description: 'Currently active customer subscriptions',
    icon: <CheckCircleIcon />,
    color: '#16A34A',
  },
  {
    key: 'expiredSubscriptions',
    label: 'Expired Subscriptions',
    description: 'Subscriptions past their end date',
    icon: <HighlightOffIcon />,
    color: '#DC2626',
  },
  {
    key: 'totalInvoices',
    label: 'Total Invoices',
    description: 'All invoices generated on the platform',
    icon: <ReceiptLongIcon />,
    color: '#7C3AED',
  },
  {
    key: 'pendingInvoices',
    label: 'Pending Invoices',
    description: 'Awaiting payment from clients',
    icon: <HourglassEmptyIcon />,
    color: '#D97706',
  },
  {
    key: 'paidInvoices',
    label: 'Paid Invoices',
    description: 'Successfully collected payments',
    icon: <PaidIcon />,
    color: '#15803D',
  },
  {
    key: 'totalRevenue',
    label: 'Total Revenue',
    description: 'Cumulative revenue from paid invoices',
    icon: <AccountBalanceWalletIcon />,
    color: '#B45309',
    format: (v) =>
      `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
];

// ── Metric card component ─────────────────────────────────────────────────────

const MetricCard = ({
  config, value, loading,
}: {
  config: MetricConfig; value: number; loading: boolean;
}): JSX.Element => {
  const displayValue = config.format ? config.format(value) : String(value);
  const isLongValue  = displayValue.length > 6;

  return (
    <Card
      elevation={1}
      sx={{
        minHeight: 168,
        height: '100%',
        cursor: 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 16px 32px rgba(0,0,0,0.10)',
        },
      }}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, height: '100%', boxSizing: 'border-box' }}>
        {loading ? (
          <Box>
            <Skeleton variant="circular" width={52} height={52} sx={{ mb: 2.5 }} />
            <Skeleton variant="text" width="50%" height={isLongValue ? 44 : 52} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="70%" height={20} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="90%" height={16} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Icon circle */}
            <Box
              sx={{
                width: 52, height: 52, borderRadius: '50%',
                bgcolor: `${config.color}1A`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mb: 2.5, flexShrink: 0,
                '& svg': { fontSize: 26, color: config.color },
              }}
            >
              {config.icon}
            </Box>

            {/* Main value — large, bold, impactful */}
            <Typography
              sx={{
                fontSize: isLongValue ? '2rem' : '2.5rem',
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: 'text.primary',
                mb: 1,
              }}
            >
              {displayValue}
            </Typography>

            {/* Label */}
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
              {config.label}
            </Typography>

            {/* Description */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ lineHeight: 1.5, display: 'block' }}
            >
              {config.description}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// ── Platform Summary cards ────────────────────────────────────────────────────

const SummaryCard = ({
  icon, color, title, mainValue, description, loading, children,
}: {
  icon: JSX.Element;
  color: string;
  title: string;
  mainValue: string;
  description: string;
  loading: boolean;
  children?: React.ReactNode;
}): JSX.Element => (
  <Card elevation={1} sx={{ height: '100%' }}>
    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
      {loading ? (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton variant="text" width={120} height={24} />
          </Box>
          <Skeleton variant="text" width="50%" height={40} sx={{ mb: 0.5 }} />
          <Skeleton variant="text" width="70%" height={18} />
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Skeleton variant="text" width={60} height={32} />
            <Skeleton variant="text" width={60} height={32} />
            <Skeleton variant="text" width={60} height={32} />
          </Box>
        </Box>
      ) : (
        <>
          {/* Card header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '50%',
              bgcolor: `${color}1A`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              '& svg': { fontSize: 22, color },
            }}>
              {icon}
            </Box>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              {title}
            </Typography>
          </Box>

          {/* Main value */}
          <Typography sx={{ fontSize: '1.875rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em', color: 'text.primary' }}>
            {mainValue}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>

          <Divider sx={{ my: 2 }} />

          {children}
        </>
      )}
    </CardContent>
  </Card>
);

// ── Stat pill used inside summary cards ────────────────────────────────────────

const StatPill = ({ value, label, color }: { value: number | string; label: string; color: string }): JSX.Element => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
    <Typography variant="h6" fontWeight={700} sx={{ color, lineHeight: 1 }}>
      {value}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
      {label}
    </Typography>
  </Box>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const Dashboard = (): JSX.Element => {
  const { user } = useAuth();
  const { showError } = useSnackbar();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'ADMIN';

  // useEffect must be called unconditionally (React hook rules)
  useEffect(() => {
    if (!isAdmin) return;
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

  if (!isAdmin) return <Navigate to="/subscriptions" replace />;

  const m = metrics;

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Real-time platform overview · Subscriptions · Billing · Revenue"
      />

      {/* ── 8 Metric Cards ────────────────────────────────────────────────── */}
      <Grid container spacing={3}>
        {METRICS.map((cfg) => (
          <Grid item xs={12} sm={6} md={3} key={cfg.key}>
            <MetricCard
              config={cfg}
              value={m ? m[cfg.key] : 0}
              loading={loading}
            />
          </Grid>
        ))}
      </Grid>

      {/* ── Platform Summary section ───────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 5, mb: 3 }}>
        <Typography
          variant="overline"
          fontWeight={700}
          color="text.secondary"
          letterSpacing="0.1em"
          sx={{ whiteSpace: 'nowrap' }}
        >
          Platform Summary
        </Typography>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
      </Box>

      <Grid container spacing={3}>
        {/* Card 1: User & Subscription Activity */}
        <Grid item xs={12} sm={4}>
          <SummaryCard
            icon={<PeopleAltIcon />}
            color="#2563EB"
            title="User Activity"
            mainValue={loading ? '—' : String(m?.totalUsers ?? 0)}
            description="total registered users on the platform"
            loading={loading}
          >
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <StatPill value={m?.activeSubscriptions ?? 0}  label="Active subs"   color="#16A34A" />
              <StatPill value={m?.expiredSubscriptions ?? 0} label="Expired subs"  color="#DC2626" />
            </Box>
          </SummaryCard>
        </Grid>

        {/* Card 2: Subscription Tiers */}
        <Grid item xs={12} sm={4}>
          <SummaryCard
            icon={<LayersIcon />}
            color="#0891B2"
            title="Subscription Tiers"
            mainValue={loading ? '—' : String(m?.totalPlans ?? 0)}
            description="billing tiers available to clients"
            loading={loading}
          >
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { name: 'BRONZE', color: '#92400E', bg: '#FEF3C7' },
                { name: 'SILVER', color: '#475569', bg: '#F1F5F9' },
                { name: 'GOLD',   color: '#854D0E', bg: '#FEF9C3' },
              ].map((t) => (
                <Box key={t.name} sx={{
                  px: 1.5, py: 0.5, borderRadius: 1.5,
                  bgcolor: t.bg, display: 'flex', alignItems: 'center', gap: 0.75,
                }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: t.color }} />
                  <Typography variant="caption" fontWeight={700} sx={{ color: t.color }}>
                    {t.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          </SummaryCard>
        </Grid>

        {/* Card 3: Revenue Status */}
        <Grid item xs={12} sm={4}>
          <SummaryCard
            icon={<AccountBalanceWalletIcon />}
            color="#B45309"
            title="Revenue Status"
            mainValue={
              loading ? '—'
              : `$${(m?.totalRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
            description="collected from paid invoices"
            loading={loading}
          >
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <StatPill value={m?.paidInvoices    ?? 0} label="Paid"    color="#15803D" />
              <StatPill value={m?.pendingInvoices ?? 0} label="Pending" color="#D97706" />
              <StatPill value={m?.overdueInvoices ?? 0} label="Overdue" color="#DC2626" />
            </Box>
          </SummaryCard>
        </Grid>
      </Grid>
    </Box>
  );
};
