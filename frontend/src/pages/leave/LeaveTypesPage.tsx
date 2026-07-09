import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { MoreHorizontal, Palette, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useDirtyGuard } from "@/hooks/useDirtyGuard";
import { leaveTypeService } from "@/services/leaveTypeService";
import type { LeaveType } from "@/types/leave";

const schema = z.object({
  code: z.string().min(1, "Nhập mã"),
  name: z.string().min(1, "Nhập tên"),
  daysPerYear: z.number().min(0).nullable().optional(),
  isPaid: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

const LeaveTypesPage = () => {
  const [items, setItems] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [toDelete, setToDelete] = useState<LeaveType | null>(null);
  const [seeding, setSeeding] = useState(false);

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const { showConfirm, setShowConfirm, requestClose, confirmClose } = useDirtyGuard(
    isDirty, () => setDialogOpen(false)
  );

  const load = async () => {
    try {
      setLoading(true);
      setItems(await leaveTypeService.list());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ code: "", name: "", daysPerYear: 12, isPaid: true, requiresApproval: true, color: "#3b82f6", isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (t: LeaveType) => {
    setEditing(t);
    reset({
      code: t.code,
      name: t.name,
      daysPerYear: t.daysPerYear ? Number(t.daysPerYear) : null,
      isPaid: t.isPaid,
      requiresApproval: t.requiresApproval,
      color: t.color ?? "#3b82f6",
      isActive: t.isActive,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        daysPerYear: values.daysPerYear != null ? String(values.daysPerYear) : null,
      };
      if (editing) await leaveTypeService.update(editing.id, payload);
      else await leaveTypeService.create(payload);
      toast.success(editing ? "Cập nhật thành công" : "Tạo loại phép thành công");
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
      await leaveTypeService.delete(toDelete.id);
      toast.success("Xóa thành công");
      setToDelete(null);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Xóa thất bại");
    }
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      const res = await leaveTypeService.seedDefaults();
      toast.success(res.message);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Seed thất bại");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Loại phép</h1>
          <p className="text-muted-foreground text-sm">
            Danh mục loại phép công ty. Có thể tạo mới, sửa hoặc dùng 6 loại chuẩn VN.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeed} disabled={seeding}>
            {seeding ? "Đang khởi tạo..." : "Khởi tạo 6 loại chuẩn"}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm loại phép
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-background">
        {!loading && items.length === 0 ? (
          <EmptyState
            icon={Palette}
            title="Chưa có loại phép nào"
            description="Bấm 'Khởi tạo 6 loại chuẩn' để tạo nhanh: Phép năm, Ốm, Thai sản, Cưới, Tang, Không lương."
            action={<Button onClick={handleSeed}>Khởi tạo 6 loại chuẩn</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Màu</TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Ngày/năm</TableHead>
                <TableHead>Có lương</TableHead>
                <TableHead>Cần duyệt</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            {loading ? <TableSkeleton cols={8} /> : (
              <TableBody>
                {items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: t.color || "#94a3b8" }} />
                    </TableCell>
                    <TableCell className="font-mono font-medium">{t.code}</TableCell>
                    <TableCell>{t.name}</TableCell>
                    <TableCell className="font-mono">
                      {t.daysPerYear != null ? t.daysPerYear : <span className="text-muted-foreground">Không giới hạn</span>}
                    </TableCell>
                    <TableCell>
                      {t.isPaid ? <Badge variant="success">Có lương</Badge> : <Badge variant="outline">Không lương</Badge>}
                    </TableCell>
                    <TableCell>
                      {t.requiresApproval ? <Badge variant="warning">Cần</Badge> : <Badge variant="outline">Không</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.isActive ? "success" : "outline"}>
                        {t.isActive ? "Hoạt động" : "Tạm dừng"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(t)}><Pencil className="h-4 w-4" />Sửa</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => setToDelete(t)}><Trash2 className="h-4 w-4" />Xóa</DropdownMenuItem>
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

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && requestClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa loại phép" : "Thêm loại phép"}</DialogTitle>
            <DialogDescription>Nếu số ngày/năm để trống → không giới hạn (ví dụ nghỉ ốm có giấy BS).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="code">Mã *</Label>
                <Input id="code" placeholder="ANNUAL, SICK..." {...register("code")} />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Tên *</Label>
                <Input id="name" placeholder="Nghỉ phép năm" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="daysPerYear">Ngày/năm</Label>
                <Input
                  id="daysPerYear"
                  type="number"
                  step="0.5"
                  min={0}
                  placeholder="Để trống = không giới hạn"
                  {...register("daysPerYear", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Màu (hex)</Label>
                <Input id="color" type="color" {...register("color")} className="h-9 p-1" />
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isPaid" {...register("isPaid")} className="h-4 w-4" />
                <Label htmlFor="isPaid" className="cursor-pointer">Có lương</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="requiresApproval" {...register("requiresApproval")} className="h-4 w-4" />
                <Label htmlFor="requiresApproval" className="cursor-pointer">Cần duyệt</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" {...register("isActive")} className="h-4 w-4" />
                <Label htmlFor="isActive" className="cursor-pointer">Đang hoạt động</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={requestClose} disabled={isSubmitting}>Hủy</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang lưu..." : editing ? "Cập nhật" : "Tạo"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Bỏ thay đổi?"
        description="Bạn có thay đổi chưa lưu."
        confirmText="Bỏ thay đổi"
        variant="destructive"
        onConfirm={confirmClose}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Xóa loại phép"
        description={`Xóa "${toDelete?.name}"? Chỉ xóa được nếu chưa có đơn/balance dùng.`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default LeaveTypesPage;
