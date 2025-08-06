import { createContext } from 'react';

export type UnAuthenticatedAuthContextProps = {
  isAuthenticated: false;
  isLoading: boolean;
  currentUserUid: undefined;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export type AuthenticatedAuthContextProps = {
  isAuthenticated: true;
  isLoading: boolean;
  currentUserUid: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const defaultAuthValues: UnAuthenticatedAuthContextProps = {
  logout(): Promise<void> {
    throw new Error('Not authenticated yet...');
  },
  isAuthenticated: false,
  isLoading: true,
  currentUserUid: undefined,
  login: async () => {
    throw new Error('Not authenticated yet...');
  },
};

export const AuthContext = createContext<
  UnAuthenticatedAuthContextProps | AuthenticatedAuthContextProps
>(defaultAuthValues);
