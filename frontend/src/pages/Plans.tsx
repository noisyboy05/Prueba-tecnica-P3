// Plans — Subscription tier management (ADMIN) / read-only (CLIENT)
//
// Business model note:
//   BRONZE, SILVER and GOLD are fixed by the PlanName enum in the backend.
//   Each tier is unique (@unique constraint on plan.name).
//   The seed creates all 3 at system initialization.
//
//   "Create Plan" is removed from the UI because:
//   - All 3 tiers already exist after db:init
//   - Attempting to create an existing tier returns PlanAlreadyExistsError (409)
//   - Tiers are system constants, not user-defined resources
//
//   ADR coherence: "CRUD planes" in the ADR refers to configuring the existing
//   tiers (pricing, description), not ad-hoc tier creation.
//   Edit and Delete (protected by PlanInUseError) remain as valid admin actions.

import { useEffect, useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
  type GridValueFormatterParams,
} from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import LayersIcon from '@mui/icons-material/LayersOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDownOutlined';
import BarChartIcon from '@mui/icons-material/BarChartOutlined';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { getPlans, updatePlan, deletePlan } from '../api/plans.api';
import { getApiErrorMessage } from '../api/axiosInstance';
import { PageHeader } from '../components/common/PageHeader';
import { TableSkeleton } from '../components/common/TableSkeleton';
import type { Plan, PlanName } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_CHIP: Record<PlanName, { bgcolor: string; color: string }> = {
  BRONZE: { bgcolor: '#FEF3C7', color: '#92400E' },
  SILVER: { bgcolor: '#F1F5F9', color: '#475569' },
  GOLD:   { bgcolor: '#FEF9C3', color: '#854D0E' },
};

// Edit form only covers mutable fields — tier name is immutable after creation
interface EditForm {
  price: string;
  description: string;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

const StatCard = ({
  label, value, icon, loading,
}: {
  label: string; value: string; icon: JSX.Element; loading: boolean;
}): JSX.Element => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box
          sx={{
            width: 38, height: 38, borderRadius: 2,
            bgcolor: 'rgba(71,85,105,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            '& svg': { fontSize: 20, color: 'secondary.main' },
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}
            textTransform="uppercase" letterSpacing="0.06em" display="block">
            {label}
          </Typography>
          {loading
            ? <Skeleton variant="text" width="60%" height={32} />
            : <Typography variant="h6" fontWeight={700} sx={{ mt: 0.25 }}>{value}</Typography>}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const Plans = (): JSX.Element => {
  const { user } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const isAdmin = user?.role === 'ADMIN';

  const [plans, setPlans]               = useState<Plan[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [editTarget, setEditTarget]     = useState<Plan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [form, setForm]                 = useState<EditForm>({ price: '', description: '' });
  const [formErrors, setFormErrors]     = useState<Partial<EditForm>>({});

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (plans.length === 0) return { total: 0, avg: 0, highest: 0, lowest: 0 };
    const prices = plans.map((p) => p.price);
    return {
      total:   plans.length,
      avg:     prices.reduce((a, b) => a + b, 0) / prices.length,
      highest: Math.max(...prices),
      lowest:  Math.min(...prices),
    };
  }, [plans]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPlans = async (): Promise<void> => {
    try {
      setLoading(true);
      setPlans(await getPlans());
    } catch (err) {
      showError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchPlans(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Edit handlers ──────────────────────────────────────────────────────────

  const openEdit = (plan: Plan): void => {
    setEditTarget(plan);
    setForm({ price: String(plan.price), description: plan.description });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errs: Partial<EditForm> = {};
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
      errs.price = 'Price must be a positive number';
    if (!form.description.trim()) errs.description = 'Description is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (): Promise<void> => {
    if (!editTarget || !validateForm()) return;
    setSaving(true);
    try {
      await updatePlan(editTarget.id, {
        price: Number(form.price),
        description: form.description,
      });
      showSuccess(`${editTarget.name} tier updated`);
      setEditTarget(null);
      void fetchPlans();
    } catch (err) {
      showError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deletePlan(deleteTarget.id);
      showSuccess(`${deleteTarget.name} tier removed`);
      setDeleteTarget(null);
      void fetchPlans();
    } catch (err) {
      showError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns: GridColDef<Plan>[] = [
    {
      field: 'name', headerName: 'Tier', width: 120,
      renderCell: ({ value }: GridRenderCellParams<Plan, PlanName>) => {
        if (!value) return null;
        const s = TIER_CHIP[value];
        return (
          <Chip label={value} size="small"
            sx={{ bgcolor: s.bgcolor, color: s.color, fontWeight: 600, fontSize: '0.75rem' }}
          />
        );
      },
    },
    {
      field: 'price', headerName: 'Price / Period', width: 140,
      valueFormatter: ({ value }: GridValueFormatterParams<number>) => `$${value.toFixed(2)}`,
    },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 180 },
    {
      field: 'createdAt', headerName: 'Created', width: 120,
      valueFormatter: ({ value }: GridValueFormatterParams<string>) =>
        new Date(value).toLocaleDateString(),
    },
    ...(isAdmin
      ? [{
          field: 'actions', headerName: '', width: 90, sortable: false, disableColumnMenu: true,
          renderCell: ({ row }: GridRenderCellParams<Plan>) => (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton size="small" title="Edit tier pricing" onClick={() => openEdit(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" title="Remove tier" onClick={() => setDeleteTarget(row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ),
        } as GridColDef<Plan>]
      : []),
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title="Subscription Tiers"
        subtitle="Configure pricing and descriptions for BRONZE, SILVER and GOLD — the system's fixed billing tiers."
      />

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard label="Active Tiers"   value={String(stats.total)} icon={<LayersIcon />}      loading={loading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Average Price"  value={loading ? '—' : `$${stats.avg.toFixed(2)}`}     icon={<BarChartIcon />}     loading={loading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Highest Price"  value={loading || !stats.highest ? '—' : `$${stats.highest.toFixed(2)}`} icon={<TrendingUpIcon />}  loading={loading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Lowest Price"   value={loading || !stats.lowest  ? '—' : `$${stats.lowest.toFixed(2)}`}  icon={<TrendingDownIcon />} loading={loading} />
        </Grid>
      </Grid>

      {/* Tier table */}
      <Card>
        {loading ? (
          <Box sx={{ p: 2 }}><TableSkeleton rows={3} columns={4} /></Box>
        ) : (
          <DataGrid
            rows={plans}
            columns={columns}
            autoHeight
            hideFooter={plans.length <= 10}
            pageSizeOptions={[10]}
            disableRowSelectionOnClick
            sx={{ minHeight: 220 }}
          />
        )}
      </Card>

      {/* Edit tier dialog — only price and description are mutable */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 0.5 }}>
          Edit{' '}
          {editTarget && (
            <Chip label={editTarget.name} size="small"
              sx={{
                ml: 1,
                bgcolor: TIER_CHIP[editTarget.name]?.bgcolor,
                color:   TIER_CHIP[editTarget.name]?.color,
                fontWeight: 600,
                verticalAlign: 'middle',
              }}
            />
          )}
          {' '}Tier
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="info" sx={{ py: 0.5 }}>
            The tier name is immutable. Only price and description can be updated.
          </Alert>
          <TextField
            label="Price per period (USD)"
            type="number"
            fullWidth
            value={form.price}
            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
            error={!!formErrors.price}
            helperText={formErrors.price}
            inputProps={{ min: 0, step: '0.01' }}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            error={!!formErrors.description}
            helperText={formErrors.description}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete tier dialog — clear warning about business implications */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Remove {deleteTarget?.name} tier?</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <DialogContentText>
            This removes the <strong>{deleteTarget?.name}</strong> billing tier from the system.
          </DialogContentText>
          <Alert severity="warning" sx={{ py: 0.5 }}>
            <strong>Only possible if no subscriptions exist for this tier.</strong>{' '}
            New subscriptions cannot be created for a removed tier.
            To restore it, run <code>npm run seed</code> in the backend.
          </Alert>
          <DialogContentText sx={{ fontSize: '0.875rem' }}>
            Proceed only if you intend to discontinue this tier permanently.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => void handleDelete()} disabled={saving}>
            {saving ? 'Removing…' : 'Remove Tier'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
