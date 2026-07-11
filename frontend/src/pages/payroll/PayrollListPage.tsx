import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  Download, Eye, FileText, Lock, MoreHorizontal, Play, Plus, Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { payrollService } from "@/services/payrollService";
import { employeeService } from "@/services/employeeService";
import type { Employee } from "@/types/employee";
import type { Payroll, PayrollPreviewResult, PayrollStatus } from "@/types/payroll";

const fmt = (n: string | number | null | undefined) =>
  n == null || n === "" ? "—" : Number(n).toLocaleString("vi-VN") + " ₫";

const STATUS_LABEL: Record<PayrollStatus, { label: string; variant: "outline" | "success" | "warning" }> = {
  draft: { label: "Nháp", variant: "outline" },
  finalized: { label: "Đã chốt", variant: "warning" },
  paid: { label: "Đã trả", variant: "success" },
};

const now = new Date();
const DEFAULT_MONTH = now.getMonth() + 1;
const DEFAULT_YEAR = now.getFullYear();

const PayrollListPage = () => {
  const navigate = useNavigate();
  const { companyCode } = useParams<{ companyCode: string }>();

  const [month, setMonth] = useState(DEFAULT_MONTH);
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [statusFilter, setStatusFilter] = useState<PayrollStatus | "">("");
  const [empFilter, setEmpFilter] = useState<number | "">("");

  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewEmpId, setPreviewEmpId] = useState<number | "">("");
  const [previewResult, setPreviewResult] = useState<PayrollPreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const [generateConfirm, setGenerateConfirm] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [actionTarget, setActionTarget] = useState<{ payroll: Payroll; action: "finalize" | "unlock" | "mark-paid" } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await employeeService.list({ pageSize: 500 });
        setEmployees(res.employees);
      } catch { /* noop */ }
    })();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const items = await payrollService.list({
        month, year,
        status: statusFilter || undefined,
        employeeId: empFilter || undefined,
      });
      setPayrolls(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month, year, statusFilter, empFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const runPreview = async () => {
    if (!previewEmpId) { toast.error("Chọn nhân viên"); return; }
    try {
      setPreviewing(true);
      const result = await payrollService.preview({ employeeId: Number(previewEmpId), month, year });
      setPreviewResult(result);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Preview thất bại");
    } finally {
      setPreviewing(false);
    }
  };

  const runGenerate = async () => {
    try {
      setGenerating(true);
      const res = await payrollService.generate({ month, year });
      const { summary } = res;
      toast.success(`Đã tạo ${summary.generated} bảng lương, bỏ qua ${summary.skipped}, lỗi ${summary.errors}`);
      if (res.errors.length > 0) {
        res.errors.slice(0, 3).forEach((err) => toast.warning(`NV #${err.employeeId}: ${err.message}`));
      }
      setGenerateConfirm(false);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Generate thất bại");
    } finally {
      setGenerating(false);
    }
  };

  const runAction = async () => {
    if (!actionTarget) return;
    const { payroll, action } = actionTarget;
    try {
      if (action === "finalize") await payrollService.finalize(payroll.id);
      else if (action === "unlock") await payrollService.unlock(payroll.id);
      else if (action === "mark-paid") await payrollService.markPaid(payroll.id);
      toast.success(
        action === "finalize" ? "Đã chốt bảng lương"
        : action === "unlock" ? "Đã mở khóa"
        : "Đã đánh dấu thanh toán"
      );
      setActionTarget(null);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Thất bại");
    }
  };

  const runExport = async () => {
    try {
      const blob = await payrollService.exportCSV(month, year);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll_${year}_${String(month).padStart(2, "0")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Export thất bại");
    }
  };

  const totalNet = payrolls.reduce((s, p) => s + Number(p.netSalary), 0);
  const totalGross = payrolls.reduce((s, p) => s + Number(p.grossSalary), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Bảng lương</h1>
          <p className="text-muted-foreground text-sm">
            Tính lương hàng tháng, workflow: nháp → chốt → trả. Bảng đã chốt vẫn có thể unlock để sửa.
          </p>
        </div>
      </div>

      {/* Filters + actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="month" className="text-xs">Tháng</Label>
              <Input
                id="month" type="number" min={1} max={12} className="w-20"
                value={month} onChange={(e) => setMonth(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="year" className="text-xs">Năm</Label>
              <Input
                id="year" type="number" min={2020} max={2050} className="w-24"
                value={year} onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs">Trạng thái</Label>
              <select
                id="status" value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PayrollStatus | "")}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm w-32"
              >
                <option value="">Tất cả</option>
                <option value="draft">Nháp</option>
                <option value="finalized">Đã chốt</option>
                <option value="paid">Đã trả</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="emp" className="text-xs">Nhân viên</Label>
              <select
                id="emp" value={empFilter}
                onChange={(e) => setEmpFilter(e.target.value === "" ? "" : Number(e.target.value))}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm w-56"
              >
                <option value="">Tất cả</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.code} — {e.displayName}</option>
                ))}
              </select>
            </div>
            <div className="flex-1" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setPreviewResult(null); setPreviewEmpId(""); setPreviewOpen(true); }}>
                <Eye className="h-4 w-4" />Preview 1 NV
              </Button>
              <Button variant="outline" onClick={runExport} disabled={payrolls.length === 0}>
                <Download className="h-4 w-4" />Export CSV
              </Button>
              <Button onClick={() => setGenerateConfirm(true)}>
                <Plus className="h-4 w-4" />Tính lương tháng {String(month).padStart(2, "0")}/{year}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary strip */}
      {payrolls.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Số bảng lương</div>
              <div className="text-2xl font-bold font-mono">{payrolls.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Tổng GROSS</div>
              <div className="text-2xl font-bold font-mono">{fmt(totalGross)}</div>
            </CardContent>
          </Card>
          <Card className="border-primary">
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Tổng NET phải trả</div>
              <div className="text-2xl font-bold font-mono text-primary">{fmt(totalNet)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border bg-background">
        {loading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NV</TableHead><TableHead>Tháng</TableHead><TableHead>Ngày công</TableHead>
                <TableHead>Gross</TableHead><TableHead>BH+Thuế</TableHead><TableHead>NET</TableHead>
                <TableHead>Trạng thái</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableSkeleton cols={8} />
          </Table>
        ) : payrolls.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Chưa có bảng lương"
            description={`Không có bảng lương tháng ${month}/${year} với filter hiện tại. Bấm 'Tính lương tháng ...' để generate.`}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NV</TableHead>
                <TableHead>Tháng</TableHead>
                <TableHead>Ngày công</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">BH+Thuế</TableHead>
                <TableHead className="text-right">NET</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrolls.map((p) => {
                const bhTax = Number(p.totalInsuranceEmployee) + Number(p.personalIncomeTax);
                const st = STATUS_LABEL[p.status];
                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/${companyCode}/payroll/${p.id}`)}
                  >
                    <TableCell>
                      <div className="font-mono font-medium">{p.Employee?.code}</div>
                      <div className="text-sm text-muted-foreground">{p.Employee?.displayName}</div>
                    </TableCell>
                    <TableCell className="font-mono">{String(p.month).padStart(2, "0")}/{p.year}</TableCell>
                    <TableCell className="font-mono">{p.actualPaidDays}/{p.workingDaysStandard}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(p.grossSalary)}</TableCell>
                    <TableCell className="text-right font-mono text-red-600">− {fmt(bhTax)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-primary">{fmt(p.netSalary)}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => navigate(`/${companyCode}/payroll/${p.id}`)}>
                            <Eye className="h-4 w-4" />Xem chi tiết
                          </DropdownMenuItem>
                          {p.status === "draft" && (
                            <DropdownMenuItem onSelect={() => setActionTarget({ payroll: p, action: "finalize" })}>
                              <Lock className="h-4 w-4" />Chốt bảng lương
                            </DropdownMenuItem>
                          )}
                          {p.status === "finalized" && (
                            <>
                              <DropdownMenuItem onSelect={() => setActionTarget({ payroll: p, action: "mark-paid" })}>
                                <Play className="h-4 w-4" />Đánh dấu đã trả
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setActionTarget({ payroll: p, action: "unlock" })}>
                                <Unlock className="h-4 w-4" />Mở khóa để sửa
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview lương — không lưu DB</DialogTitle>
            <DialogDescription>
              Tính thử để xem số trước khi generate. Không tạo bản ghi trong DB.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Nhân viên</Label>
                <select
                  value={previewEmpId}
                  onChange={(e) => setPreviewEmpId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">-- Chọn NV --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.code} — {e.displayName}</option>
                  ))}
                </select>
              </div>
              <Button onClick={runPreview} disabled={previewing || !previewEmpId}>
                {previewing ? "Đang tính..." : <><Play className="h-4 w-4" />Tính preview</>}
              </Button>
            </div>

            {previewResult && (
              <div className="space-y-2 rounded-md border p-4 bg-muted/30">
                <div className="text-sm">
                  <span className="font-medium">{previewResult.employee.code} — {previewResult.employee.displayName}</span>
                  <span className="text-muted-foreground"> | Tháng {month}/{year}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm font-mono">
                  <div className="flex justify-between"><span className="text-muted-foreground">Ngày công</span><span>{previewResult.payroll.actualPaidDays}/{previewResult.payroll.workingDaysStandard}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">OT</span><span>{Number(previewResult.payroll.otHours).toFixed(2)}h</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">GROSS</span><span>{fmt(previewResult.payroll.grossSalary)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tổng BH</span><span className="text-blue-600">− {fmt(previewResult.payroll.totalInsuranceEmployee)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Thuế TNCN</span><span className="text-red-600">− {fmt(previewResult.payroll.personalIncomeTax)}</span></div>
                  <div className="flex justify-between border-t pt-1 font-bold"><span>★ NET</span><span className="text-primary">{fmt(previewResult.payroll.netSalary)}</span></div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate confirm */}
      <ConfirmDialog
        open={generateConfirm}
        onOpenChange={setGenerateConfirm}
        title={`Tính lương tháng ${String(month).padStart(2, "0")}/${year}?`}
        description="Tính cho tất cả NV active (probation/active/on_leave) có cấu trúc lương. Bảng đã tồn tại sẽ bị bỏ qua (không ghi đè)."
        confirmText={generating ? "Đang tính..." : "Bắt đầu tính"}
        onConfirm={runGenerate}
      />

      {/* Action confirm */}
      <ConfirmDialog
        open={!!actionTarget}
        onOpenChange={(open) => !open && setActionTarget(null)}
        title={
          actionTarget?.action === "finalize" ? "Chốt bảng lương?"
          : actionTarget?.action === "mark-paid" ? "Đánh dấu đã thanh toán?"
          : "Mở khóa bảng lương?"
        }
        description={
          actionTarget?.action === "finalize" ? "Sau khi chốt, NV có thể thấy payslip của mình. Bạn vẫn có thể unlock để sửa lại."
          : actionTarget?.action === "mark-paid" ? "Đánh dấu bảng lương đã được thanh toán cho NV."
          : `Mở lại để chỉnh sửa. Số lần unlock hiện tại: ${actionTarget?.payroll.unlockCount ?? 0}.`
        }
        confirmText={
          actionTarget?.action === "finalize" ? "Chốt bảng lương"
          : actionTarget?.action === "mark-paid" ? "Đánh dấu đã trả"
          : "Mở khóa"
        }
        onConfirm={runAction}
      />
    </div>
  );
};

export default PayrollListPage;
