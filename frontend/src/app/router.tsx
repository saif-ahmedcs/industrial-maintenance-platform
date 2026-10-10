import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from '../App';

const DesignShowcase = lazy(() => import('./DesignShowcase'));

export function AppRouter() {
  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route path="/" element={<App />} />
        {import.meta.env.DEV && (
          <Route
            path="/dev/design"
            element={
              <Suspense fallback={null}>
                <DesignShowcase />
              </Suspense>
            }
          />
        )}
      </Routes>
    </BrowserRouter>
  );
}
