import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { attendanceService } from "@/services/attendanceService";
import { employeeService } from "@/services/employeeService";
import type { Attendance, AttendanceStatus } from "@/types/attendance";
import type { Employee } from "@/types/employee";

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  on_time: "Đúng giờ",
  late: "Đi trễ",
  early_leave: "Về sớm",
  absent: "Vắng mặt",
  on_leave: "Nghỉ phép",
  holiday: "Ngày lễ",
};

const STATUS_VARIANT: Record<AttendanceStatus, "success" | "warning" | "destructive" | "outline"> = {
  on_time: "success",
  late: "warning",
  early_leave: "warning",
  absent: "destructive",
  on_leave: "outline",
  holiday: "outline",
};

const formatDate = (v: string) => new Date(v).toLocaleDateString("vi-VN");
const formatTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";

const getMonthOptions = () => {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value, label: `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` });
  }
  return options;
};

const AttendanceReportPage = () => {
  const [items, setItems] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [confirmMark, setConfirmMark] = useState(false);
  const [markLoading, setMarkLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [att, emps] = await Promise.all([
        attendanceService.listAll({
          month,
          ...(employeeId ? { employeeId } : {}),
          ...(status ? { status } : {}),
        }),
        employees.length === 0 ? employeeService.list({ pageSize: 500 }) : Promise.resolve(null),
      ]);
      setItems(att);
      if (emps) setEmployees(emps.employees);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Không tải được báo cáo");
    } finally {
      setLoading(false);
    }
  }, [month, employeeId, status, employees.length]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkAbsent = async () => {
    try {
      setMarkLoading(true);
      const res = await attendanceService.markAbsent();
      toast.success(res.message);
      setConfirmMark(false);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Thao tác thất bại");
    } finally {
      setMarkLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Bảng chấm công</h1>
          <p className="text-muted-foreground text-sm">Xem toàn bộ chấm công tháng, filter theo NV/trạng thái.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setConfirmMark(true)}>
            Đánh dấu vắng hôm nay
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tháng</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            {getMonthOptions().map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Nhân viên</label>
          <select
            value={employeeId ?? ""}
            onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : null)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">Tất cả</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.code} — {e.displayName}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Trạng thái</label>
          <select
            value={status ?? ""}
            onChange={(e) => setStatus((e.target.value as AttendanceStatus) || null)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">Tất cả</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-md border bg-background">
        {!loading && items.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Chưa có bản ghi chấm công"
            description="Chọn tháng khác hoặc xóa filter."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày</TableHead>
                <TableHead>Nhân viên</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Giờ làm</TableHead>
                <TableHead>OT</TableHead>
                <TableHead>Trễ (phút)</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            {loading ? <TableSkeleton cols={8} /> : (
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{formatDate(a.date)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{a.Employee?.displayName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{a.Employee?.code}</div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{formatTime(a.checkInAt)}</TableCell>
                    <TableCell className="font-mono text-sm">{formatTime(a.checkOutAt)}</TableCell>
                    <TableCell className="font-mono">{a.hoursWorked}</TableCell>
                    <TableCell className="font-mono">{Number(a.otHours) > 0 ? a.otHours : "—"}</TableCell>
                    <TableCell>{a.lateMinutes > 0 ? a.lateMinutes : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        )}
      </div>

      <ConfirmDialog
        open={confirmMark}
        onOpenChange={setConfirmMark}
        title="Đánh dấu vắng"
        description="Đánh dấu tất cả NV chưa check-in trong ngày hôm nay là 'Vắng mặt'. Bạn chắc chắn?"
        confirmText="Đánh dấu"
        onConfirm={handleMarkAbsent}
        loading={markLoading}
      />
    </div>
  );
};

export default AttendanceReportPage;
