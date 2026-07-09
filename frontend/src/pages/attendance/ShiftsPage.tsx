import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Clock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
import { shiftService } from "@/services/shiftService";
import type { Shift } from "@/types/attendance";

const schema = z.object({
  code: z.string().min(1, "Nhập mã ca"),
  name: z.string().min(1, "Nhập tên ca"),
  startTime: z.string().min(1, "Chọn giờ bắt đầu"),
  endTime: z.string().min(1, "Chọn giờ kết thúc"),
  breakMinutes: z.number().int().min(0).max(240),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

const trimSeconds = (t?: string) => (t ? t.slice(0, 5) : "");

const ShiftsPage = () => {
  const [items, setItems] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [toDelete, setToDelete] = useState<Shift | null>(null);

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
      setItems(await shiftService.list());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ code: "", name: "", startTime: "08:00", endTime: "17:30", breakMinutes: 60, isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (s: Shift) => {
    setEditing(s);
    reset({
      code: s.code,
      name: s.name,
      startTime: trimSeconds(s.startTime),
      endTime: trimSeconds(s.endTime),
      breakMinutes: s.breakMinutes,
      isActive: s.isActive,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) await shiftService.update(editing.id, values);
      else await shiftService.create(values);
      toast.success(editing ? "Cập nhật ca thành công" : "Tạo ca thành công");
      setDialogOpen(false);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Lưu ca thất bại");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await shiftService.delete(toDelete.id);
      toast.success("Xóa ca thành công");
      setToDelete(null);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Xóa ca thất bại");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Ca làm việc</h1>
          <p className="text-muted-foreground text-sm">
            Định nghĩa các ca làm và giờ nghỉ trưa. Gán ca cho từng NV ở "Lịch làm việc".
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm ca
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        {!loading && items.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Chưa có ca làm việc nào"
            description='Tạo ca chuẩn của công ty. Ví dụ "Ca sáng 8:00-17:30, nghỉ trưa 60 phút".'
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Thêm ca đầu tiên</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên ca</TableHead>
                <TableHead>Giờ bắt đầu</TableHead>
                <TableHead>Giờ kết thúc</TableHead>
                <TableHead>Nghỉ trưa (phút)</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            {loading ? <TableSkeleton cols={7} /> : (
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-medium">{s.code}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell className="font-mono">{trimSeconds(s.startTime)}</TableCell>
                    <TableCell className="font-mono">{trimSeconds(s.endTime)}</TableCell>
                    <TableCell>{s.breakMinutes}</TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? "success" : "outline"}>
                        {s.isActive ? "Hoạt động" : "Tạm dừng"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(s)}><Pencil className="h-4 w-4" />Sửa</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => setToDelete(s)}><Trash2 className="h-4 w-4" />Xóa</DropdownMenuItem>
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
            <DialogTitle>{editing ? "Sửa ca" : "Thêm ca mới"}</DialogTitle>
            <DialogDescription>Định nghĩa giờ bắt đầu/kết thúc và giờ nghỉ trưa.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="code">Mã *</Label>
                <Input id="code" placeholder="MORNING, EVENING..." {...register("code")} />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Tên ca *</Label>
                <Input id="name" placeholder="Ca sáng" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Giờ bắt đầu *</Label>
                <Input id="startTime" type="time" {...register("startTime")} />
                {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Giờ kết thúc *</Label>
                <Input id="endTime" type="time" {...register("endTime")} />
                {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="breakMinutes">Nghỉ trưa (phút)</Label>
                <Input id="breakMinutes" type="number" min={0} max={240} {...register("breakMinutes", { valueAsNumber: true })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="isActive" {...register("isActive")} className="h-4 w-4" />
                <Label htmlFor="isActive" className="cursor-pointer">Đang hoạt động</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={requestClose} disabled={isSubmitting}>Hủy</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang lưu..." : editing ? "Cập nhật" : "Tạo ca"}</Button>
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
        title="Xóa ca"
        description={`Xóa ca "${toDelete?.name}"? Ca đang được gán cho NV sẽ không xóa được.`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default ShiftsPage;
