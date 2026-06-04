// Subscriptions — ADMIN: DataGrid with all subscriptions + Create form
//                  CLIENT: Card showing active subscription or empty state

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
import AddIcon from '@mui/icons-material/Add';
import RepeatIcon from '@mui/icons-material/Repeat';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { getAllSubscriptions, getMySubscription, createSubscription } from '../api/subscriptions.api';
import { getPlans } from '../api/plans.api';
import { getApiErrorMessage } from '../api/axiosInstance';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { TableSkeleton } from '../components/common/TableSkeleton';
import type { Subscription, Plan, SubscriptionStatus } from '../types';

interface CreateForm {
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
}

const EMPTY_FORM: CreateForm = { userId: '', planId: '', startDate: '', endDate: '' };

/* ─── CLIENT view ─────────────────────────────────────────────────────────── */

const ClientSubscriptionView = (): JSX.Element => {
  const { showError } = useSnackbar();
  const [subscription, setSubscription] = useState<Subscription | null | undefined>(undefined);

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

  if (subscription === undefined) {
    return (
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} sm={6} key={i}>
                <Skeleton variant="text" height={20} />
                <Skeleton variant="text" width="60%" height={28} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <RepeatIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" fontWeight={600} color="text.secondary">
            No active subscription
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
            Contact an administrator to get started.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const fields = [
    { label: 'Plan', value: subscription.plan?.name ?? subscription.planId },
    { label: 'Status', value: <StatusChip status={subscription.status} /> },
    { label: 'Start Date', value: new Date(subscription.startDate).toLocaleDateString() },
    { label: 'End Date', value: new Date(subscription.endDate).toLocaleDateString() },
    { label: 'Price', value: subscription.plan ? `$${subscription.plan.price.toFixed(2)}/period` : '—' },
    { label: 'Subscription ID', value: subscription.id.slice(0, 8) + '…' },
  ];

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Typography variant="h6" fontWeight={600}>My Subscription</Typography>
          <StatusChip status={subscription.status} />
        </Box>
        <Divider sx={{ mb: 2.5 }} />
        <Grid container spacing={2.5}>
          {fields.map((f) => (
            <Grid item xs={12} sm={6} md={4} key={f.label}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing="0.06em">
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
  );
};

/* ─── ADMIN view ──────────────────────────────────────────────────────────── */

export const Subscriptions = (): JSX.Element => {
  const { user } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const isAdmin = user?.role === 'ADMIN';

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans]                 = useState<Plan[]>([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [form, setForm]                   = useState<CreateForm>(EMPTY_FORM);

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
        <PageHeader title="Subscription" subtitle="Your current subscription details" />
        <ClientSubscriptionView />
      </Box>
    );
  }

  const handleCreate = async (): Promise<void> => {
    if (!form.userId || !form.planId || !form.startDate || !form.endDate) {
      showError('All fields are required');
      return;
    }
    setSaving(true);
    try {
      await createSubscription(form);
      showSuccess('Subscription created and invoice generated');
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      void fetchData();
    } catch (err) {
      showError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const columns: GridColDef<Subscription>[] = [
    { field: 'id', headerName: 'ID', width: 120, valueFormatter: (v: unknown) => String(v).slice(0, 8) + '…' },
    { field: 'userId', headerName: 'User ID', width: 130, valueFormatter: (v: unknown) => String(v).slice(0, 8) + '…' },
    {
      field: 'plan', headerName: 'Plan', width: 110,
      valueGetter: (_v: unknown, row: Subscription) => row.plan?.name ?? row.planId.slice(0, 8),
    },
    {
      field: 'status', headerName: 'Status', width: 120,
      renderCell: ({ value }: GridRenderCellParams<Subscription, SubscriptionStatus>) => (
        <StatusChip status={value} />
      ),
    },
    { field: 'startDate', headerName: 'Start', width: 120, valueFormatter: (v: unknown) => new Date(String(v)).toLocaleDateString() },
    { field: 'endDate',   headerName: 'End',   width: 120, valueFormatter: (v: unknown) => new Date(String(v)).toLocaleDateString() },
    {
      field: 'plan.price', headerName: 'Price', width: 110,
      valueGetter: (_v: unknown, row: Subscription) => row.plan?.price ?? '—',
      valueFormatter: (v: unknown) => v !== '—' ? `$${Number(v).toFixed(2)}` : '—',
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Subscriptions"
        subtitle="All user subscriptions"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true); }}>
            New Subscription
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Subscription</DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="User ID (UUID)"
            fullWidth
            value={form.userId}
            onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value }))}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
          <FormControl fullWidth size="small">
            <InputLabel>Plan</InputLabel>
            <Select
              label="Plan"
              value={form.planId}
              onChange={(e) => setForm((p) => ({ ...p, planId: e.target.value }))}
            >
              {plans.map((pl) => (
                <MenuItem key={pl.id} value={pl.id}>
                  {pl.name} — ${pl.price.toFixed(2)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Start Date"
            type="date"
            fullWidth
            value={form.startDate}
            onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            fullWidth
            value={form.endDate}
            onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleCreate()} disabled={saving}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
