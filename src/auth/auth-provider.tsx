import { useEffect, useRef, useState, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseApp } from '../firebase';
import { AuthContext } from './auth-context';
import { LoadingSpinner } from '../components/loading-spinner.tsx';

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserUid, setCurrentUserUid] = useState('');

  const auth = useRef(firebaseApp.auth);

  useEffect(() => {
    onAuthStateChanged(auth.current, (user) => {
      setIsLoading(false);
      setIsAuthenticated(!!user);

      if (user?.uid) {
        setCurrentUserUid(user.uid);
      }
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, currentUserUid }}
    >
      {!isAuthenticated && isLoading ? <LoadingSpinner /> : children}
    </AuthContext.Provider>
  );
};
