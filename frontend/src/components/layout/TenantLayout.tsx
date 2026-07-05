import { Outlet } from "react-router";
import { LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";

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

const TenantLayout = () => {
  const { user, company, signOut } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold">{company?.name}</h1>
              <p className="text-xs text-muted-foreground">
                {company?.code} · {statusLabels[company?.status ?? ""] ?? company?.status}
              </p>
            </div>
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
        </div>
      </header>
      <main className="container py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default TenantLayout;
