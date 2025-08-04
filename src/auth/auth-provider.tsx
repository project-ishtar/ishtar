import { useEffect, useRef, useState, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseApp } from '../firebase';
import { AuthContext } from './auth-context';
import { LoadingSpinner } from '../components/loading-spinner.tsx';
import { useSetAtom } from 'jotai/index';
import { currentUserUidAtom } from '../data/current-user/current-user-atom.ts';

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const setCurrentUserUid = useSetAtom(currentUserUidAtom);

  const auth = useRef(firebaseApp.auth);

  useEffect(() => {
    onAuthStateChanged(auth.current, (user) => {
      setIsLoading(false);
      setIsAuthenticated(!!user);

      if (user?.uid) {
        setCurrentUserUid(user.uid);
      }
    });
  }, [setCurrentUserUid]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading }}>
      {!isAuthenticated && isLoading ? <LoadingSpinner /> : children}
    </AuthContext.Provider>
  );
};
