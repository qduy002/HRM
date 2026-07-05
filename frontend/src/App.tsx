import { BrowserRouter, Routes, Route } from 'react-router';
import { Toaster } from 'sonner';
import { useEffect, useRef } from 'react';

import SignInPage from './pages/SignInPage';
import SignupTenantPage from './pages/SignupTenantPage';
import DashboardPage from './pages/DashboardPage';
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage';

import RootRedirect from './components/auth/RootRedirect';
import TenantGuard from './components/auth/TenantGuard';
import SuperAdminGuard from './components/auth/SuperAdminGuard';
import TenantLayout from './components/layout/TenantLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';

import { useThemeStore } from './stores/useThemeStore';
import { useAuthStore } from './stores/useAuthStore';

function App() {
  const { isDark, setTheme } = useThemeStore();
  const { refresh } = useAuthStore();
  const refreshed = useRef(false);

  useEffect(() => {
    setTheme(isDark);
  }, [isDark, setTheme]);

  useEffect(() => {
    if (refreshed.current) return;
    refreshed.current = true;
    refresh();
  }, [refresh]);

  return (
    <>
      <Toaster richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup-tenant" element={<SignupTenantPage />} />

          <Route path="/super-admin" element={<SuperAdminGuard />}>
            <Route element={<SuperAdminLayout />}>
              <Route path="dashboard" element={<SuperAdminDashboardPage />} />
            </Route>
          </Route>

          <Route path="/:companyCode" element={<TenantGuard />}>
            <Route element={<TenantLayout />}>
              <Route path="dashboard" element={<DashboardPage />} />
            </Route>
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
