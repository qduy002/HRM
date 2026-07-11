import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Plus, Trash2, UserCog, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { employeeService } from "@/services/employeeService";
import { allowanceService } from "@/services/allowanceService";
import { salaryStructureService } from "@/services/salaryStructureService";
import { employeeAllowanceService } from "@/services/employeeAllowanceService";
import type { Employee } from "@/types/employee";
import type { Allowance, EmployeeAllowance, SalaryStructure } from "@/types/payroll";

const fmt = (n: string | number | null | undefined) =>
  n == null || n === "" ? "—" : Number(n).toLocaleString("vi-VN") + " ₫";

const isActiveNow = (from: string, to: string | null) => {
  const today = new Date().toISOString().split("T")[0];
  return from <= today && (to == null || to >= today);
};

const salarySchema = z.object({
  basicSalary: z.number().min(0, "Nhập lương cơ bản"),
  bhxhSalary: z.number().min(0).nullable().optional(),
  effectiveFrom: z.string().min(1, "Chọn ngày hiệu lực"),
  effectiveTo: z.string().nullable().optional(),
  note: z.string().optional(),
});
type SalaryFormValues = z.infer<typeof salarySchema>;

const allowanceAssignSchema = z.object({
  allowanceId: z.number().min(1, "Chọn phụ cấp"),
  amount: z.number().min(0, "Nhập số tiền"),
  effectiveFrom: z.string().min(1, "Chọn ngày hiệu lực"),
  effectiveTo: z.string().nullable().optional(),
  note: z.string().optional(),
});
type AllowanceFormValues = z.infer<typeof allowanceAssignSchema>;

const SalaryConfigPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [loadingEmps, setLoadingEmps] = useState(true);

  const [salaries, setSalaries] = useState<SalaryStructure[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [empAllowances, setEmpAllowances] = useState<EmployeeAllowance[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Salary dialog
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<SalaryStructure | null>(null);
  const [toDeleteSalary, setToDeleteSalary] = useState<SalaryStructure | null>(null);

  // Allowance dialog
  const [allowDialogOpen, setAllowDialogOpen] = useState(false);
  const [editingAllow, setEditingAllow] = useState<EmployeeAllowance | null>(null);
  const [toDeleteAllow, setToDeleteAllow] = useState<EmployeeAllowance | null>(null);

  const salaryForm = useForm<SalaryFormValues>({ resolver: zodResolver(salarySchema) });
  const allowForm = useForm<AllowanceFormValues>({ resolver: zodResolver(allowanceAssignSchema) });

  useEffect(() => {
    (async () => {
      try {
        setLoadingEmps(true);
        const res = await employeeService.list({ pageSize: 500 });
        setEmployees(res.employees);
        if (res.employees[0]) setSelectedEmpId(res.employees[0].id);
      } finally {
        setLoadingEmps(false);
      }
      try {
        setAllowances(await allowanceService.list());
      } catch { /* empty */ }
    })();
  }, []);

  const loadEmpData = async (empId: number) => {
    try {
      setLoadingData(true);
      const [ss, ea] = await Promise.all([
        salaryStructureService.list(empId),
        employeeAllowanceService.list(empId),
      ]);
      setSalaries(ss);
      setEmpAllowances(ea);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (selectedEmpId) loadEmpData(selectedEmpId);
  }, [selectedEmpId]);

  const currentSalary = useMemo(
    () => salaries.find((s) => isActiveNow(s.effectiveFrom, s.effectiveTo)),
    [salaries]
  );
  const currentAllowances = useMemo(
    () => empAllowances.filter((e) => isActiveNow(e.effectiveFrom, e.effectiveTo)),
    [empAllowances]
  );

  // ─── Salary handlers ───
  const openSalaryCreate = () => {
    setEditingSalary(null);
    const today = new Date().toISOString().split("T")[0];
    salaryForm.reset({ basicSalary: 0, bhxhSalary: null, effectiveFrom: today, effectiveTo: null, note: "" });
    setSalaryDialogOpen(true);
  };
  const openSalaryEdit = (s: SalaryStructure) => {
    setEditingSalary(s);
    salaryForm.reset({
      basicSalary: Number(s.basicSalary),
      bhxhSalary: Number(s.bhxhSalary),
      effectiveFrom: s.effectiveFrom,
      effectiveTo: s.effectiveTo ?? null,
      note: s.note ?? "",
    });
    setSalaryDialogOpen(true);
  };
  const onSalarySubmit = async (v: SalaryFormValues) => {
    if (!selectedEmpId) return;
    try {
      const payload = {
        basicSalary: String(v.basicSalary),
        bhxhSalary: v.bhxhSalary != null ? String(v.bhxhSalary) : String(v.basicSalary),
        effectiveFrom: v.effectiveFrom,
        effectiveTo: v.effectiveTo || null,
        note: v.note || null,
      };
      if (editingSalary) {
        await salaryStructureService.update(editingSalary.id, payload);
      } else {
        await salaryStructureService.create({ employeeId: selectedEmpId, ...payload });
      }
      toast.success(editingSalary ? "Đã cập nhật cấu trúc lương" : "Đã tạo cấu trúc lương mới");
      setSalaryDialogOpen(false);
      loadEmpData(selectedEmpId);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Lưu thất bại");
    }
  };
  const confirmDeleteSalary = async () => {
    if (!toDeleteSalary || !selectedEmpId) return;
    try {
      await salaryStructureService.delete(toDeleteSalary.id);
      toast.success("Đã xóa");
      setToDeleteSalary(null);
      loadEmpData(selectedEmpId);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Xóa thất bại");
    }
  };

  // ─── Allowance handlers ───
  const openAllowCreate = () => {
    setEditingAllow(null);
    const today = new Date().toISOString().split("T")[0];
    allowForm.reset({ allowanceId: 0, amount: 0, effectiveFrom: today, effectiveTo: null, note: "" });
    setAllowDialogOpen(true);
  };
  const openAllowEdit = (e: EmployeeAllowance) => {
    setEditingAllow(e);
    allowForm.reset({
      allowanceId: e.allowanceId,
      amount: Number(e.amount),
      effectiveFrom: e.effectiveFrom,
      effectiveTo: e.effectiveTo ?? null,
      note: e.note ?? "",
    });
    setAllowDialogOpen(true);
  };
  const onAllowSubmit = async (v: AllowanceFormValues) => {
    if (!selectedEmpId) return;
    try {
      const payload = {
        amount: String(v.amount),
        effectiveFrom: v.effectiveFrom,
        effectiveTo: v.effectiveTo || null,
        note: v.note || null,
      };
      if (editingAllow) {
        await employeeAllowanceService.update(editingAllow.id, payload);
      } else {
        await employeeAllowanceService.create({
          employeeId: selectedEmpId,
          allowanceId: v.allowanceId,
          ...payload,
        });
      }
      toast.success(editingAllow ? "Đã cập nhật gán phụ cấp" : "Đã gán phụ cấp");
      setAllowDialogOpen(false);
      loadEmpData(selectedEmpId);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Lưu thất bại");
    }
  };
  const confirmDeleteAllow = async () => {
    if (!toDeleteAllow || !selectedEmpId) return;
    try {
      await employeeAllowanceService.delete(toDeleteAllow.id);
      toast.success("Đã xóa");
      setToDeleteAllow(null);
      loadEmpData(selectedEmpId);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Xóa thất bại");
    }
  };

  // Auto-fill amount when picking allowance in the dialog
  const watchAllowanceId = allowForm.watch("allowanceId");
  useEffect(() => {
    if (editingAllow) return;
    const picked = allowances.find((a) => a.id === Number(watchAllowanceId));
    if (picked?.defaultAmount != null) {
      allowForm.setValue("amount", Number(picked.defaultAmount), { shouldDirty: false });
    }
  }, [watchAllowanceId, allowances, editingAllow, allowForm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Cấu hình lương nhân viên</h1>
          <p className="text-muted-foreground text-sm">
            Cấu hình lương cơ bản (versioned) và phụ cấp gán cho từng nhân viên.
          </p>
        </div>
      </div>

      {/* Employee picker */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <UserCog className="h-5 w-5 text-muted-foreground" />
            <Label htmlFor="employee-picker" className="whitespace-nowrap">Nhân viên:</Label>
            <select
              id="employee-picker"
              value={selectedEmpId ?? ""}
              onChange={(e) => setSelectedEmpId(Number(e.target.value) || null)}
              disabled={loadingEmps}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-72"
            >
              {loadingEmps && <option>Đang tải...</option>}
              {!loadingEmps && employees.length === 0 && <option>Không có nhân viên</option>}
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} — {e.displayName}
                </option>
              ))}
            </select>
            {currentSalary && (
              <div className="ml-auto text-sm text-muted-foreground">
                Lương hiện hành: <span className="font-semibold text-foreground">{fmt(currentSalary.basicSalary)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedEmpId == null ? (
        <EmptyState icon={UserCog} title="Chọn nhân viên" description="Chọn 1 NV ở trên để xem cấu hình lương." />
      ) : (
        <>
          {/* Salary structures */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Lịch sử cấu trúc lương</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Tạo mới sẽ tự động đóng bản ghi trước đó (effectiveTo = ngày trước ngày hiệu lực mới).
                </p>
              </div>
              <Button onClick={openSalaryCreate}><Plus className="h-4 w-4" />Thêm cấu trúc</Button>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Từ</TableHead><TableHead>Đến</TableHead><TableHead>Cơ bản</TableHead><TableHead>BHXH</TableHead><TableHead></TableHead></TableRow>
                  </TableHeader>
                  <TableSkeleton cols={5} />
                </Table>
              ) : salaries.length === 0 ? (
                <EmptyState
                  icon={Coins}
                  title="Chưa có cấu trúc lương"
                  description="NV này chưa có lương. Bấm 'Thêm cấu trúc' để tạo mới."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Từ ngày</TableHead>
                      <TableHead>Đến ngày</TableHead>
                      <TableHead>Lương cơ bản</TableHead>
                      <TableHead>Lương BHXH</TableHead>
                      <TableHead>Ghi chú</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaries.map((s) => {
                      const active = isActiveNow(s.effectiveFrom, s.effectiveTo);
                      return (
                        <TableRow key={s.id} className={cn(active && "bg-primary/5")}>
                          <TableCell className="font-mono">{s.effectiveFrom}</TableCell>
                          <TableCell className="font-mono">{s.effectiveTo ?? <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="font-mono">{fmt(s.basicSalary)}</TableCell>
                          <TableCell className="font-mono">{fmt(s.bhxhSalary)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{s.note || "—"}</TableCell>
                          <TableCell>
                            {active ? <Badge variant="success">Đang áp dụng</Badge> : <Badge variant="outline">Lịch sử</Badge>}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => openSalaryEdit(s)}><Pencil className="h-4 w-4" />Sửa</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onSelect={() => setToDeleteSalary(s)}><Trash2 className="h-4 w-4" />Xóa</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Employee allowances */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Phụ cấp gán cho nhân viên</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Đang áp dụng: {currentAllowances.length} phụ cấp.
                </p>
              </div>
              <Button onClick={openAllowCreate} disabled={allowances.filter(a => a.isActive).length === 0}>
                <Plus className="h-4 w-4" />Gán phụ cấp
              </Button>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Phụ cấp</TableHead><TableHead>Từ</TableHead><TableHead>Đến</TableHead><TableHead>Số tiền</TableHead><TableHead></TableHead></TableRow>
                  </TableHeader>
                  <TableSkeleton cols={5} />
                </Table>
              ) : empAllowances.length === 0 ? (
                <EmptyState
                  icon={Coins}
                  title="Chưa gán phụ cấp"
                  description={
                    allowances.filter(a => a.isActive).length === 0
                      ? "Chưa có phụ cấp nào trong danh mục. Vào 'Danh mục phụ cấp' để tạo trước."
                      : "Bấm 'Gán phụ cấp' để thêm."
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead>Chịu thuế</TableHead>
                      <TableHead>Số tiền/tháng</TableHead>
                      <TableHead>Từ ngày</TableHead>
                      <TableHead>Đến ngày</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empAllowances.map((e) => {
                      const active = isActiveNow(e.effectiveFrom, e.effectiveTo);
                      return (
                        <TableRow key={e.id} className={cn(active && "bg-primary/5")}>
                          <TableCell className="font-mono font-medium">{e.Allowance?.code}</TableCell>
                          <TableCell>{e.Allowance?.name}</TableCell>
                          <TableCell>
                            {e.Allowance?.isTaxable
                              ? <Badge variant="warning">Chịu thuế</Badge>
                              : <Badge variant="success">Miễn thuế</Badge>}
                          </TableCell>
                          <TableCell className="font-mono">{fmt(e.amount)}</TableCell>
                          <TableCell className="font-mono">{e.effectiveFrom}</TableCell>
                          <TableCell className="font-mono">{e.effectiveTo ?? <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell>
                            {active ? <Badge variant="success">Đang áp dụng</Badge> : <Badge variant="outline">Lịch sử</Badge>}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => openAllowEdit(e)}><Pencil className="h-4 w-4" />Sửa</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onSelect={() => setToDeleteAllow(e)}><Trash2 className="h-4 w-4" />Xóa</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Salary dialog */}
      <Dialog open={salaryDialogOpen} onOpenChange={setSalaryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSalary ? "Sửa cấu trúc lương" : "Thêm cấu trúc lương"}</DialogTitle>
            <DialogDescription>
              Lương BHXH thường bằng lương cơ bản. Để trống nếu muốn dùng bằng lương cơ bản.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salaryForm.handleSubmit(onSalarySubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="basicSalary">Lương cơ bản (VND) *</Label>
                <Input
                  id="basicSalary" type="number" step="100000" min={0}
                  {...salaryForm.register("basicSalary", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
                />
                {salaryForm.formState.errors.basicSalary && <p className="text-xs text-destructive">{salaryForm.formState.errors.basicSalary.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bhxhSalary">Lương BHXH (VND)</Label>
                <Input
                  id="bhxhSalary" type="number" step="100000" min={0}
                  placeholder="Trống = bằng lương cơ bản"
                  {...salaryForm.register("bhxhSalary", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveFrom">Hiệu lực từ *</Label>
                <Input id="effectiveFrom" type="date" {...salaryForm.register("effectiveFrom")} />
                {salaryForm.formState.errors.effectiveFrom && <p className="text-xs text-destructive">{salaryForm.formState.errors.effectiveFrom.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveTo">Hiệu lực đến</Label>
                <Input
                  id="effectiveTo" type="date"
                  {...salaryForm.register("effectiveTo", { setValueAs: (v) => (v === "" ? null : v) })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="salaryNote">Ghi chú</Label>
                <Textarea id="salaryNote" rows={2} {...salaryForm.register("note")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSalaryDialogOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={salaryForm.formState.isSubmitting}>
                {salaryForm.formState.isSubmitting ? "Đang lưu..." : editingSalary ? "Cập nhật" : "Tạo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Allowance dialog */}
      <Dialog open={allowDialogOpen} onOpenChange={setAllowDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAllow ? "Sửa phụ cấp gán" : "Gán phụ cấp"}</DialogTitle>
            <DialogDescription>
              Chọn phụ cấp từ danh mục. Có thể override số tiền so với mức mặc định.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={allowForm.handleSubmit(onAllowSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="allowanceId">Loại phụ cấp *</Label>
              <select
                id="allowanceId"
                {...allowForm.register("allowanceId", { setValueAs: (v) => Number(v) })}
                disabled={!!editingAllow}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              >
                <option value={0}>-- Chọn phụ cấp --</option>
                {allowances.filter((a) => a.isActive).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name} {a.isTaxable ? "(Chịu thuế)" : "(Miễn thuế)"}
                  </option>
                ))}
              </select>
              {allowForm.formState.errors.allowanceId && <p className="text-xs text-destructive">{allowForm.formState.errors.allowanceId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="amount">Số tiền/tháng (VND) *</Label>
                <Input
                  id="amount" type="number" step="10000" min={0}
                  {...allowForm.register("amount", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
                />
                {allowForm.formState.errors.amount && <p className="text-xs text-destructive">{allowForm.formState.errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="allowFrom">Hiệu lực từ *</Label>
                <Input id="allowFrom" type="date" {...allowForm.register("effectiveFrom")} />
                {allowForm.formState.errors.effectiveFrom && <p className="text-xs text-destructive">{allowForm.formState.errors.effectiveFrom.message}</p>}
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="allowTo">Hiệu lực đến</Label>
                <Input
                  id="allowTo" type="date"
                  {...allowForm.register("effectiveTo", { setValueAs: (v) => (v === "" ? null : v) })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="allowNote">Ghi chú</Label>
                <Textarea id="allowNote" rows={2} {...allowForm.register("note")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAllowDialogOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={allowForm.formState.isSubmitting}>
                {allowForm.formState.isSubmitting ? "Đang lưu..." : editingAllow ? "Cập nhật" : "Gán"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDeleteSalary}
        onOpenChange={(open) => !open && setToDeleteSalary(null)}
        title="Xóa cấu trúc lương"
        description={`Xóa cấu trúc từ ${toDeleteSalary?.effectiveFrom}? Bảng lương đã tính vẫn giữ nguyên (immutable).`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDeleteSalary}
      />

      <ConfirmDialog
        open={!!toDeleteAllow}
        onOpenChange={(open) => !open && setToDeleteAllow(null)}
        title="Xóa phụ cấp gán"
        description={`Xóa gán "${toDeleteAllow?.Allowance?.name}"?`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDeleteAllow}
      />
    </div>
  );
};

export default SalaryConfigPage;
