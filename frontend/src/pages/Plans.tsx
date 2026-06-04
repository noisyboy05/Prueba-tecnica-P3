// Plans — Summary stats + DataGrid CRUD (ADMIN) / read-only (CLIENT)

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
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
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
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import LayersIcon from '@mui/icons-material/LayersOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDownOutlined';
import BarChartIcon from '@mui/icons-material/BarChartOutlined';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { getPlans, createPlan, updatePlan, deletePlan } from '../api/plans.api';
import { getApiErrorMessage } from '../api/axiosInstance';
import { PageHeader } from '../components/common/PageHeader';
import { TableSkeleton } from '../components/common/TableSkeleton';
import type { Plan, PlanName } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PLAN_NAMES: PlanName[] = ['BRONZE', 'SILVER', 'GOLD'];

const TIER_CHIP: Record<PlanName, { bgcolor: string; color: string }> = {
  BRONZE: { bgcolor: '#FEF3C7', color: '#92400E' },
  SILVER: { bgcolor: '#F1F5F9', color: '#475569' },
  GOLD:   { bgcolor: '#FEF9C3', color: '#854D0E' },
};

interface FormState {
  name: PlanName;
  price: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: 'BRONZE', price: '', description: '' };

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
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [editTarget, setEditTarget]     = useState<Plan | null>(null);
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors]     = useState<Partial<FormState>>({});

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

  // ── Dialog handlers ────────────────────────────────────────────────────────

  const openCreate = (): void => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan): void => {
    setEditTarget(plan);
    setForm({ name: plan.name, price: String(plan.price), description: plan.description });
    setFormErrors({});
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const errs: Partial<FormState> = {};
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
      errs.price = 'Price must be a positive number';
    if (!form.description.trim()) errs.description = 'Description is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (): Promise<void> => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updatePlan(editTarget.id, { price: Number(form.price), description: form.description });
        showSuccess('Plan updated');
      } else {
        await createPlan({ name: form.name, price: Number(form.price), description: form.description });
        showSuccess(`${form.name} plan created`);
      }
      setDialogOpen(false);
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
      showSuccess('Plan deleted');
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
      field: 'name', headerName: 'Plan', width: 120,
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
              <IconButton size="small" onClick={() => openEdit(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
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
        title="Plans"
        subtitle="Manage subscription plans, pricing and customer tiers."
        actions={
          isAdmin ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Create Plan
            </Button>
          ) : undefined
        }
      />

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard label="Total Plans"   value={String(stats.total)} icon={<LayersIcon />}     loading={loading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Average Price" value={loading ? '—' : `$${stats.avg.toFixed(2)}`}    icon={<BarChartIcon />}    loading={loading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Highest Price" value={loading || !stats.highest ? '—' : `$${stats.highest.toFixed(2)}`} icon={<TrendingUpIcon />} loading={loading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Lowest Price"  value={loading || !stats.lowest ? '—' : `$${stats.lowest.toFixed(2)}`}  icon={<TrendingDownIcon />} loading={loading} />
        </Grid>
      </Grid>

      {/* Plans table */}
      <Card>
        {loading ? (
          <Box sx={{ p: 2 }}><TableSkeleton rows={3} columns={4} /></Box>
        ) : (
          <DataGrid
            rows={plans}
            columns={columns}
            autoHeight
            pageSizeOptions={[10, 25]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            disableRowSelectionOnClick
            sx={{ minHeight: 220 }}
          />
        )}
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 0.5 }}>
          {editTarget ? `Edit — ${editTarget.name}` : 'Create New Plan'}
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!editTarget && (
            <FormControl fullWidth size="small">
              <InputLabel>Plan Tier</InputLabel>
              <Select
                label="Plan Tier"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value as PlanName }))}
              >
                {PLAN_NAMES.map((n) => (
                  <MenuItem key={n} value={n}>
                    <Chip label={n} size="small"
                      sx={{ bgcolor: TIER_CHIP[n].bgcolor, color: TIER_CHIP[n].color, fontWeight: 600 }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
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
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Plan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This permanently removes the <strong>{deleteTarget?.name}</strong> plan. Plans with
            active subscriptions cannot be deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => void handleDelete()} disabled={saving}>
            {saving ? 'Deleting…' : 'Delete Plan'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
