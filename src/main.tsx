import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './firebase.ts';
import { MainContainer } from './components/main-container.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MainContainer />
  </StrictMode>,
);
