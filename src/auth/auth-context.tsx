import { createContext } from 'react';

type AuthContextProps = {
  isAuthenticated: boolean;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextProps>({
  isAuthenticated: false,
  isLoading: true,
});
