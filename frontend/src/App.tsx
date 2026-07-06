import { BrowserRouter, Routes, Route } from 'react-router';
import { Toaster } from 'sonner';
import { useEffect, useRef, useState } from 'react';

import SignInPage from './pages/SignInPage';
import SignupTenantPage from './pages/SignupTenantPage';
import DashboardPage from './pages/DashboardPage';
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage';
import BranchesPage from './pages/org/BranchesPage';
import DepartmentsPage from './pages/org/DepartmentsPage';
import PositionsPage from './pages/org/PositionsPage';
import LevelsPage from './pages/org/LevelsPage';
import EmployeesPage from './pages/hr/EmployeesPage';
import EmployeeDetailPage from './pages/hr/EmployeeDetailPage';

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
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setTheme(isDark);
  }, [isDark, setTheme]);

  // Chặn render router đến khi refresh() xong — tránh race condition:
  // useEffect chạy bottom-up (children trước) → nếu không chặn, các trang list
  // sẽ fetch data với accessToken=null trước khi refresh() kịp lấy token mới.
  useEffect(() => {
    if (refreshed.current) return;
    refreshed.current = true;
    refresh().finally(() => setInitialized(true));
  }, [refresh]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

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
              <Route path="branches" element={<BranchesPage />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="positions" element={<PositionsPage />} />
              <Route path="levels" element={<LevelsPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="employees/:employeeId" element={<EmployeeDetailPage />} />
            </Route>
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
