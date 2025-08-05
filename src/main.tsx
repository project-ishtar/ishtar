import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './firebase.ts';
import { MainContainer } from './components/main-container.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MainContainer />
    </QueryClientProvider>
  </StrictMode>,
);
