import { Navigate } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";

const RootRedirect = () => {
  const { user, company, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/signin" replace />;
  if (user.role === "super_admin") return <Navigate to="/super-admin/dashboard" replace />;
  if (company?.code) return <Navigate to={`/${company.code}/dashboard`} replace />;

  return <Navigate to="/signin" replace />;
};

export default RootRedirect;
