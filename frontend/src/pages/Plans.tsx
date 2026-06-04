// Plans — DataGrid with CRUD for ADMIN, read-only view for CLIENT

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
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
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
  type GridValueFormatterParams,
} from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { getPlans, createPlan, updatePlan, deletePlan } from '../api/plans.api';
import { getApiErrorMessage } from '../api/axiosInstance';
import { PageHeader } from '../components/common/PageHeader';
import { TableSkeleton } from '../components/common/TableSkeleton';
import type { Plan, PlanName } from '../types';

const PLAN_NAMES: PlanName[] = ['BRONZE', 'SILVER', 'GOLD'];

const PLAN_COLORS: Record<PlanName, string> = {
  BRONZE: '#CD7F32',
  SILVER: '#64748B',
  GOLD:   '#D97706',
};

interface FormState {
  name: PlanName;
  price: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: 'BRONZE', price: '', description: '' };

export const Plans = (): JSX.Element => {
  const { user } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const isAdmin = user?.role === 'ADMIN';

  const [plans, setPlans]         = useState<Plan[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [editTarget, setEditTarget]     = useState<Plan | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<FormState>>({});

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
        await updatePlan(editTarget.id, {
          price: Number(form.price),
          description: form.description,
        });
        showSuccess('Plan updated successfully');
      } else {
        await createPlan({ name: form.name, price: Number(form.price), description: form.description });
        showSuccess('Plan created successfully');
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

  const columns: GridColDef<Plan>[] = [
    {
      field: 'name', headerName: 'Tier', width: 110,
      renderCell: ({ value }: GridRenderCellParams<Plan, PlanName>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: value ? PLAN_COLORS[value] : 'grey.400' }} />
          {value}
        </Box>
      ),
    },
    {
      field: 'price', headerName: 'Price (USD)', width: 130,
      // v6 API: valueFormatter receives params.value, not the raw value directly
      valueFormatter: ({ value }: GridValueFormatterParams<number>) => `$${value.toFixed(2)}`,
    },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 200 },
    {
      field: 'createdAt', headerName: 'Created', width: 150,
      valueFormatter: ({ value }: GridValueFormatterParams<string>) =>
        new Date(value).toLocaleDateString(),
    },
    ...(isAdmin ? [{
      field: 'actions',
      headerName: '',
      width: 90,
      sortable: false,
      disableColumnMenu: true,
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
    } as GridColDef<Plan>] : []),
  ];

  return (
    <Box>
      <PageHeader
        title="Plans"
        subtitle="Manage BRONZE, SILVER and GOLD subscription tiers"
        actions={
          isAdmin ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              New Plan
            </Button>
          ) : undefined
        }
      />

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
            sx={{ minHeight: 300 }}
          />
        )}
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTarget ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!editTarget && (
            <FormControl fullWidth size="small">
              <InputLabel>Tier</InputLabel>
              <Select
                label="Tier"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value as PlanName }))}
              >
                {PLAN_NAMES.map((n) => (
                  <MenuItem key={n} value={n}>{n}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField
            label="Price (USD)"
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
            rows={3}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            error={!!formErrors.description}
            helperText={formErrors.description}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete plan?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete the <strong>{deleteTarget?.name}</strong> plan.
            Active subscriptions on this plan must be cancelled first.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => void handleDelete()} disabled={saving}>
            {saving ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
