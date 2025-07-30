import { useAuth } from '../auth/use-auth.ts';
import { Navigate } from 'react-router';

export const RootRedirector = () => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <Navigate to="/app" /> : <Navigate to="/login" />;
};
