// Subscriptions — ADMIN: full CRUD (Create, Read, Update, Cancel) | CLIENT: subscription card
//
// ADMIN endpoints used:
//   POST   /api/subscriptions          — Create
//   GET    /api/subscriptions          — Read All
//   PUT    /api/subscriptions/:id      — Update (plan, dates)
//   PATCH  /api/subscriptions/:id/cancel — Cancel (set EXPIRED)
//   GET    /api/plans                  — for plan selector in Create/Edit dialogs
//
// CLIENT endpoints used:
//   GET    /api/subscriptions/me       — Read own
//
// Business rules preserved:
//   - Historical invoices are NOT recalculated on plan/date change
//   - Cancel is a soft operation: subscription record is kept, status → EXPIRED
//
// ENDPOINT GAP (documented):
//   No GET /api/users endpoint. ADMIN enters CLIENT UUID manually.
//   CLIENT can copy their UUID from the "Your User ID" card below.

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
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
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import CancelIcon from '@mui/icons-material/CancelOutlined';
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
import {
  getAllSubscriptions,
  getMySubscription,
  createSubscription,
  updateSubscription,
  cancelSubscription,
} from '../api/subscriptions.api';
import { getPlans } from '../api/plans.api';
import { getApiErrorMessage } from '../api/axiosInstance';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { TableSkeleton } from '../components/common/TableSkeleton';
import type { Subscription, Plan, SubscriptionStatus } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d: Date): string => d.toISOString().split('T')[0] ?? '';
const isoToInput = (iso: string): string => iso.split('T')[0] ?? '';

const getEmptyCreateForm = (): CreateForm => ({
  userId:    '',
  planId:    '',
  startDate: fmtDate(new Date()),
  endDate:   fmtDate(new Date(Date.now() + 30 * 86_400_000)),
});

interface CreateForm  { userId: string; planId: string; startDate: string; endDate: string; }
interface EditSubForm { planId: string; startDate: string; endDate: string; }

const TIER_COLORS: Record<string, { bgcolor: string; color: string }> = {
  BRONZE: { bgcolor: '#FEF3C7', color: '#92400E' },
  SILVER: { bgcolor: '#F1F5F9', color: '#475569' },
  GOLD:   { bgcolor: '#FEF9C3', color: '#854D0E' },
};

// ── CLIENT view ───────────────────────────────────────────────────────────────

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
      showSuccess('User ID copied');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (subscription === undefined) {
    return (
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
    );
  }

  const UserIdCard = (
    <Card sx={{ bgcolor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="caption" fontWeight={700} color="#0369A1"
          textTransform="uppercase" letterSpacing="0.06em" display="block" sx={{ mb: 0.75 }}>
          Your User ID
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontFamily="monospace"
            sx={{ flex: 1, wordBreak: 'break-all', color: '#0C4A6E', fontSize: '0.8rem' }}>
            {userId}
          </Typography>
          <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
            <IconButton size="small" onClick={handleCopy} sx={{ color: '#0369A1', flexShrink: 0 }}>
              <ContentCopyIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="caption" color="#0369A1" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
          Share this with an administrator to get a subscription assigned.
        </Typography>
      </CardContent>
    </Card>
  );

  if (!subscription) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Card>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: 'rgba(71,85,105,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
              <RepeatIcon sx={{ fontSize: 26, color: 'text.disabled' }} />
            </Box>
            <Typography variant="h6" fontWeight={600} color="text.secondary">No active subscription</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
              Contact an administrator and share your User ID below.
            </Typography>
          </CardContent>
        </Card>
        {UserIdCard}
      </Box>
    );
  }

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Plan', value: subscription.plan ? (
        <Chip label={subscription.plan.name} size="small"
          sx={{ fontWeight: 600, bgcolor: '#F0FDF4', color: '#15803D' }} />
      ) : subscription.planId.slice(0, 8) + '…' },
    { label: 'Status',     value: <StatusChip status={subscription.status} /> },
    { label: 'Start Date', value: new Date(subscription.startDate).toLocaleDateString() },
    { label: 'End Date',   value: new Date(subscription.endDate).toLocaleDateString() },
    { label: 'Price / Period', value: subscription.plan ? `$${subscription.plan.price.toFixed(2)}` : '—' },
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

// ── ADMIN view ────────────────────────────────────────────────────────────────

export const Subscriptions = (): JSX.Element => {
  const { user } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const isAdmin = user?.role === 'ADMIN';

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans]                 = useState<Plan[]>([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(getEmptyCreateForm);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [editForm, setEditForm]     = useState<EditSubForm>({ planId: '', startDate: '', endDate: '' });

  // Cancel confirm
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null);

  const selectedCreatePlan = plans.find((p) => p.id === createForm.planId);
  const selectedEditPlan   = plans.find((p) => p.id === editForm.planId);

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

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCreate = async (): Promise<void> => {
    if (!createForm.userId.trim()) { showError('Client User ID is required'); return; }
    if (!createForm.planId)        { showError('Please select a plan'); return; }
    if (!createForm.startDate || !createForm.endDate) { showError('Both dates are required'); return; }
    if (createForm.endDate <= createForm.startDate)   { showError('End date must be after start date'); return; }

    setSaving(true);
    try {
      await createSubscription(createForm);
      showSuccess('Subscription created — invoice generated automatically');
      setCreateOpen(false);
      setCreateForm(getEmptyCreateForm());
      void fetchData();
    } catch (err) {
      showError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (sub: Subscription): void => {
    setEditTarget(sub);
    setEditForm({
      planId:    sub.planId,
      startDate: isoToInput(sub.startDate),
      endDate:   isoToInput(sub.endDate),
    });
  };

  const handleUpdate = async (): Promise<void> => {
    if (!editTarget) return;
    if (editForm.endDate && editForm.startDate && editForm.endDate <= editForm.startDate) {
      showError('End date must be after start date');
      return;
    }
    setSaving(true);
    try {
      const payload: { planId?: string; startDate?: string; endDate?: string } = {};
      if (editForm.planId)    { payload.planId    = editForm.planId;    }
      if (editForm.startDate) { payload.startDate = editForm.startDate; }
      if (editForm.endDate)   { payload.endDate   = editForm.endDate;   }
      await updateSubscription(editTarget.id, payload);
      showSuccess('Subscription updated');
      setEditTarget(null);
      void fetchData();
    } catch (err) {
      showError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (): Promise<void> => {
    if (!cancelTarget) return;
    setSaving(true);
    try {
      await cancelSubscription(cancelTarget.id);
      showSuccess('Subscription cancelled');
      setCancelTarget(null);
      void fetchData();
    } catch (err) {
      showError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ── Columns ─────────────────────────────────────────────────────────────────

  // v6 API: valueFormatter receives params.value
  const columns: GridColDef<Subscription>[] = [
    {
      field: 'id', headerName: 'ID', width: 110,
      valueFormatter: ({ value }: GridValueFormatterParams<string>) => value.slice(0, 8) + '…',
    },
    {
      field: 'userId', headerName: 'Client', width: 110,
      valueFormatter: ({ value }: GridValueFormatterParams<string>) => value.slice(0, 8) + '…',
    },
    {
      field: 'plan', headerName: 'Plan', width: 120,
      valueGetter: (params: GridValueGetterParams<Subscription>) =>
        params.row.plan?.name ?? params.row.planId.slice(0, 8),
      renderCell: ({ value }: GridRenderCellParams<Subscription, string>) => {
        const s = TIER_COLORS[value ?? ''];
        return s
          ? <Chip label={value} size="small"
              sx={{ bgcolor: s.bgcolor, color: s.color, fontWeight: 600, fontSize: '0.75rem' }} />
          : <Typography variant="body2">{value}</Typography>;
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
      field: 'plan.price', headerName: 'Price', width: 90,
      valueGetter: (params: GridValueGetterParams<Subscription>) =>
        params.row.plan?.price ?? null,
      valueFormatter: ({ value }: GridValueFormatterParams<number | null>) =>
        value !== null ? `$${value.toFixed(2)}` : '—',
    },
    {
      field: 'actions', headerName: '', width: 100, sortable: false, disableColumnMenu: true,
      renderCell: ({ row }: GridRenderCellParams<Subscription>) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit subscription">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {row.status === 'ACTIVE' && (
            <Tooltip title="Cancel subscription">
              <IconButton size="small" color="error" onClick={() => setCancelTarget(row)}>
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title="Subscriptions"
        subtitle="Create, edit and cancel client subscriptions. Invoices are generated automatically on creation."
        actions={
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => { setCreateForm(getEmptyCreateForm()); setCreateOpen(true); }}>
            Create Subscription
          </Button>
        }
      />

      <Card>
        {loading ? (
          <Box sx={{ p: 2 }}><TableSkeleton rows={5} columns={7} /></Box>
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

      {/* ── Create Subscription dialog ──────────────────────────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 0.5 }}>Create Subscription</DialogTitle>
        <DialogContent sx={{ pt: '12px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Client User ID"
            fullWidth
            value={createForm.userId}
            onChange={(e) => setCreateForm((p) => ({ ...p, userId: e.target.value.trim() }))}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            helperText="The CLIENT's UUID — they can copy it from their Subscriptions page"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutlineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Plan</InputLabel>
            <Select label="Plan" value={createForm.planId}
              onChange={(e) => setCreateForm((p) => ({ ...p, planId: e.target.value }))}>
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

          {selectedCreatePlan && (
            <Box sx={{ bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 2, px: 2, py: 1.25 }}>
              <Typography variant="caption" color="#15803D" fontWeight={600}>
                Invoice generated automatically for ${(
                  selectedCreatePlan.name === 'SILVER' ? selectedCreatePlan.price * 1.05
                  : selectedCreatePlan.name === 'GOLD'  ? selectedCreatePlan.price * 1.1
                  : selectedCreatePlan.price
                ).toFixed(2)} ({selectedCreatePlan.name} tier)
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Start Date" type="date" fullWidth value={createForm.startDate}
              onChange={(e) => setCreateForm((p) => ({ ...p, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              InputProps={{ startAdornment: <InputAdornment position="start"><CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }}
            />
            <TextField label="End Date" type="date" fullWidth value={createForm.endDate}
              onChange={(e) => setCreateForm((p) => ({ ...p, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              InputProps={{ startAdornment: <InputAdornment position="start"><CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleCreate()} disabled={saving}>
            {saving ? 'Creating…' : 'Create Subscription'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Subscription dialog ────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 0.5 }}>Edit Subscription</DialogTitle>
        <DialogContent sx={{ pt: '12px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="info" sx={{ py: 0.5 }}>
            Historical invoices are preserved and will not be recalculated.
          </Alert>

          <FormControl fullWidth size="small">
            <InputLabel>Plan</InputLabel>
            <Select label="Plan" value={editForm.planId}
              onChange={(e) => setEditForm((p) => ({ ...p, planId: e.target.value }))}>
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

          {selectedEditPlan && selectedEditPlan.id !== editTarget?.planId && (
            <Box sx={{ bgcolor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 2, px: 2, py: 1.25 }}>
              <Typography variant="caption" color="#92400E" fontWeight={600}>
                Changing plan does not generate a new invoice. Existing invoices remain unchanged.
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Start Date" type="date" fullWidth value={editForm.startDate}
              onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              InputProps={{ startAdornment: <InputAdornment position="start"><CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }}
            />
            <TextField label="End Date" type="date" fullWidth value={editForm.endDate}
              onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              InputProps={{ startAdornment: <InputAdornment position="start"><CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditTarget(null)}>Discard</Button>
          <Button variant="contained" onClick={() => void handleUpdate()} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Cancel Subscription confirm ─────────────────────────────────────── */}
      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)}>
        <DialogTitle>Cancel subscription?</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <DialogContentText>
            This will immediately expire the subscription for client{' '}
            <strong>{cancelTarget?.userId.slice(0, 12)}…</strong>
          </DialogContentText>
          <Alert severity="warning" sx={{ py: 0.5 }}>
            The CLIENT will lose access to premium features. Historical invoices and records are preserved.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelTarget(null)}>Keep Active</Button>
          <Button variant="contained" color="error"
            onClick={() => void handleCancel()} disabled={saving}>
            {saving ? 'Cancelling…' : 'Cancel Subscription'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
