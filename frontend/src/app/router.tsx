import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { RequireRole } from './RequireRole';
import { AppShell } from './AppShell';
import NotPermittedPage from './NotPermittedPage';
import NotFoundPage from './NotFoundPage';
import LoginPage from '../features/auth/LoginPage';
import OverviewPage from '../features/overview/OverviewPage';
import AssetsListPage from '../features/assets/AssetsListPage';
import AssetDetailPage from '../features/assets/AssetDetailPage';
import WorkOrdersListPage from '../features/work-orders/WorkOrdersListPage';
import WorkOrderDetailPage from '../features/work-orders/WorkOrderDetailPage';
import SparePartsListPage from '../features/spare-parts/SparePartsListPage';
import SparePartDetailPage from '../features/spare-parts/SparePartDetailPage';
import PlansListPage from '../features/plans/PlansListPage';
import PlanDetailPage from '../features/plans/PlanDetailPage';
import TelemetryPage from '../features/telemetry/TelemetryPage';
import AlertsPage from '../features/alerts/AlertsPage';
import AuditPage from '../features/audit/AuditPage';
import UsersPage from '../features/users/UsersPage';
import AccountPage from '../features/account/AccountPage';

const DesignShowcase = lazy(() => import('./DesignShowcase'));

export function AppRouter() {
  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="assets" element={<AssetsListPage />} />
          <Route path="assets/:id" element={<AssetDetailPage />} />
          <Route path="work-orders" element={<WorkOrdersListPage />} />
          <Route path="work-orders/:id" element={<WorkOrderDetailPage />} />
          <Route path="spare-parts" element={<SparePartsListPage />} />
          <Route path="spare-parts/:id" element={<SparePartDetailPage />} />
          <Route path="plans" element={<PlansListPage />} />
          <Route path="plans/:id" element={<PlanDetailPage />} />
          <Route path="telemetry" element={<TelemetryPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route
            path="audit"
            element={
              <RequireRole roles={['ADMIN', 'SUPERVISOR']}>
                <AuditPage />
              </RequireRole>
            }
          />
          <Route
            path="users"
            element={
              <RequireRole roles={['ADMIN']}>
                <UsersPage />
              </RequireRole>
            }
          />
          <Route path="account" element={<AccountPage />} />
          <Route path="not-permitted" element={<NotPermittedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

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
