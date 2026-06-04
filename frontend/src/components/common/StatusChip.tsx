// StatusChip — colored chip for subscription and invoice status values

import Chip from '@mui/material/Chip';
import type { SubscriptionStatus, InvoiceStatus } from '../../types';

type Status = SubscriptionStatus | InvoiceStatus;

const CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  ACTIVE:   { label: 'Active',   color: '#15803D', bg: '#F0FDF4' },
  EXPIRED:  { label: 'Expired',  color: '#DC2626', bg: '#FEF2F2' },
  PENDING:  { label: 'Pending',  color: '#D97706', bg: '#FFFBEB' },
  PAID:     { label: 'Paid',     color: '#15803D', bg: '#F0FDF4' },
  OVERDUE:  { label: 'Overdue',  color: '#DC2626', bg: '#FEF2F2' },
};

interface StatusChipProps {
  status: Status;
}

export const StatusChip = ({ status }: StatusChipProps): JSX.Element => {
  const cfg = CONFIG[status] ?? { label: status, color: '#475569', bg: '#F8FAFC' };
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: '0.75rem', height: 24 }}
    />
  );
};
