import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './firebase.ts';
import { AuthProvider } from './auth/auth-provider.tsx';
import { InnerApp } from './inner-app.tsx';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';

const theme = createTheme({
  colorSchemes: {
    dark: true,
  },
});

const rootElement = document.getElementById('root')!;

if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <InnerApp />
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}
