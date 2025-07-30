import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseApp } from '../firebase';
import { AuthContext } from './auth-context';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

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
      {!isAuthenticated && isLoading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
          }}
        >
          <CircularProgress size={100} />
        </Box>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
