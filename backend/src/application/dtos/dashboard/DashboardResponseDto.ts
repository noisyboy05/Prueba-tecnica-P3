// DashboardResponseDto — Output DTO for admin metrics
// Aggregates counters for the ADMIN dashboard view.

export interface DashboardResponseDto {
  totalUsers: number;
  totalPlans: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  totalInvoices: number;
  pendingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalRevenue: number;
}
