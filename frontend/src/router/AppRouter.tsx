// AppRouter — React Router v6 route tree
// Public routes: /login
// Protected routes (AppShell layout): /dashboard, /plans, /subscriptions, /invoices

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppShell } from '../components/layout/AppShell';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Plans } from '../pages/Plans';
import { Subscriptions } from '../pages/Subscriptions';
import { Invoices } from '../pages/Invoices';

export const AppRouter = (): JSX.Element => (
  <BrowserRouter>
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected — any authenticated user, AppShell wraps all */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/plans"     element={<Plans />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/invoices"  element={<Invoices />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
);
