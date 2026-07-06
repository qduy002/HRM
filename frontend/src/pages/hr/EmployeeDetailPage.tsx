import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Briefcase,
  FileText,
  GraduationCap,
  HeartHandshake,
  LifeBuoy,
  User as UserIcon,
  UserPlus,
  Users as UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { employeeService } from "@/services/employeeService";
import type { Employee, EmployeeStatus } from "@/types/employee";
import { InfoTab } from "@/components/employee/InfoTab";
import { PositionsTab } from "@/components/employee/PositionsTab";
import { ContractsTab } from "@/components/employee/ContractsTab";
import { DependentsTab } from "@/components/employee/DependentsTab";
import { EmergencyContactsTab } from "@/components/employee/EmergencyContactsTab";
import { EducationsTab } from "@/components/employee/EducationsTab";
import { ExperiencesTab } from "@/components/employee/ExperiencesTab";
import { DocumentsTab } from "@/components/employee/DocumentsTab";
import { GrantAccountDialog } from "@/components/employee/GrantAccountDialog";

type TabKey =
  | "info"
  | "positions"
  | "contracts"
  | "dependents"
  | "emergency"
  | "educations"
  | "experiences"
  | "documents";

interface TabConfig {
  key: TabKey;
  label: string;
  icon: typeof UserIcon;
}

const TABS: TabConfig[] = [
  { key: "info", label: "Thông tin", icon: UserIcon },
  { key: "positions", label: "Vị trí", icon: UsersIcon },
  { key: "contracts", label: "Hợp đồng", icon: FileText },
  { key: "dependents", label: "Người phụ thuộc", icon: HeartHandshake },
  { key: "emergency", label: "Liên hệ khẩn cấp", icon: LifeBuoy },
  { key: "educations", label: "Học vấn", icon: GraduationCap },
  { key: "experiences", label: "Kinh nghiệm", icon: Briefcase },
  { key: "documents", label: "Tài liệu", icon: FileText },
];

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  probation: "Thử việc",
  active: "Chính thức",
  on_leave: "Nghỉ tạm",
  terminated: "Đã nghỉ việc",
};

const STATUS_VARIANT: Record<EmployeeStatus, "warning" | "success" | "outline" | "destructive"> = {
  probation: "warning",
  active: "success",
  on_leave: "outline",
  terminated: "destructive",
};

const EmployeeDetailPage = () => {
  const { companyCode, employeeId } = useParams<{ companyCode: string; employeeId: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);

  const load = async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const emp = await employeeService.get(Number(employeeId));
      setEmployee(emp);
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (notFound || !employee) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Không tìm thấy nhân viên</h2>
        <p className="text-muted-foreground mb-4">
          Nhân viên không tồn tại hoặc thuộc công ty khác.
        </p>
        <Button asChild variant="outline">
          <Link to={`/${companyCode}/employees`}>
            <ArrowLeft className="h-4 w-4" />
            Về danh sách
          </Link>
        </Button>
      </div>
    );
  }

  const empId = employee.id;
  const hasUser = !!employee.User;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{employee.displayName}</h1>
              <Badge variant={STATUS_VARIANT[employee.status]}>
                {STATUS_LABELS[employee.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Mã: <span className="font-mono">{employee.code}</span>
              {hasUser && (
                <>
                  {" · "}Tài khoản:{" "}
                  <span className="text-primary font-medium">{employee.User?.email}</span>{" "}
                  <span className="text-xs">({employee.User?.role})</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!hasUser && (
            <Button variant="outline" onClick={() => setGrantDialogOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Cấp tài khoản
            </Button>
          )}
        </div>
      </div>

      {/* Tabs nav */}
      <div className="border-b overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="rounded-md border bg-background p-6">
        {activeTab === "info" && <InfoTab employee={employee} />}
        {activeTab === "positions" && <PositionsTab employeeId={empId} />}
        {activeTab === "contracts" && <ContractsTab employeeId={empId} />}
        {activeTab === "dependents" && <DependentsTab employeeId={empId} />}
        {activeTab === "emergency" && <EmergencyContactsTab employeeId={empId} />}
        {activeTab === "educations" && <EducationsTab employeeId={empId} />}
        {activeTab === "experiences" && <ExperiencesTab employeeId={empId} />}
        {activeTab === "documents" && <DocumentsTab employeeId={empId} />}
      </div>

      <GrantAccountDialog
        open={grantDialogOpen}
        onOpenChange={setGrantDialogOpen}
        employeeId={empId}
        employeeName={employee.displayName}
        onGranted={load}
      />
    </div>
  );
};

export default EmployeeDetailPage;
