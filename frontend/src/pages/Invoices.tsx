// Invoices — ADMIN: all invoices + Edit Status | CLIENT: own invoices + Pay Now
//
// ADMIN endpoint:  PATCH /api/invoices/:id/status  — manual status override
// CLIENT endpoint: PATCH /api/invoices/:id/pay     — own invoices only

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
  type GridValueFormatterParams,
} from '@mui/x-data-grid';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { getAllInvoices, getMyInvoices, payInvoice, adminUpdateInvoiceStatus } from '../api/invoices.api';
import { getApiErrorMessage } from '../api/axiosInstance';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { TableSkeleton } from '../components/common/TableSkeleton';
import type { Invoice, InvoiceStatus } from '../types';

// Status chip colors for the Select options
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

  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [loading, setLoading]     = useState(true);
  const [paying, setPaying]       = useState<string | null>(null);

  // ADMIN: Edit Status dialog
  const [statusTarget, setStatusTarget] = useState<Invoice | null>(null);
  const [newStatus, setNewStatus]       = useState<InvoiceStatus>('PENDING');
  const [updating, setUpdating]         = useState(false);

  const fetchInvoices = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = isAdmin ? await getAllInvoices() : await getMyInvoices();
      setInvoices(data);
    } catch (err) {
      showError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchInvoices(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // CLIENT: pay invoice
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

  // ADMIN: open Edit Status dialog
  const openStatusEdit = (invoice: Invoice): void => {
    setStatusTarget(invoice);
    setNewStatus(invoice.status);
  };

  // ADMIN: confirm status change
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

  // ── Columns ──────────────────────────────────────────────────────────────────

  // v6 API: valueFormatter receives params.value
  const baseColumns: GridColDef<Invoice>[] = [
    {
      field: 'id', headerName: 'Invoice #', width: 120,
      valueFormatter: ({ value }: GridValueFormatterParams<string>) =>
        value.slice(0, 8).toUpperCase(),
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
      valueFormatter: ({ value }: GridValueFormatterParams<string>) =>
        new Date(value).toLocaleDateString(),
    },
    {
      field: 'createdAt', headerName: 'Issued', width: 120,
      valueFormatter: ({ value }: GridValueFormatterParams<string>) =>
        new Date(value).toLocaleDateString(),
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

  // ── Stats ─────────────────────────────────────────────────────────────────

  const summaryStats = {
    pending: invoices.filter((i) => i.status === 'PENDING').length,
    paid:    invoices.filter((i) => i.status === 'PAID').length,
    overdue: invoices.filter((i) => i.status === 'OVERDUE').length,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title="Invoices"
        subtitle={isAdmin ? 'All platform invoices — edit status to correct any discrepancy' : 'Your invoice history'}
      />

      {/* Quick stats */}
      {!loading && invoices.length > 0 && (
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

      {/* ── ADMIN: Edit Status dialog ─────────────────────────────────────── */}
      <Dialog open={!!statusTarget} onClose={() => setStatusTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 0.5 }}>Edit Invoice Status</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>

          {/* Readonly invoice summary */}
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
                textTransform="uppercase" letterSpacing="0.05em">
                Current:
              </Typography>
              {statusTarget && <StatusChip status={statusTarget.status} />}
            </Box>
          </Box>

          {/* New status selector */}
          <FormControl fullWidth size="small">
            <InputLabel>New Status</InputLabel>
            <Select
              label="New Status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as InvoiceStatus)}
            >
              {ALL_STATUSES.map((s) => {
                const style = STATUS_CHIP[s];
                return (
                  <MenuItem key={s} value={s}>
                    <Chip label={s} size="small"
                      sx={{ bgcolor: style.bgcolor, color: style.color, fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Change summary */}
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
          <Button
            variant="contained"
            onClick={() => void handleUpdateStatus()}
            disabled={updating || !statusTarget || newStatus === statusTarget?.status}
          >
            {updating ? 'Updating…' : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
