// Subscriptions — ADMIN: DataGrid + Create dialog | CLIENT: subscription card + user ID
//
// ENDPOINT GAP (documented):
//   There is no GET /api/users endpoint. The ADMIN must enter the CLIENT's
//   User ID (UUID) manually. The CLIENT can find their own UUID in this page
//   ("Your User ID" section) and share it with the administrator.

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import RepeatIcon from '@mui/icons-material/Repeat';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CalendarTodayIcon from '@mui/icons-material/CalendarTodayOutlined';
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
  type GridValueFormatterParams,
  type GridValueGetterParams,
} from '@mui/x-data-grid';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { getAllSubscriptions, getMySubscription, createSubscription } from '../api/subscriptions.api';
import { getPlans } from '../api/plans.api';
import { getApiErrorMessage } from '../api/axiosInstance';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { TableSkeleton } from '../components/common/TableSkeleton';
import type { Subscription, Plan, SubscriptionStatus } from '../types';

// ── Date helpers ──────────────────────────────────────────────────────────────

const fmt = (d: Date): string => d.toISOString().split('T')[0] ?? '';

const getEmptyForm = (): CreateForm => ({
  userId:    '',
  planId:    '',
  startDate: fmt(new Date()),
  endDate:   fmt(new Date(Date.now() + 30 * 86_400_000)), // +30 days
});

interface CreateForm {
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
}

// ── CLIENT subscription view ──────────────────────────────────────────────────

const ClientSubscriptionView = ({ userId }: { userId: string }): JSX.Element => {
  const { showError, showSuccess } = useSnackbar();
  const [subscription, setSubscription] = useState<Subscription | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setSubscription(await getMySubscription());
      } catch (err) {
        showError(getApiErrorMessage(err));
        setSubscription(null);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(userId).then(() => {
      setCopied(true);
      showSuccess('User ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Loading state
  if (subscription === undefined) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {[1, 2, 3, 4].map((i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Skeleton variant="text" height={18} />
                  <Skeleton variant="text" width="60%" height={26} />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // User ID card — shown in all CLIENT views so they can share with ADMIN
  const UserIdCard = (
    <Card sx={{ bgcolor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="caption" fontWeight={700} color="#0369A1"
          textTransform="uppercase" letterSpacing="0.06em" display="block" sx={{ mb: 0.75 }}>
          Your User ID
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="body2"
            fontFamily="monospace"
            sx={{ flex: 1, wordBreak: 'break-all', color: '#0C4A6E', fontSize: '0.8rem' }}
          >
            {userId}
          </Typography>
          <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
            <IconButton size="small" onClick={handleCopy} sx={{ color: '#0369A1', flexShrink: 0 }}>
              <ContentCopyIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="caption" color="#0369A1" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
          Share this with an administrator to get a subscription assigned to your account.
        </Typography>
      </CardContent>
    </Card>
  );

  // No subscription
  if (!subscription) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Card>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Box
              sx={{
                width: 52, height: 52, borderRadius: '50%',
                bgcolor: 'rgba(71,85,105,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 1.5,
              }}
            >
              <RepeatIcon sx={{ fontSize: 26, color: 'text.disabled' }} />
            </Box>
            <Typography variant="h6" fontWeight={600} color="text.secondary">
              No active subscription
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
              Contact an administrator and share your User ID below to get started.
            </Typography>
          </CardContent>
        </Card>
        {UserIdCard}
      </Box>
    );
  }

  // Active subscription card
  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Plan',       value: subscription.plan ? (
        <Chip label={subscription.plan.name} size="small"
          sx={{ fontWeight: 600, bgcolor: '#F0FDF4', color: '#15803D' }}
        />
      ) : subscription.planId.slice(0, 8) + '…' },
    { label: 'Status',     value: <StatusChip status={subscription.status} /> },
    { label: 'Start Date', value: new Date(subscription.startDate).toLocaleDateString() },
    { label: 'End Date',   value: new Date(subscription.endDate).toLocaleDateString() },
    {
      label: 'Price / Period',
      value: subscription.plan ? `$${subscription.plan.price.toFixed(2)}` : '—',
    },
    { label: 'Subscription ID', value: subscription.id.slice(0, 12) + '…' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>My Subscription</Typography>
            <StatusChip status={subscription.status} />
          </Box>
          <Divider sx={{ mb: 2.5 }} />
          <Grid container spacing={2.5}>
            {fields.map((f) => (
              <Grid item xs={12} sm={6} md={4} key={f.label}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}
                  textTransform="uppercase" letterSpacing="0.06em" display="block">
                  {f.label}
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {typeof f.value === 'string'
                    ? <Typography variant="body1" fontWeight={500}>{f.value}</Typography>
                    : f.value}
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
      {UserIdCard}
    </Box>
  );
};

// ── ADMIN subscription view ───────────────────────────────────────────────────

export const Subscriptions = (): JSX.Element => {
  const { user } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const isAdmin = user?.role === 'ADMIN';

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans]                 = useState<Plan[]>([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [form, setForm]                   = useState<CreateForm>(getEmptyForm);

  const selectedPlan = plans.find((p) => p.id === form.planId);

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true);
      const [subs, ps] = await Promise.all([getAllSubscriptions(), getPlans()]);
      setSubscriptions(subs);
      setPlans(ps);
    } catch (err) {
      showError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) void fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAdmin) {
    return (
      <Box>
        <PageHeader title="Subscription" subtitle="Your current subscription and account details." />
        <ClientSubscriptionView userId={user?.id ?? ''} />
      </Box>
    );
  }

  const handleCreate = async (): Promise<void> => {
    if (!form.userId.trim()) { showError('Client User ID is required'); return; }
    if (!form.planId)        { showError('Please select a plan'); return; }
    if (!form.startDate)     { showError('Start date is required'); return; }
    if (!form.endDate)       { showError('End date is required'); return; }
    if (form.endDate <= form.startDate) { showError('End date must be after start date'); return; }

    setSaving(true);
    try {
      await createSubscription(form);
      showSuccess('Subscription created — invoice generated automatically');
      setDialogOpen(false);
      setForm(getEmptyForm());
      void fetchData();
    } catch (err) {
      showError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // v6 API: valueFormatter receives params.value
  const columns: GridColDef<Subscription>[] = [
    {
      field: 'id', headerName: 'ID', width: 120,
      valueFormatter: ({ value }: GridValueFormatterParams<string>) => value.slice(0, 8) + '…',
    },
    {
      field: 'userId', headerName: 'Client ID', width: 120,
      valueFormatter: ({ value }: GridValueFormatterParams<string>) => value.slice(0, 8) + '…',
    },
    {
      field: 'plan', headerName: 'Plan', width: 120,
      valueGetter: (params: GridValueGetterParams<Subscription>) =>
        params.row.plan?.name ?? params.row.planId.slice(0, 8),
      renderCell: ({ value }: GridRenderCellParams<Subscription, string>) => {
        const validNames = ['BRONZE', 'SILVER', 'GOLD'];
        if (value && validNames.includes(value)) {
          const colors: Record<string, { bgcolor: string; color: string }> = {
            BRONZE: { bgcolor: '#FEF3C7', color: '#92400E' },
            SILVER: { bgcolor: '#F1F5F9', color: '#475569' },
            GOLD:   { bgcolor: '#FEF9C3', color: '#854D0E' },
          };
          const s = colors[value] ?? { bgcolor: '#F1F5F9', color: '#475569' };
          return (
            <Chip label={value} size="small"
              sx={{ bgcolor: s.bgcolor, color: s.color, fontWeight: 600, fontSize: '0.75rem' }}
            />
          );
        }
        return <Typography variant="body2">{value}</Typography>;
      },
    },
    {
      field: 'status', headerName: 'Status', width: 120,
      renderCell: ({ value }: GridRenderCellParams<Subscription, SubscriptionStatus>) =>
        value ? <StatusChip status={value} /> : null,
    },
    {
      field: 'startDate', headerName: 'Start', width: 110,
      valueFormatter: ({ value }: GridValueFormatterParams<string>) =>
        new Date(value).toLocaleDateString(),
    },
    {
      field: 'endDate', headerName: 'End', width: 110,
      valueFormatter: ({ value }: GridValueFormatterParams<string>) =>
        new Date(value).toLocaleDateString(),
    },
    {
      field: 'plan.price', headerName: 'Price', width: 100,
      valueGetter: (params: GridValueGetterParams<Subscription>) =>
        params.row.plan?.price ?? null,
      valueFormatter: ({ value }: GridValueFormatterParams<number | null>) =>
        value !== null ? `$${value.toFixed(2)}` : '—',
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Subscriptions"
        subtitle="Manage client subscriptions. Creating a subscription auto-generates an invoice."
        actions={
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => { setForm(getEmptyForm()); setDialogOpen(true); }}>
            Create Subscription
          </Button>
        }
      />

      <Card>
        {loading ? (
          <Box sx={{ p: 2 }}><TableSkeleton rows={5} columns={6} /></Box>
        ) : (
          <DataGrid
            rows={subscriptions}
            columns={columns}
            autoHeight
            pageSizeOptions={[10, 25]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            disableRowSelectionOnClick
          />
        )}
      </Card>

      {/* Create Subscription dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 0.5 }}>Create Subscription</DialogTitle>
        <DialogContent sx={{ pt: '12px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Client ID field */}
          <TextField
            label="Client User ID"
            fullWidth
            value={form.userId}
            onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value.trim() }))}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            helperText="The client's UUID — they can copy it from their Subscriptions page"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutlineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Plan select with price preview */}
          <FormControl fullWidth size="small">
            <InputLabel>Plan</InputLabel>
            <Select
              label="Plan"
              value={form.planId}
              onChange={(e) => setForm((p) => ({ ...p, planId: e.target.value }))}
            >
              {plans.map((pl) => (
                <MenuItem key={pl.id} value={pl.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                    <Typography variant="body2" fontWeight={500}>{pl.name}</Typography>
                    <Typography variant="body2" color="text.secondary">${pl.price.toFixed(2)}/period</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Plan summary when selected */}
          {selectedPlan && (
            <Box sx={{ bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 2, px: 2, py: 1.25 }}>
              <Typography variant="caption" color="#15803D" fontWeight={600}>
                Invoice will be generated automatically for ${(
                  form.planId === selectedPlan.id
                    ? selectedPlan.name === 'BRONZE' ? selectedPlan.price
                    : selectedPlan.name === 'SILVER' ? selectedPlan.price * 1.05
                    : selectedPlan.price * 1.1
                    : selectedPlan.price
                ).toFixed(2)}
                {' '}({selectedPlan.name} tier pricing)
              </Typography>
            </Box>
          )}

          {/* Date range */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="End Date"
              type="date"
              fullWidth
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleCreate()} disabled={saving}>
            {saving ? 'Creating…' : 'Create Subscription'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
