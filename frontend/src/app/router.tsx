import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { RequireAuth } from './RequireAuth';
import { RequireRole } from './RequireRole';
import { AppShell } from './AppShell';
import { ErrorBoundary } from '../design/ErrorBoundary';
import { Skeleton } from '../design/Skeleton';
import NotPermittedPage from './NotPermittedPage';
import NotFoundPage from './NotFoundPage';
import LoginPage from '../features/auth/LoginPage';

const OverviewPage = lazy(() => import('../features/overview/OverviewPage'));
const AssetsListPage = lazy(() => import('../features/assets/AssetsListPage'));
const AssetDetailPage = lazy(
  () => import('../features/assets/AssetDetailPage'),
);
const WorkOrdersListPage = lazy(
  () => import('../features/work-orders/WorkOrdersListPage'),
);
const WorkOrderDetailPage = lazy(
  () => import('../features/work-orders/WorkOrderDetailPage'),
);
const SparePartsListPage = lazy(
  () => import('../features/spare-parts/SparePartsListPage'),
);
const SparePartDetailPage = lazy(
  () => import('../features/spare-parts/SparePartDetailPage'),
);
const PlansListPage = lazy(() => import('../features/plans/PlansListPage'));
const PlanDetailPage = lazy(() => import('../features/plans/PlanDetailPage'));
const TelemetryPage = lazy(() => import('../features/telemetry/TelemetryPage'));
const AlertsPage = lazy(() => import('../features/alerts/AlertsPage'));
const AuditPage = lazy(() => import('../features/audit/AuditPage'));
const UsersPage = lazy(() => import('../features/users/UsersPage'));
const AccountPage = lazy(() => import('../features/account/AccountPage'));
const DesignShowcase = lazy(() => import('./DesignShowcase'));

function RouteFallback() {
  return (
    <div className="flex flex-col gap-4 py-12">
      <Skeleton height={32} />
      <Skeleton lines={4} height={16} />
    </div>
  );
}

function routeBoundary(element: ReactNode) {
  return (
    <ErrorBoundary
      className="p-9"
      fallbackMessage="This page didn't load. Try again, or pick another page from the nav."
    >
      {element}
    </ErrorBoundary>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter basename="/app">
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={routeBoundary(<LoginPage />)} />

          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={routeBoundary(<OverviewPage />)} />
            <Route path="assets" element={routeBoundary(<AssetsListPage />)} />
            <Route
              path="assets/:id"
              element={routeBoundary(<AssetDetailPage />)}
            />
            <Route
              path="work-orders"
              element={routeBoundary(<WorkOrdersListPage />)}
            />
            <Route
              path="work-orders/:id"
              element={routeBoundary(<WorkOrderDetailPage />)}
            />
            <Route
              path="spare-parts"
              element={routeBoundary(<SparePartsListPage />)}
            />
            <Route
              path="spare-parts/:id"
              element={routeBoundary(<SparePartDetailPage />)}
            />
            <Route path="plans" element={routeBoundary(<PlansListPage />)} />
            <Route
              path="plans/:id"
              element={routeBoundary(<PlanDetailPage />)}
            />
            <Route
              path="telemetry"
              element={routeBoundary(<TelemetryPage />)}
            />
            <Route path="alerts" element={routeBoundary(<AlertsPage />)} />
            <Route
              path="audit"
              element={routeBoundary(
                <RequireRole roles={['ADMIN', 'SUPERVISOR']}>
                  <AuditPage />
                </RequireRole>,
              )}
            />
            <Route
              path="users"
              element={routeBoundary(
                <RequireRole roles={['ADMIN']}>
                  <UsersPage />
                </RequireRole>,
              )}
            />
            <Route path="account" element={routeBoundary(<AccountPage />)} />
            <Route
              path="not-permitted"
              element={routeBoundary(<NotPermittedPage />)}
            />
            <Route path="*" element={routeBoundary(<NotFoundPage />)} />
          </Route>

          {import.meta.env.DEV && (
            <Route
              path="/dev/design"
              element={routeBoundary(<DesignShowcase />)}
            />
          )}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
