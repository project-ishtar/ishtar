import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseApp } from '../firebase';
import { AuthContext } from './auth-context';
import { LoadingSpinner } from '../components/loading-spinner.tsx';

type AuthProviderProps = {
  children: React.ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const auth = useRef(firebaseApp.auth);

  useEffect(() => {
    onAuthStateChanged(auth.current, (user) => {
      setIsLoading(false);
      setIsAuthenticated(!!user);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading }}>
      {!isAuthenticated && isLoading ? <LoadingSpinner /> : children}
    </AuthContext.Provider>
  );
};
