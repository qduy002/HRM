import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { leaveRequestService } from "@/services/leaveRequestService";
import { employeeService } from "@/services/employeeService";
import type { LeaveRequest, LeaveRequestStatus } from "@/types/leave";
import type { Employee } from "@/types/employee";

const STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  pending: "Chờ manager duyệt",
  manager_approved: "Chờ HR duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
  cancelled: "Đã hủy",
};

const STATUS_VARIANT: Record<LeaveRequestStatus, "warning" | "outline" | "success" | "destructive"> = {
  pending: "warning",
  manager_approved: "warning",
  approved: "success",
  rejected: "destructive",
  cancelled: "outline",
};

const formatDate = (v: string) => new Date(v).toLocaleDateString("vi-VN");

const currentYear = new Date().getFullYear();

const LeaveOverviewPage = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number>(currentYear);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [status, setStatus] = useState<LeaveRequestStatus | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [reqs, emps] = await Promise.all([
        leaveRequestService.listAll({
          year,
          ...(employeeId ? { employeeId } : {}),
          ...(status ? { status } : {}),
        }),
        employees.length === 0 ? employeeService.list({ pageSize: 500 }) : Promise.resolve(null),
      ]);
      setRequests(reqs);
      if (emps) setEmployees(emps.employees);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [year, employeeId, status, employees.length]);

  useEffect(() => {
    load();
  }, [load]);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Danh sách đơn phép</h1>
          <p className="text-muted-foreground text-sm">Toàn bộ đơn phép trong tenant, filter theo NV/trạng thái/năm.</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Năm</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Nhân viên</label>
          <select value={employeeId ?? ""} onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : null)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
            <option value="">Tất cả</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.code} — {e.displayName}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Trạng thái</label>
          <select value={status ?? ""} onChange={(e) => setStatus((e.target.value as LeaveRequestStatus) || null)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
            <option value="">Tất cả</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-md border bg-background">
        {!loading && requests.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Chưa có đơn phép nào" description="Chọn năm khác hoặc bỏ filter." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NV</TableHead>
                <TableHead>Loại phép</TableHead>
                <TableHead>Từ - Đến</TableHead>
                <TableHead>Số ngày</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>HR</TableHead>
                <TableHead>Lý do</TableHead>
              </TableRow>
            </TableHeader>
            {loading ? <TableSkeleton cols={8} /> : (
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.Employee?.displayName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.Employee?.code}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: r.LeaveType?.color || "#94a3b8" }} />
                        {r.LeaveType?.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(r.fromDate)}
                      {r.halfDay === "morning" && <span className="text-xs text-muted-foreground"> (sáng)</span>}
                      {r.halfDay === "afternoon" && <span className="text-xs text-muted-foreground"> (chiều)</span>}
                      {" — "}
                      {formatDate(r.toDate)}
                    </TableCell>
                    <TableCell className="font-mono">{r.days}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.managerApprover?.email || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.hrApprover?.email || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{r.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        )}
      </div>
    </div>
  );
};

export default LeaveOverviewPage;
