import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, type PaletteMode, ThemeProvider } from '@mui/material';
import { AiContent } from './components/ai-content.tsx';
import { useEffect, useRef, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { LoginPage } from './components/login-page.tsx';

export function App() {
  const auth = useRef(getAuth());

  const [theme, setTheme] = useState<PaletteMode>('dark');
  const [isLoggedIn, setLoggedIn] = useState<boolean>();

  useEffect(() => {
    onAuthStateChanged(auth.current, (user) => setLoggedIn(!!user));
  }, []);

  return (
    <ThemeProvider theme={createTheme({ palette: { mode: theme } })}>
      <CssBaseline />
      {isLoggedIn === undefined ? null : isLoggedIn ? (
        <AiContent onThemeChange={setTheme} />
      ) : (
        <LoginPage />
      )}
    </ThemeProvider>
  );
}
