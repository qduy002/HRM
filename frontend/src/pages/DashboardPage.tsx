import { useEffect } from "react";
import { Link, useParams } from "react-router";
import {
  Award,
  Briefcase,
  Building2,
  CalendarCheck,
  DollarSign,
  Network,
  UserCheck,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { useBranchStore } from "@/stores/useBranchStore";
import { useDepartmentStore } from "@/stores/useDepartmentStore";
import { usePositionStore } from "@/stores/usePositionStore";
import { useLevelStore } from "@/stores/useLevelStore";
import { useAuthStore } from "@/stores/useAuthStore";

const DashboardPage = () => {
  const { companyCode } = useParams<{ companyCode: string }>();
  const { user, company } = useAuthStore();

  const employees = useEmployeeStore((s) => s.items);
  const employeeTotal = useEmployeeStore((s) => s.total);
  const fetchEmployees = useEmployeeStore((s) => s.fetch);

  const branches = useBranchStore((s) => s.items);
  const fetchBranches = useBranchStore((s) => s.fetch);

  const departments = useDepartmentStore((s) => s.items);
  const fetchDepartments = useDepartmentStore((s) => s.fetch);

  const positions = usePositionStore((s) => s.items);
  const fetchPositions = usePositionStore((s) => s.fetch);

  const levels = useLevelStore((s) => s.items);
  const fetchLevels = useLevelStore((s) => s.fetch);

  useEffect(() => {
    fetchEmployees({ page: 1, pageSize: 5 });
    if (branches.length === 0) fetchBranches();
    if (departments.length === 0) fetchDepartments();
    if (positions.length === 0) fetchPositions();
    if (levels.length === 0) fetchLevels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeEmployees = employees.filter((e) => e.status === "active").length;
  const probationEmployees = employees.filter((e) => e.status === "probation").length;

  const trialEndsAt = company?.trialEndsAt ? new Date(company.trialEndsAt) : null;
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Xin chào, {user?.firstName} 👋</h2>
        <p className="text-muted-foreground">
          Trang tổng quan hệ thống nhân sự{" "}
          {company?.status === "trial" && daysLeft != null && (
            <span className="text-warning-foreground">
              — Còn <span className="font-medium text-amber-600">{daysLeft} ngày</span> dùng thử
            </span>
          )}
        </p>
      </div>

      {/* KPI cards — Sprint 1 metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to={`/${companyCode}/employees`}>
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng nhân viên</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employeeTotal}</div>
              <p className="text-xs text-muted-foreground">
                {activeEmployees} chính thức, {probationEmployees} thử việc
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/${companyCode}/branches`}>
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chi nhánh</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{branches.length}</div>
              <p className="text-xs text-muted-foreground">
                {branches.filter((b) => b.isActive).length} đang hoạt động
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/${companyCode}/departments`}>
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Phòng ban</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments.length}</div>
              <p className="text-xs text-muted-foreground">
                {departments.filter((d) => d.parentDepartmentId == null).length} phòng gốc
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/${companyCode}/positions`}>
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chức danh & Cấp bậc</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{positions.length}</div>
              <p className="text-xs text-muted-foreground">
                {levels.length} cấp bậc <Award className="inline h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent employees + Upcoming (Sprint 2/3 placeholder) */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Nhân viên mới nhất</CardTitle>
              <p className="text-sm text-muted-foreground">5 nhân viên gần nhất được thêm</p>
            </div>
            <UserCheck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Chưa có nhân viên nào.{" "}
                <Link to={`/${companyCode}/employees`} className="text-primary hover:underline">
                  Thêm ngay
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {employees.slice(0, 5).map((emp) => {
                  const pos = emp.EmployeePositions?.find((p) => p.effectiveTo == null);
                  return (
                    <li key={emp.id}>
                      <Link
                        to={`/${companyCode}/employees/${emp.id}`}
                        className="flex items-center justify-between hover:bg-accent rounded-md p-2 -mx-2 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-sm">{emp.displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-mono">{emp.code}</span>
                            {pos?.Department?.name && ` · ${pos.Department.name}`}
                          </p>
                        </div>
                        <Badge
                          variant={
                            emp.status === "active"
                              ? "success"
                              : emp.status === "probation"
                                ? "warning"
                                : "outline"
                          }
                        >
                          {emp.status === "active"
                            ? "Chính thức"
                            : emp.status === "probation"
                              ? "Thử việc"
                              : emp.status === "on_leave"
                                ? "Nghỉ tạm"
                                : "Đã nghỉ"}
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Sắp có ở Sprint 2/3</CardTitle>
            <p className="text-sm text-muted-foreground">Các module đang trong kế hoạch</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div className="flex items-center gap-3">
                <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Chấm công tháng</p>
                  <p className="text-xs text-muted-foreground">Sprint 2 — check-in/out, OT</p>
                </div>
              </div>
              <Badge variant="outline">Sắp có</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Đơn xin nghỉ</p>
                  <p className="text-xs text-muted-foreground">
                    Sprint 2 — workflow duyệt phép
                  </p>
                </div>
              </div>
              <Badge variant="outline">Sắp có</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Bảng lương tháng</p>
                  <p className="text-xs text-muted-foreground">
                    Sprint 3 — BHXH, BHYT, thuế TNCN
                  </p>
                </div>
              </div>
              <Badge variant="outline">Sắp có</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      {employeeTotal === 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="font-semibold">Bắt đầu sử dụng HRM</p>
              <p className="text-sm text-muted-foreground">
                Chưa có nhân viên nào. Hãy thêm nhân viên đầu tiên để trải nghiệm hệ thống.
              </p>
            </div>
            <Button asChild>
              <Link to={`/${companyCode}/employees`}>
                <Users className="h-4 w-4" />
                Thêm nhân viên
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;
