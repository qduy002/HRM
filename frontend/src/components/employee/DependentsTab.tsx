import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HeartHandshake, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { dependentService } from "@/services/dependentService";
import type { DependentRelationship, EmployeeDependent } from "@/types/employee";

const REL_LABELS: Record<DependentRelationship, string> = {
  child: "Con",
  parent: "Bố/Mẹ",
  spouse: "Vợ/Chồng",
  other: "Khác",
};

const schema = z.object({
  name: z.string().min(1, "Nhập tên"),
  relationship: z.enum(["child", "parent", "spouse", "other"]),
  dateOfBirth: z.string().optional(),
  identityNumber: z.string().optional(),
  taxCode: z.string().optional(),
  deductionStartDate: z.string().min(1, "Chọn ngày bắt đầu giảm trừ"),
  deductionEndDate: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const formatDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("vi-VN") : "—");

interface Props {
  employeeId: number;
}

export const DependentsTab = ({ employeeId }: Props) => {
  const [items, setItems] = useState<EmployeeDependent[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeDependent | null>(null);
  const [toDelete, setToDelete] = useState<EmployeeDependent | null>(null);

  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const load = async () => {
    try {
      setLoading(true);
      setItems(await dependentService.list(employeeId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    reset({
      name: "",
      relationship: "child",
      deductionStartDate: new Date().toISOString().split("T")[0],
    });
    setDialogOpen(true);
  };

  const openEdit = (d: EmployeeDependent) => {
    setEditing(d);
    reset({
      name: d.name,
      relationship: d.relationship,
      dateOfBirth: d.dateOfBirth ?? "",
      identityNumber: d.identityNumber ?? "",
      taxCode: d.taxCode ?? "",
      deductionStartDate: d.deductionStartDate,
      deductionEndDate: d.deductionEndDate ?? "",
      note: d.note ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        dateOfBirth: values.dateOfBirth || null,
        identityNumber: values.identityNumber || null,
        taxCode: values.taxCode || null,
        deductionEndDate: values.deductionEndDate || null,
        note: values.note || null,
      };
      if (editing) await dependentService.update(employeeId, editing.id, payload);
      else await dependentService.create(employeeId, payload);
      toast.success(editing ? "Cập nhật thành công" : "Thêm thành công");
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
      await dependentService.delete(employeeId, toDelete.id);
      toast.success("Xóa thành công");
      setToDelete(null);
      load();
    } catch {
      toast.error("Xóa thất bại");
    }
  };

  const showEmpty = !loading && items.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Người phụ thuộc</h3>
          <p className="text-sm text-muted-foreground">Dùng cho giảm trừ gia cảnh thuế TNCN (4.4tr/người/tháng).</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        {showEmpty ? (
          <EmptyState
            icon={HeartHandshake}
            title="Chưa có người phụ thuộc"
            description="Khai báo con, bố mẹ, vợ/chồng để giảm trừ thuế TNCN."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Quan hệ</TableHead>
                <TableHead>Ngày sinh</TableHead>
                <TableHead>CCCD</TableHead>
                <TableHead>Bắt đầu GT</TableHead>
                <TableHead>Kết thúc GT</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            {loading ? <TableSkeleton cols={7} /> : (
              <TableBody>
                {items.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{REL_LABELS[d.relationship]}</TableCell>
                    <TableCell>{formatDate(d.dateOfBirth)}</TableCell>
                    <TableCell className="font-mono text-sm">{d.identityNumber || "—"}</TableCell>
                    <TableCell>{formatDate(d.deductionStartDate)}</TableCell>
                    <TableCell>{formatDate(d.deductionEndDate)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(d)}><Pencil className="h-4 w-4" />Sửa</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => setToDelete(d)}><Trash2 className="h-4 w-4" />Xóa</DropdownMenuItem>
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
            <DialogTitle>{editing ? "Sửa người phụ thuộc" : "Thêm người phụ thuộc"}</DialogTitle>
            <DialogDescription>Khai báo cho giảm trừ thuế TNCN</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="name">Họ tên *</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationship">Quan hệ *</Label>
                <select id="relationship" {...register("relationship")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                  {Object.entries(REL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Ngày sinh</Label>
                <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="identityNumber">CCCD/CMND</Label>
                <Input id="identityNumber" {...register("identityNumber")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxCode">MST</Label>
                <Input id="taxCode" {...register("taxCode")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deductionStartDate">Bắt đầu giảm trừ *</Label>
                <Input id="deductionStartDate" type="date" {...register("deductionStartDate")} />
                {errors.deductionStartDate && <p className="text-xs text-destructive">{errors.deductionStartDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="deductionEndDate">Kết thúc giảm trừ</Label>
                <Input id="deductionEndDate" type="date" {...register("deductionEndDate")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea id="note" {...register("note")} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Hủy</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang lưu..." : editing ? "Cập nhật" : "Thêm"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Xóa người phụ thuộc"
        description={`Xóa "${toDelete?.name}"?`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};
