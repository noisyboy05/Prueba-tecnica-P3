// Dashboard — Premium ADMIN analytics with Business Insights + Recent Activity
// Data sources: getDashboardMetrics + getAllInvoices + getAllSubscriptions (all existing endpoints)
// No new endpoints, no chart libraries.

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

// Icons — Metric cards
import PeopleAltIcon from '@mui/icons-material/PeopleAltOutlined';
import LayersIcon from '@mui/icons-material/LayersOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import HighlightOffIcon from '@mui/icons-material/HighlightOffOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmptyOutlined';
import PaidIcon from '@mui/icons-material/PaidOutlined';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import FavoriteIcon from '@mui/icons-material/FavoriteBorderOutlined';
import BarChartIcon from '@mui/icons-material/BarChartOutlined';
import InsightsIcon from '@mui/icons-material/InsightsOutlined';

import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { getDashboardMetrics } from '../api/dashboard.api';
import { getAllInvoices } from '../api/invoices.api';
import { getAllSubscriptions } from '../api/subscriptions.api';
import { getApiErrorMessage } from '../api/axiosInstance';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import type { DashboardMetrics, Invoice, Subscription } from '../types';

// ── Metric card config ────────────────────────────────────────────────────────

interface MetricConfig {
  key: keyof DashboardMetrics;
  label: string;
  description: string;
  icon: JSX.Element;
  color: string;
  format?: (v: number) => string;
}

const METRICS: MetricConfig[] = [
  { key: 'totalUsers',           label: 'Total Users',            description: 'Registered platform users',                  icon: <PeopleAltIcon />,          color: '#2563EB' },
  { key: 'totalPlans',           label: 'Subscription Tiers',     description: 'BRONZE · SILVER · GOLD',                     icon: <LayersIcon />,             color: '#0891B2' },
  { key: 'activeSubscriptions',  label: 'Active Subscriptions',   description: 'Currently active customer subscriptions',    icon: <CheckCircleIcon />,        color: '#16A34A' },
  { key: 'expiredSubscriptions', label: 'Expired Subscriptions',  description: 'Subscriptions past their end date',          icon: <HighlightOffIcon />,       color: '#DC2626' },
  { key: 'totalInvoices',        label: 'Total Invoices',         description: 'All invoices generated on the platform',     icon: <ReceiptLongIcon />,        color: '#7C3AED' },
  { key: 'pendingInvoices',      label: 'Pending Invoices',       description: 'Awaiting payment from clients',              icon: <HourglassEmptyIcon />,     color: '#D97706' },
  { key: 'paidInvoices',         label: 'Paid Invoices',          description: 'Successfully collected payments',            icon: <PaidIcon />,               color: '#15803D' },
  {
    key: 'totalRevenue', label: 'Total Revenue', description: 'Cumulative revenue from paid invoices',
    icon: <AccountBalanceWalletIcon />, color: '#B45309',
    format: (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
];

const TIER_CHIP: Record<string, { bgcolor: string; color: string }> = {
  BRONZE: { bgcolor: '#FEF3C7', color: '#92400E' },
  SILVER: { bgcolor: '#F1F5F9', color: '#475569' },
  GOLD:   { bgcolor: '#FEF9C3', color: '#854D0E' },
};

// ── Metric card component ─────────────────────────────────────────────────────

const MetricCard = ({ config, value, loading }: { config: MetricConfig; value: number; loading: boolean }): JSX.Element => {
  const display     = config.format ? config.format(value) : String(value);
  const isLong      = display.length > 6;
  return (
    <Card elevation={1} sx={{ minHeight: 168, height: '100%', transition: 'transform 0.2s ease, box-shadow 0.2s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 16px 32px rgba(0,0,0,0.10)' } }}>
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        {loading ? (
          <Box>
            <Skeleton variant="circular" width={52} height={52} sx={{ mb: 2.5 }} />
            <Skeleton variant="text" width="50%" height={48} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="70%" height={20} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="90%" height={16} />
          </Box>
        ) : (
          <Box>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: `${config.color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5, '& svg': { fontSize: 26, color: config.color } }}>
              {config.icon}
            </Box>
            <Typography sx={{ fontSize: isLong ? '2rem' : '2.5rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', color: 'text.primary', mb: 1 }}>
              {display}
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>{config.label}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, display: 'block' }}>{config.description}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// ── Section divider ───────────────────────────────────────────────────────────

const SectionDivider = ({ title, icon }: { title: string; icon: JSX.Element }): JSX.Element => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 5, mb: 3 }}>
    <Box sx={{ color: 'text.secondary', '& svg': { fontSize: 18 } }}>{icon}</Box>
    <Typography variant="overline" fontWeight={700} color="text.secondary" letterSpacing="0.1em" sx={{ whiteSpace: 'nowrap' }}>
      {title}
    </Typography>
    <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
  </Box>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const Dashboard = (): JSX.Element => {
  const { user } = useAuth();
  const { showError } = useSnackbar();
  const [metrics,         setMetrics]         = useState<DashboardMetrics | null>(null);
  const [recentInvoices,  setRecentInvoices]  = useState<Invoice[]>([]);
  const [subMap,          setSubMap]          = useState<Map<string, Subscription>>(new Map());
  const [loading,         setLoading]         = useState(true);
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      try {
        const [m, invoices, subs] = await Promise.all([
          getDashboardMetrics(),
          getAllInvoices(),
          getAllSubscriptions(),
        ]);
        setMetrics(m);
        const sorted = [...invoices]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
        setRecentInvoices(sorted);
        setSubMap(new Map(subs.map((s) => [s.id, s])));
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
  const totalSubs  = (m?.activeSubscriptions ?? 0) + (m?.expiredSubscriptions ?? 0);
  const healthPct  = totalSubs > 0 ? Math.round(((m?.activeSubscriptions ?? 0) / totalSubs) * 100) : 0;

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Real-time platform overview · Subscriptions · Billing · Revenue"
      />

      {/* ── 8 Metric Cards ─────────────────────────────────────────────── */}
      <Grid container spacing={3}>
        {METRICS.map((cfg) => (
          <Grid item xs={12} sm={6} md={3} key={cfg.key}>
            <MetricCard config={cfg} value={m ? m[cfg.key] : 0} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {/* ── Business Insights ──────────────────────────────────────────── */}
      <SectionDivider title="Business Insights" icon={<InsightsIcon />} />

      <Grid container spacing={3}>
        {/* Card 1: Subscription Health */}
        <Grid item xs={12} sm={4}>
          <Card elevation={1} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#16A34A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 22, color: '#16A34A' } }}>
                  <FavoriteIcon />
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>Subscription Health</Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[1,2,3].map(i => <Skeleton key={i} variant="text" height={28} width={`${70 - i * 10}%`} />)}
                </Box>
              ) : (
                <>
                  <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                    <Box>
                      <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: '#16A34A', lineHeight: 1 }}>{m?.activeSubscriptions ?? 0}</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>Active</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: '#DC2626', lineHeight: 1 }}>{m?.expiredSubscriptions ?? 0}</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>Expired</Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: healthPct >= 70 ? '#16A34A' : healthPct >= 40 ? '#D97706' : '#DC2626', lineHeight: 1 }}>
                      {healthPct}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Healthy subscriptions</Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: Revenue Overview */}
        <Grid item xs={12} sm={4}>
          <Card elevation={1} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#B453091A', display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 22, color: '#B45309' } }}>
                  <AccountBalanceWalletIcon />
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>Revenue Overview</Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[1,2,3].map(i => <Skeleton key={i} variant="text" height={28} width={`${70 - i * 10}%`} />)}
                </Box>
              ) : (
                <>
                  <Typography sx={{ fontSize: '1.875rem', fontWeight: 800, color: '#B45309', lineHeight: 1, letterSpacing: '-0.02em' }}>
                    ${(m?.totalRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Total collected revenue</Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={800} color="#15803D" lineHeight={1}>{m?.paidInvoices ?? 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Paid</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={800} color="#D97706" lineHeight={1}>{m?.pendingInvoices ?? 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Pending</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={800} color="#DC2626" lineHeight={1}>{m?.overdueInvoices ?? 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Overdue</Typography>
                    </Box>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Card 3: Platform Status */}
        <Grid item xs={12} sm={4}>
          <Card elevation={1} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#2563EB1A', display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 22, color: '#2563EB' } }}>
                  <BarChartIcon />
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>Platform Status</Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[1,2,3].map(i => <Skeleton key={i} variant="text" height={28} width={`${70 - i * 10}%`} />)}
                </Box>
              ) : (
                <>
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    {[
                      { value: m?.totalUsers ?? 0,    label: 'Users',    color: '#2563EB' },
                      { value: m?.totalPlans ?? 0,    label: 'Tiers',    color: '#0891B2' },
                      { value: m?.totalInvoices ?? 0, label: 'Invoices', color: '#7C3AED' },
                    ].map((s) => (
                      <Grid item xs={4} key={s.label}>
                        <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {['BRONZE', 'SILVER', 'GOLD'].map((t) => (
                      <Chip key={t} label={t} size="small"
                        sx={{ bgcolor: TIER_CHIP[t]?.bgcolor, color: TIER_CHIP[t]?.color, fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Recent Invoices ─────────────────────────────────────────────── */}
      <SectionDivider title="Recent Invoices" icon={<ReceiptLongIcon />} />

      <Card elevation={1}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {loading ? (
            <Box sx={{ p: 2 }}>
              {[1,2,3,4,5].map(i => (
                <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1 }}>
                  {[1,2,3,4,5].map(j => <Skeleton key={j} variant="text" height={36} sx={{ flex: 1 }} />)}
                </Box>
              ))}
            </Box>
          ) : recentInvoices.length === 0 ? (
            <Box sx={{ p: 5, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">No invoices yet.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.78rem', color: 'text.secondary', bgcolor: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em' } }}>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Plan</TableCell>
                  <TableCell>Monto</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Fecha</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentInvoices.map((inv) => {
                  const sub  = subMap.get(inv.subscriptionId);
                  const plan = sub?.plan;
                  const tierStyle = plan ? TIER_CHIP[plan.name] : undefined;
                  return (
                    <TableRow key={inv.id} sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem" color="text.secondary">
                          {sub?.userId.slice(0, 8) ?? inv.subscriptionId.slice(0, 8)}…
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {plan && tierStyle ? (
                          <Chip label={plan.name} size="small"
                            sx={{ bgcolor: tierStyle.bgcolor, color: tierStyle.color, fontWeight: 600, fontSize: '0.7rem', height: 22 }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          ${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell><StatusChip status={inv.status} /></TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
