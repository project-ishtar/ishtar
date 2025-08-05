import { createContext } from 'react';

type AuthContextProps = {
  isAuthenticated: boolean;
  isLoading: boolean;
  currentUserUid: string;
};

export const AuthContext = createContext<AuthContextProps>({
  isAuthenticated: false,
  isLoading: true,
  currentUserUid: '',
});
