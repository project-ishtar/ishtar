import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, type PaletteMode, ThemeProvider } from '@mui/material';
import { AiContent } from './components/ai-content.tsx';
import { useEffect, useRef, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { LoginPage } from './components/login-page.tsx';
import { SystemInstruction } from './components/system-instruction.tsx';

export function App() {
  const auth = useRef(getAuth());

  const [theme, setTheme] = useState<PaletteMode>('dark');
  const [isLoggedIn, setLoggedIn] = useState<boolean>();

  const [systemInstruction, setSystemInstruction] = useState('');

  useEffect(() => {
    onAuthStateChanged(auth.current, (user) => setLoggedIn(!!user));
  }, []);

  const MainContent = systemInstruction ? (
    <AiContent onThemeChange={setTheme} systemInstruction={systemInstruction} />
  ) : (
    <SystemInstruction onSystemInstructionSet={setSystemInstruction} />
  );

  return (
    <ThemeProvider theme={createTheme({ palette: { mode: theme } })}>
      <CssBaseline />
      {isLoggedIn === undefined ? null : isLoggedIn ? (
        MainContent
      ) : (
        <LoginPage />
      )}
    </ThemeProvider>
  );
}
