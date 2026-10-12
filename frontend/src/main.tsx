import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppRouter } from './app/router.tsx';
import { AppProviders } from './app/providers.tsx';
import { restoreSession } from './lib/auth/session.ts';

void restoreSession();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
);
