import type { ReactNode } from 'react';
import { useAuth } from '../auth/use-auth.ts';
import { Navigate, useLocation } from 'react-router';

type ProtectedRoute = {
  children: ReactNode;
  requiresAuth?: boolean;
};

export const ProtectedRoute = ({
  children,
  requiresAuth = true,
}: ProtectedRoute) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (requiresAuth && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!requiresAuth && isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname ?? '/app'} replace />;
  }

  return children;
};
