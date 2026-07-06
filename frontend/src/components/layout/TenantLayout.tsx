import { Outlet } from "react-router";
import { LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import Sidebar from "./Sidebar";

const roleLabels: Record<string, string> = {
  admin: "Quản trị viên",
  hr: "Nhân sự",
  manager: "Quản lý",
  employee: "Nhân viên",
};

const statusLabels: Record<string, string> = {
  trial: "Dùng thử",
  active: "Đang hoạt động",
  suspended: "Tạm khóa",
};

const statusVariant: Record<string, "warning" | "success" | "destructive" | "outline"> = {
  trial: "warning",
  active: "success",
  suspended: "destructive",
};

const TenantLayout = () => {
  const { user, company, signOut } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-background flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-semibold">{company?.name}</h2>
              <p className="text-xs text-muted-foreground">{company?.code}</p>
            </div>
            {company?.status && (
              <Badge variant={statusVariant[company.status] ?? "outline"}>
                {statusLabels[company.status] ?? company.status}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {roleLabels[user?.role ?? ""] ?? user?.role}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TenantLayout;
