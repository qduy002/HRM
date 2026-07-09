import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarClock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { workScheduleService } from "@/services/workScheduleService";
import { shiftService } from "@/services/shiftService";
import { employeeService } from "@/services/employeeService";
import type { Shift, WorkSchedule } from "@/types/attendance";
import type { Employee } from "@/types/employee";

const schema = z.object({
  employeeId: z.number().int().min(1, "Chọn nhân viên"),
  shiftId: z.number().int().min(1, "Chọn ca"),
  effectiveFrom: z.string().min(1, "Chọn ngày bắt đầu"),
  effectiveTo: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const formatDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("vi-VN") : "—");

const WorkSchedulesPage = () => {
  const [items, setItems] = useState<WorkSchedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkSchedule | null>(null);
  const [toDelete, setToDelete] = useState<WorkSchedule | null>(null);

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const load = async () => {
    try {
      setLoading(true);
      const [ws, sh, emps] = await Promise.all([
        workScheduleService.list(),
        shiftService.list(),
        employeeService.list({ pageSize: 500 }),
      ]);
      setItems(ws);
      setShifts(sh);
      setEmployees(emps.employees);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    reset({
      employeeId: employees[0]?.id ?? 0,
      shiftId: shifts[0]?.id ?? 0,
      effectiveFrom: new Date().toISOString().split("T")[0],
      effectiveTo: "",
      note: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (w: WorkSchedule) => {
    setEditing(w);
    reset({
      employeeId: w.employeeId,
      shiftId: w.shiftId,
      effectiveFrom: w.effectiveFrom,
      effectiveTo: w.effectiveTo ?? "",
      note: w.note ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        effectiveTo: values.effectiveTo || null,
        note: values.note || undefined,
      };
      if (editing) await workScheduleService.update(editing.id, payload);
      else await workScheduleService.create(payload);
      toast.success(editing ? "Cập nhật thành công" : "Gán ca thành công");
      setDialogOpen(false);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Lưu thất bại");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await workScheduleService.delete(toDelete.id);
      toast.success("Xóa thành công");
      setToDelete(null);
      load();
    } catch {
      toast.error("Xóa thất bại");
    }
  };

  const hasPrereqs = employees.length > 0 && shifts.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Lịch làm việc</h1>
          <p className="text-muted-foreground text-sm">
            Gán ca cho từng nhân viên. NV có ca sẽ dùng ca đó để tính late/OT khi check-in.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!hasPrereqs}>
          <Plus className="h-4 w-4" />
          Gán ca
        </Button>
      </div>

      {!hasPrereqs && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
          Cần có ít nhất 1 ca và 1 nhân viên trước khi gán lịch.
        </div>
      )}

      <div className="rounded-md border bg-background">
        {!loading && items.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Chưa có lịch làm việc nào"
            description="Gán ca chuẩn cho từng NV. NV chưa gán sẽ dùng ca mặc định 8:00-17:30."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhân viên</TableHead>
                <TableHead>Ca</TableHead>
                <TableHead>Từ ngày</TableHead>
                <TableHead>Đến ngày</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            {loading ? <TableSkeleton cols={6} /> : (
              <TableBody>
                {items.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>
                      <div className="font-medium">{w.Employee?.displayName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{w.Employee?.code}</div>
                    </TableCell>
                    <TableCell>
                      <div>{w.Shift?.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {w.Shift?.startTime.slice(0, 5)} – {w.Shift?.endTime.slice(0, 5)}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(w.effectiveFrom)}</TableCell>
                    <TableCell>
                      {w.effectiveTo ? formatDate(w.effectiveTo) : <Badge variant="success">Hiện tại</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{w.note || "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(w)}><Pencil className="h-4 w-4" />Sửa</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => setToDelete(w)}><Trash2 className="h-4 w-4" />Xóa</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa lịch làm" : "Gán ca cho nhân viên"}</DialogTitle>
            <DialogDescription>NV sẽ dùng ca này để tính chấm công.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Nhân viên *</Label>
              <select id="employeeId" {...register("employeeId", { valueAsNumber: true })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.code} — {e.displayName}</option>
                ))}
              </select>
              {errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="shiftId">Ca *</Label>
              <select id="shiftId" {...register("shiftId", { valueAsNumber: true })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)})</option>
                ))}
              </select>
              {errors.shiftId && <p className="text-xs text-destructive">{errors.shiftId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="effectiveFrom">Từ ngày *</Label>
                <Input id="effectiveFrom" type="date" {...register("effectiveFrom")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveTo">Đến ngày (để trống = mãi mãi)</Label>
                <Input id="effectiveTo" type="date" {...register("effectiveTo")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea id="note" {...register("note")} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Hủy</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang lưu..." : editing ? "Cập nhật" : "Gán ca"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Xóa lịch làm"
        description={`Xóa lịch của "${toDelete?.Employee?.displayName}"?`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default WorkSchedulesPage;
