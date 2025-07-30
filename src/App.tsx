import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material';
import { AiContent } from './components/ai-content.tsx';
import { useEffect, useRef, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { LoginPage } from './components/login-page.tsx';

const theme = createTheme({
  colorSchemes: {
    dark: true,
  },
});

export function App() {
  const auth = useRef(getAuth());

  const [isLoggedIn, setLoggedIn] = useState<boolean>();

  useEffect(() => {
    onAuthStateChanged(auth.current, (user) => setLoggedIn(!!user));
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {isLoggedIn === undefined ? null : isLoggedIn ? (
        <AiContent />
      ) : (
        <LoginPage />
      )}
    </ThemeProvider>
  );
}
