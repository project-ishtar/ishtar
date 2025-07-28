import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, type PaletteMode, ThemeProvider } from '@mui/material';
import { AiContent } from './components/ai-content.tsx';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';

export function App() {
  const auth = useRef(getAuth());

  const [theme, setTheme] = useState<PaletteMode>('dark');
  const [isLoggedIn, setLoggedIn] = useState<boolean>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    onAuthStateChanged(auth.current, (user) => setLoggedIn(!!user));
  }, []);

  const signIn = useCallback(async () => {
    await signInWithEmailAndPassword(auth.current, email, password);
    setLoggedIn(true);
  }, [email, password]);

  const onEmailChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(event.target.value);
    },
    [],
  );

  const onPasswordChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(event.target.value);
    },
    [],
  );

  return (
    <ThemeProvider theme={createTheme({ palette: { mode: theme } })}>
      <CssBaseline />
      {isLoggedIn === undefined ? null : isLoggedIn ? (
        <AiContent onThemeChange={setTheme} />
      ) : (
        <>
          <input
            type="email"
            value={email}
            placeholder="Email"
            onChange={onEmailChange}
          />
          <input
            type="password"
            value={password}
            placeholder="Password"
            onChange={onPasswordChange}
          />
          <button onClick={signIn}>Login</button>
        </>
      )}
    </ThemeProvider>
  );
}
