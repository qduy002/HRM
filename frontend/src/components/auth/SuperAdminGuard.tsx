import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";

const SuperAdminGuard = () => {
  const { user, company, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/signin" replace />;
  if (user.role !== "super_admin") {
    if (company?.code) return <Navigate to={`/${company.code}/dashboard`} replace />;
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
};

export default SuperAdminGuard;
