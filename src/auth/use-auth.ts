import { useContext } from 'react';
import {
  AuthContext,
  type AuthenticatedAuthContextProps,
} from './auth-context.tsx';

export const useAuth = () => useContext(AuthContext);

export const useAuthenticated = (): AuthenticatedAuthContextProps => {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    throw new Error('User not authenticated');
  }

  return auth;
};
