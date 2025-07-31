import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider } from '../auth/auth-provider.tsx';
import { RootRedirector } from '../routes/root-redirector.tsx';
import { ProtectedRoute } from '../routes/protected-route.tsx';
import { LoginPage } from '../login-page/login-page.tsx';
import { App } from './app.tsx';
import { NotFoundHandler } from '../routes/not-found-handler.tsx';
import { createTheme, ThemeProvider } from '@mui/material';

const theme = createTheme({
  colorSchemes: {
    dark: true,
  },
});

export const MainContainer = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirector />} />
            <Route
              path="/login"
              element={
                <ProtectedRoute requiresAuth={false}>
                  <LoginPage />
                </ProtectedRoute>
              }
            />
            <Route>
              <Route path="/app" element={<App />} />
              <Route path="/app/:conversationId" element={<App />} />
            </Route>
            <Route path="*" element={<NotFoundHandler />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};
