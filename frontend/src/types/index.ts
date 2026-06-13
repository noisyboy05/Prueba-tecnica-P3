// Frontend shared types — mirror backend response DTOs and API envelope

export type UserRole = 'ADMIN' | 'CLIENT';
export type PlanName = 'BRONZE' | 'SILVER' | 'GOLD';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED';
export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE';

// ── API envelope ──────────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[] | undefined>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ── Domain models ─────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: PlanName;
  price: number;
  description: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  createdAt: string;
  plan?: Plan;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
}

export interface DashboardMetrics {
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
