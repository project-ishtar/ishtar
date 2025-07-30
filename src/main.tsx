import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './firebase.ts';
import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './auth/auth-provider.tsx';
import { createTheme, ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { RootRedirector } from './routes/root-redirector.tsx';
import { ProtectedRoute } from './routes/protected-route.tsx';
import { LoginPage } from './login-page/login-page.tsx';
import { AiContent } from './components/ai-content.tsx';
import { NotFoundHandler } from './routes/not-found-handler.tsx';

const theme = createTheme({
  colorSchemes: {
    dark: true,
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AiContent />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/:conversationId"
                element={
                  <ProtectedRoute>
                    <AiContent />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFoundHandler />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
