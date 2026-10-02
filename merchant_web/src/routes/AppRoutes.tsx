import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { FirmLayout } from '../layouts/FirmLayout';
// ─── Code Splitting (React.lazy) ─────────────────────────────────────────────
const LiveRadar = React.lazy(() => import('../pages/LiveRadar').then(m => ({ default: m.LiveRadar })));
const QuickOrder = React.lazy(() => import('../pages/QuickOrder').then(m => ({ default: m.QuickOrder })));
const OrderKanban = React.lazy(() => import('../pages/OrderKanban').then(m => ({ default: m.OrderKanban })));
const Finance = React.lazy(() => import('../pages/Finance').then(m => ({ default: m.Finance })));
const Settings = React.lazy(() => import('../pages/Settings').then(m => ({ default: m.Settings })));
const Login = React.lazy(() => import('../pages/Login').then(m => ({ default: m.Login })));
const FirmDashboard = React.lazy(() => import('../pages/firm/FirmDashboard').then(m => ({ default: m.FirmDashboard })));
const FirmCouriers = React.lazy(() => import('../pages/firm/FirmCouriers').then(m => ({ default: m.FirmCouriers })));
const FirmMerchants = React.lazy(() => import('../pages/firm/FirmMerchants').then(m => ({ default: m.FirmMerchants })));
const FirmOrders = React.lazy(() => import('../pages/firm/FirmOrders').then(m => ({ default: m.FirmOrders })));
const FirmFinance = React.lazy(() => import('../pages/firm/FirmFinance').then(m => ({ default: m.FirmFinance })));
const FirmSettings = React.lazy(() => import('../pages/firm/FirmSettings').then(m => ({ default: m.FirmSettings })));
const FirmRadar = React.lazy(() => import('../pages/firm/FirmRadar').then(m => ({ default: m.FirmRadar })));
const FirmUsers = React.lazy(() => import('../pages/firm/FirmUsers').then(m => ({ default: m.FirmUsers })));

const PageLoader: React.FC = () => (
  <div className="flex h-64 w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-3 border-teal-500 border-t-transparent" />
  </div>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIRM_ROLES = ['CourierFirm', 'Admin', 'FirmAdmin', 'SuperAdmin', 'CompanyUser'];

function hasFirmRole(roles: string[] = []): boolean {
  return roles.some((r) => FIRM_ROLES.includes(r) || r.startsWith('CompanyUser_'));
}

/** Kullanıcının rollerine göre başlangıç sayfasını belirler */
function getDefaultRoute(roles: string[] = []): string {
  if (hasFirmRole(roles)) {
    return '/firm/dashboard';
  }
  return '/radar';
}

// ─── Route Guards ─────────────────────────────────────────────────────────────

/** Oturum açmak zorunlu - yoksa /login'e yönlendir */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

/** Sadece kurye firması / admin rolü erişebilir */
const FirmRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const roles = user?.roles ?? [];
  if (!hasFirmRole(roles)) return <Navigate to="/radar" replace />;
  return <>{children}</>;
};

// ─── Routes ───────────────────────────────────────────────────────────────────

export const AppRoutes: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <React.Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Açık Rotalar ─────────────────────────────────────────── */}
        <Route path="/login" element={<Login />} />

        {/* ── Restoran / İşletme Rotaları ──────────────────────────── */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to={getDefaultRoute(user?.roles)} replace />} />
          <Route path="radar" element={<LiveRadar />} />
          <Route path="quick-order" element={<QuickOrder />} />
          <Route path="orders" element={<OrderKanban />} />
          <Route path="finance" element={<Finance />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* ── Kurye Firması Paneli Rotaları ─────────────────────────── */}
        <Route
          path="/firm"
          element={
            <FirmRoute>
              <FirmLayout />
            </FirmRoute>
          }
        >
          <Route index element={<Navigate to="/firm/dashboard" replace />} />
          <Route path="dashboard" element={<FirmDashboard />} />
          <Route path="couriers"  element={<FirmCouriers />} />
          <Route path="merchants" element={<FirmMerchants />} />

          {/* Siparişler alt rotaları */}
          <Route path="orders" element={<FirmOrders />} />
          <Route path="orders/delivered" element={<FirmOrders />} />
          <Route path="orders/cancelled" element={<FirmOrders />} />

          <Route path="radar"     element={<FirmRadar />} />

          {/* Cari Hesap alt rotaları */}
          <Route path="finance"                       element={<FirmFinance />} />
          <Route path="finance/receivables"           element={<FirmFinance />} />
          <Route path="finance/courier-collections"   element={<FirmFinance />} />
          <Route path="finance/reconciliation"        element={<FirmFinance />} />

          {/* Raporlar */}
          <Route path="reports/general"               element={<FirmFinance />} />
          <Route path="reports/delivery"              element={<FirmFinance />} />
          <Route path="reports/pricing"               element={<FirmFinance />} />
          <Route path="reports/courier/score"         element={<FirmFinance />} />
          <Route path="reports/courier/delivery"      element={<FirmFinance />} />
          <Route path="reports/courier/schedule"      element={<FirmFinance />} />
          <Route path="reports/courier/behavior"      element={<FirmFinance />} />
          <Route path="reports/courier/performance"   element={<FirmFinance />} />
          <Route path="reports/courier/km"            element={<FirmFinance />} />
          <Route path="reports/restaurant/detailed"   element={<FirmFinance />} />

          {/* Yönetim */}
          <Route path="management/sub-users"          element={<FirmUsers />} />
          <Route path="management/sub-teams"          element={<FirmUsers />} />

          {/* Ayarlar alt rotaları */}
          <Route path="settings"                      element={<FirmSettings />} />
          <Route path="settings/pool"                 element={<FirmSettings />} />
          <Route path="settings/region"               element={<FirmSettings />} />
        </Route>

        {/* ── Fallback ─────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
};
