import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Login from './pages/Login';
import AcceptInvite from './pages/AcceptInvite';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Prescriptions from './pages/Prescriptions';
import Wholesale from './pages/Wholesale';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Finance from './pages/Finance';
import Reports from './pages/Reports';
import Branches from './pages/Branches';
import Settings from './pages/Settings';
import CashierDashboard from './pages/CashierDashboard';
import NotFound from './pages/NotFound';
import PlatformLayout from './components/PlatformLayout';
import PlatformOverview from './pages/platform/Overview';
import PlatformTenants from './pages/platform/Tenants';
import PlatformTenantDetail from './pages/platform/TenantDetail';
import PlatformPayments from './pages/platform/Payments';
import PlatformAudit from './pages/platform/Audit';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (session.user.role === 'SUPER_ADMIN' && !location.pathname.startsWith('/platform')) {
    return <Navigate to="/platform" replace />;
  }
  return <>{children}</>;
};

const PlatformRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.role !== 'SUPER_ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const LoginRoute: React.FC = () => {
  const { session } = useAuth();
  if (session) return <Navigate to={session.user.role === 'SUPER_ADMIN' ? '/platform' : '/dashboard'} replace />;
  return <Login />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />

          {/* Platform (super admin) */}
          <Route path="/platform" element={<PlatformRoute><PlatformLayout /></PlatformRoute>}>
            <Route index element={<PlatformOverview />} />
            <Route path="tenants" element={<PlatformTenants />} />
            <Route path="tenants/:id" element={<PlatformTenantDetail />} />
            <Route path="payments" element={<PlatformPayments />} />
            <Route path="audit" element={<PlatformAudit />} />
          </Route>

          {/* Pharmacy app */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/prescriptions" element={<ProtectedRoute><Prescriptions /></ProtectedRoute>} />
          <Route path="/wholesale" element={<ProtectedRoute><Wholesale /></ProtectedRoute>} />
          <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/branches" element={<ProtectedRoute><Branches /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/my-sales" element={<ProtectedRoute><CashierDashboard /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
