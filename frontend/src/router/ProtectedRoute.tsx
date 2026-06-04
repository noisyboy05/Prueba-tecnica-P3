// ProtectedRoute — guards authenticated and role-based routes
// If not authenticated → redirect to /login
// If authenticated but wrong role → redirect to the appropriate landing page

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
}

export const ProtectedRoute = ({ requiredRole }: ProtectedRouteProps): JSX.Element => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole !== undefined && user?.role !== requiredRole) {
    const fallback = user?.role === 'ADMIN' ? '/dashboard' : '/subscriptions';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
};
