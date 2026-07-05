import { Navigate, Outlet, useParams } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";

const TenantGuard = () => {
  const { user, company, loading } = useAuthStore();
  const { companyCode } = useParams<{ companyCode: string }>();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/signin" replace />;
  if (user.role === "super_admin") return <Navigate to="/super-admin/dashboard" replace />;
  if (!company) return <Navigate to="/signin" replace />;

  // Chống paste URL công ty khác — chuyển về đúng tenant của mình
  if (companyCode && companyCode !== company.code) {
    return <Navigate to={`/${company.code}/dashboard`} replace />;
  }

  return <Outlet />;
};

export default TenantGuard;
