// Invoices — ADMIN: all invoices + Edit Status | CLIENT: own invoices + Pay Now
//
// ADMIN endpoint:  PATCH /api/invoices/:id/status  — manual status override
// CLIENT endpoint: PATCH /api/invoices/:id/pay     — own invoices only
// CLIENT read:     GET   /api/invoices/me           — requires active subscription
//
// Access control display:
//   - Status chip shows ACTIVE/EXPIRED prominently for CLIENT
//   - 403 from /invoices/me = expired subscription → locked UI with explanation
//   - Pay Now intentionally accessible even when subscription is expired

import { useEffect, useState } from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/EditOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
  type GridValueFormatterParams,
} from '@mui/x-data-grid';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { getAllInvoices, getMyInvoices, payInvoice, adminUpdateInvoiceStatus } from '../api/invoices.api';
import { getMySubscription } from '../api/subscriptions.api';
import { getApiErrorMessage } from '../api/axiosInstance';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { TableSkeleton } from '../components/common/TableSkeleton';
import type { Invoice, InvoiceStatus, SubscriptionStatus } from '../types';

const STATUS_CHIP: Record<InvoiceStatus, { bgcolor: string; color: string }> = {
  PENDING: { bgcolor: '#FFFBEB', color: '#D97706' },
  PAID:    { bgcolor: '#F0FDF4', color: '#16A34A' },
  OVERDUE: { bgcolor: '#FEF2F2', color: '#DC2626' },
};
const ALL_STATUSES: InvoiceStatus[] = ['PENDING', 'PAID', 'OVERDUE'];

export const Invoices = (): JSX.Element => {
  const { user } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const isAdmin = user?.role === 'ADMIN';

  const [invoices, setInvoices]         = useState<Invoice[]>([]);
  const [loading, setLoading]           = useState(true);
  const [paying, setPaying]             = useState<string | null>(null);
  const [isLocked, setIsLocked]         = useState(false);
  const [subStatus, setSubStatus]       = useState<SubscriptionStatus | null>(null);

  // ADMIN: Edit Status dialog
  const [statusTarget, setStatusTarget] = useState<Invoice | null>(null);
  const [newStatus, setNewStatus]       = useState<InvoiceStatus>('PENDING');
  const [updating, setUpdating]         = useState(false);

  const fetchInvoices = async (): Promise<void> => {
    try {
      setLoading(true);
      setIsLocked(false);

      if (!isAdmin) {
        // CLIENT: fetch subscription status for the chip (no checkSubscription on this endpoint)
        const sub = await getMySubscription();
        setSubStatus(sub?.status ?? null);
      }

      const data = isAdmin ? await getAllInvoices() : await getMyInvoices();
      setInvoices(data);
    } catch (err) {
      if (!isAdmin && axios.isAxiosError(err) && err.response?.status === 403) {
        // Backend's checkSubscriptionStatus middleware blocked the request:
        // subscription is EXPIRED — show locked UI instead of error snackbar
        setIsLocked(true);
        setSubStatus('EXPIRED');
      } else {
        showError(getApiErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchInvoices(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePay = async (invoiceId: string): Promise<void> => {
    setPaying(invoiceId);
    try {
      await payInvoice(invoiceId);
      showSuccess('Invoice paid successfully!');
      void fetchInvoices();
    } catch (err) {
      showError(getApiErrorMessage(err));
    } finally {
      setPaying(null);
    }
  };

  const openStatusEdit = (invoice: Invoice): void => {
    setStatusTarget(invoice);
    setNewStatus(invoice.status);
  };

  const handleUpdateStatus = async (): Promise<void> => {
    if (!statusTarget) return;
    setUpdating(true);
    try {
      await adminUpdateInvoiceStatus(statusTarget.id, newStatus);
      showSuccess(`Invoice status updated to ${newStatus}`);
      setStatusTarget(null);
      void fetchInvoices();
    } catch (err) {
      showError(getApiErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  // ── Columns ────────────────────────────────────────────────────────────────

  const baseColumns: GridColDef<Invoice>[] = [
    {
      field: 'id', headerName: 'Invoice #', width: 120,
      valueFormatter: ({ value }: GridValueFormatterParams<string>) => value.slice(0, 8).toUpperCase(),
    },
    {
      field: 'amount', headerName: 'Amount', width: 120,
      valueFormatter: ({ value }: GridValueFormatterParams<number>) =>
        `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      field: 'status', headerName: 'Status', width: 130,
      renderCell: ({ value }: GridRenderCellParams<Invoice, InvoiceStatus>) =>
        value ? <StatusChip status={value} /> : null,
    },
    {
      field: 'dueDate', headerName: 'Due Date', width: 130,
      valueFormatter: ({ value }: GridValueFormatterParams<string>) => new Date(value).toLocaleDateString(),
    },
    {
      field: 'createdAt', headerName: 'Issued', width: 120,
      valueFormatter: ({ value }: GridValueFormatterParams<string>) => new Date(value).toLocaleDateString(),
    },
  ];

  const adminColumns: GridColDef<Invoice>[] = [
    ...baseColumns,
    {
      field: 'subscriptionId', headerName: 'Subscription', width: 130,
      valueFormatter: ({ value }: GridValueFormatterParams<string>) => value.slice(0, 8) + '…',
    },
    {
      field: 'actions', headerName: '', width: 60, sortable: false, disableColumnMenu: true,
      renderCell: ({ row }: GridRenderCellParams<Invoice>) => (
        <Tooltip title="Edit status">
          <IconButton size="small" onClick={() => openStatusEdit(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const clientColumns: GridColDef<Invoice>[] = [
    ...baseColumns,
    {
      field: 'actions', headerName: '', width: 110, sortable: false, disableColumnMenu: true,
      renderCell: ({ row }: GridRenderCellParams<Invoice>) =>
        row.status === 'PENDING' || row.status === 'OVERDUE' ? (
          <Button variant="contained" size="small"
            disabled={paying === row.id}
            onClick={() => void handlePay(row.id)}
            sx={{ height: 28, fontSize: '0.75rem' }}>
            {paying === row.id ? 'Paying…' : 'Pay Now'}
          </Button>
        ) : null,
    },
  ];

  const columns = isAdmin ? adminColumns : clientColumns;

  const summaryStats = {
    pending: invoices.filter((i) => i.status === 'PENDING').length,
    paid:    invoices.filter((i) => i.status === 'PAID').length,
    overdue: invoices.filter((i) => i.status === 'OVERDUE').length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title="Invoices"
        subtitle={isAdmin ? 'All platform invoices — edit status to correct any discrepancy' : 'Your invoice history'}
      />

      {/* MEJORA 5: Global subscription status chip for CLIENT */}
      {!isAdmin && subStatus && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, p: 2,
          bgcolor: subStatus === 'ACTIVE' ? '#F0FDF4' : '#FEF2F2',
          border: `1.5px solid ${subStatus === 'ACTIVE' ? '#86EFAC' : '#FCA5A5'}`,
          borderRadius: 2,
        }}>
          {subStatus === 'ACTIVE'
            ? <CheckCircleOutlineIcon sx={{ color: '#16A34A', fontSize: 22 }} />
            : <LockOutlinedIcon sx={{ color: '#DC2626', fontSize: 22 }} />
          }
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={700}
              color={subStatus === 'ACTIVE' ? '#15803D' : '#DC2626'}>
              {subStatus === 'ACTIVE' ? 'Subscription Active' : 'Subscription Expired'}
            </Typography>
            <Typography variant="caption" color={subStatus === 'ACTIVE' ? '#15803D' : '#DC2626'} sx={{ opacity: 0.8 }}>
              {subStatus === 'ACTIVE'
                ? 'Premium features enabled — your invoices are visible below.'
                : 'Your premium features have been disabled until renewal.'}
            </Typography>
          </Box>
          <Chip label={subStatus} size="small"
            sx={{ fontWeight: 700, bgcolor: subStatus === 'ACTIVE' ? '#16A34A' : '#DC2626', color: '#FFFFFF' }}
          />
        </Box>
      )}

      {/* MEJORA 4: Locked UI when subscription is expired */}
      {!isAdmin && isLocked && !loading && (
        <Card sx={{ border: '1.5px solid #FECACA', bgcolor: '#FEF2F2', mb: 2 }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: '#FEE2E2',
              display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <LockOutlinedIcon sx={{ fontSize: 32, color: '#DC2626' }} />
            </Box>
            <Typography variant="h6" fontWeight={700} color="#DC2626" sx={{ mb: 1 }}>
              Locked Feature
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 400, mx: 'auto' }}>
              Your subscription must be active to access invoice history.
              This is a premium feature restricted to active subscribers.
            </Typography>
            <Alert severity="warning" sx={{ textAlign: 'left', maxWidth: 480, mx: 'auto' }}>
              <AlertTitle>Renewal Required</AlertTitle>
              Contact an administrator to renew your subscription and restore access to premium features.
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Quick stats (shown when data available) */}
      {!loading && !isLocked && invoices.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            { label: 'Pending',  value: summaryStats.pending,  color: '#D97706', bg: '#FFFBEB' },
            { label: 'Paid',     value: summaryStats.paid,     color: '#16A34A', bg: '#F0FDF4' },
            { label: 'Overdue',  value: summaryStats.overdue,  color: '#DC2626', bg: '#FEF2F2' },
          ].map((s) => (
            <Box key={s.label} sx={{ px: 2, py: 1.25, bgcolor: s.bg, borderRadius: 2,
              display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: s.color, lineHeight: 1 }}>
                {s.value}
              </Typography>
              <Typography variant="caption" sx={{ color: s.color, fontWeight: 500 }}>
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Invoice table (hidden when locked) */}
      {(!isLocked || isAdmin) && (
        <Card>
          {loading ? (
            <Box sx={{ p: 2 }}><TableSkeleton rows={6} columns={5} /></Box>
          ) : invoices.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">No invoices found.</Typography>
            </Box>
          ) : (
            <DataGrid
              rows={invoices}
              columns={columns}
              autoHeight
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              disableRowSelectionOnClick
            />
          )}
        </Card>
      )}

      {/* ── ADMIN: Edit Status dialog ──────────────────────────────────── */}
      <Dialog open={!!statusTarget} onClose={() => setStatusTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 0.5 }}>Edit Invoice Status</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 2, p: 2, mb: 2 }}>
            <Grid container spacing={1.5}>
              {[
                { label: 'Invoice #', value: statusTarget?.id.slice(0, 8).toUpperCase() ?? '' },
                { label: 'Amount',    value: statusTarget ? `$${statusTarget.amount.toFixed(2)}` : '' },
                { label: 'Due Date',  value: statusTarget ? new Date(statusTarget.dueDate).toLocaleDateString() : '' },
              ].map((f) => (
                <Grid item xs={4} key={f.label}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}
                    textTransform="uppercase" letterSpacing="0.05em" display="block">
                    {f.label}
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>{f.value}</Typography>
                </Grid>
              ))}
            </Grid>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}
                textTransform="uppercase" letterSpacing="0.05em">Current:</Typography>
              {statusTarget && <StatusChip status={statusTarget.status} />}
            </Box>
          </Box>

          <FormControl fullWidth size="small">
            <InputLabel>New Status</InputLabel>
            <Select label="New Status" value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as InvoiceStatus)}>
              {ALL_STATUSES.map((s) => {
                const style = STATUS_CHIP[s];
                return (
                  <MenuItem key={s} value={s}>
                    <Chip label={s} size="small"
                      sx={{ bgcolor: style.bgcolor, color: style.color, fontWeight: 600, fontSize: '0.75rem' }} />
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {statusTarget && newStatus !== statusTarget.status && (
            <Box sx={{ mt: 1.5, px: 1.5, py: 1, bgcolor: '#F0F9FF', borderRadius: 1.5,
              border: '1px solid #BAE6FD', display: 'flex', alignItems: 'center', gap: 1 }}>
              <StatusChip status={statusTarget.status} />
              <Typography variant="caption" color="text.secondary" sx={{ mx: 0.5 }}>→</Typography>
              <StatusChip status={newStatus} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setStatusTarget(null)}>Cancel</Button>
          <Button variant="contained"
            onClick={() => void handleUpdateStatus()}
            disabled={updating || !statusTarget || newStatus === statusTarget?.status}>
            {updating ? 'Updating…' : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
