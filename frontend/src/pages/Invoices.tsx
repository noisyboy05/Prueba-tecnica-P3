// Invoices — ADMIN: all invoices DataGrid | CLIENT: own invoices + Pay button
// NOTE (future): GET /api/invoices/me has checkSubscription on backend.
// If CLIENT subscription is expired, the API returns 403 and a helpful message is shown.
// The Pay endpoint intentionally does NOT require an active subscription.

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { useAuth } from '../hooks/useAuth';
import { useSnackbar } from '../hooks/useSnackbar';
import { getAllInvoices, getMyInvoices, payInvoice } from '../api/invoices.api';
import { getApiErrorMessage } from '../api/axiosInstance';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { TableSkeleton } from '../components/common/TableSkeleton';
import type { Invoice, InvoiceStatus } from '../types';

export const Invoices = (): JSX.Element => {
  const { user } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const isAdmin = user?.role === 'ADMIN';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [paying, setPaying]     = useState<string | null>(null);

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

  const columns: GridColDef<Invoice>[] = [
    {
      field: 'id',
      headerName: 'Invoice #',
      width: 130,
      valueFormatter: (v: unknown) => String(v).slice(0, 8).toUpperCase(),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      valueFormatter: (v: unknown) =>
        `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: ({ value }: GridRenderCellParams<Invoice, InvoiceStatus>) => (
        <StatusChip status={value} />
      ),
    },
    {
      field: 'dueDate',
      headerName: 'Due Date',
      width: 140,
      valueFormatter: (v: unknown) => new Date(String(v)).toLocaleDateString(),
    },
    {
      field: 'createdAt',
      headerName: 'Issued',
      width: 140,
      valueFormatter: (v: unknown) => new Date(String(v)).toLocaleDateString(),
    },
    ...(isAdmin
      ? [{
          field: 'subscriptionId',
          headerName: 'Subscription',
          width: 140,
          valueFormatter: (v: unknown) => String(v).slice(0, 8) + '…',
        } as GridColDef<Invoice>]
      : [{
          field: 'actions',
          headerName: '',
          width: 110,
          sortable: false,
          disableColumnMenu: true,
          renderCell: ({ row }: GridRenderCellParams<Invoice>) =>
            row.status === 'PENDING' || row.status === 'OVERDUE' ? (
              <Button
                variant="contained"
                size="small"
                disabled={paying === row.id}
                onClick={() => void handlePay(row.id)}
                sx={{ height: 28, fontSize: '0.75rem' }}
              >
                {paying === row.id ? 'Paying…' : 'Pay Now'}
              </Button>
            ) : null,
        } as GridColDef<Invoice>]),
  ];

  const summaryStats = {
    pending: invoices.filter((i) => i.status === 'PENDING').length,
    paid:    invoices.filter((i) => i.status === 'PAID').length,
    overdue: invoices.filter((i) => i.status === 'OVERDUE').length,
  };

  return (
    <Box>
      <PageHeader
        title="Invoices"
        subtitle={isAdmin ? 'All platform invoices' : 'Your invoice history'}
      />

      {/* Quick stats */}
      {!loading && invoices.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            { label: 'Pending',  value: summaryStats.pending,  color: '#D97706', bg: '#FFFBEB' },
            { label: 'Paid',     value: summaryStats.paid,     color: '#16A34A', bg: '#F0FDF4' },
            { label: 'Overdue',  value: summaryStats.overdue,  color: '#DC2626', bg: '#FEF2F2' },
          ].map((s) => (
            <Box
              key={s.label}
              sx={{
                px: 2, py: 1.25,
                bgcolor: s.bg,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
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
    </Box>
  );
};
