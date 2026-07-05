import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Users, Activity, AlertCircle } from "lucide-react";

const SuperAdminDashboardPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Platform Overview</h2>
        <p className="text-muted-foreground">
          Quản lý toàn bộ tenant trong hệ thống HRM
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số tenant</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">–</div>
            <p className="text-xs text-muted-foreground">Endpoint chưa có (Sprint sau)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang trial</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">–</div>
            <p className="text-xs text-muted-foreground">Sẽ có sau</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">–</div>
            <p className="text-xs text-muted-foreground">Sẽ có sau</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenant suspended</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">–</div>
            <p className="text-xs text-muted-foreground">Sẽ có sau</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboardPage;
