import { useAuth } from '../auth/use-auth.ts';
import { Navigate, useLocation } from 'react-router';

export const NotFoundHandler = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  return isAuthenticated ? (
    <Navigate to="/app" />
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};
