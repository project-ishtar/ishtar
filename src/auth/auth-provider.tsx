import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  useCallback,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { firebaseApp } from '../firebase';
import { AuthContext } from './auth-context';
import { flushSync } from 'react-dom';

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserUid, setCurrentUserUid] = useState('');

  const auth = useRef(firebaseApp.auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth.current, (user) => {
      flushSync(() => {
        setIsLoading(false);

        if (user?.uid) {
          setIsAuthenticated(!!user);
          setCurrentUserUid(user.uid);
        }
      });
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const user = await signInWithEmailAndPassword(
      auth.current,
      email,
      password,
    );

    flushSync(() => {
      setCurrentUserUid(user.user.uid);
      setIsAuthenticated(true);
    });
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth.current);

    flushSync(() => {
      setCurrentUserUid('');
      setIsAuthenticated(false);
    });
  }, []);

  return (
    <AuthContext.Provider
      value={
        isAuthenticated
          ? { isAuthenticated: true, isLoading, currentUserUid, login, logout }
          : {
              isAuthenticated: false,
              isLoading,
              currentUserUid: undefined,
              login,
              logout,
            }
      }
    >
      {children}
    </AuthContext.Provider>
  );
};
