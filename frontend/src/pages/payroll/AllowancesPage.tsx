import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { MoreHorizontal, Wallet, Pencil, Plus, Trash2 } from "lucide-react";
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
import { useDirtyGuard } from "@/hooks/useDirtyGuard";
import { allowanceService } from "@/services/allowanceService";
import type { Allowance } from "@/types/payroll";

const schema = z.object({
  code: z.string().min(1, "Nhập mã"),
  name: z.string().min(1, "Nhập tên"),
  defaultAmount: z.number().min(0).nullable().optional(),
  isTaxable: z.boolean().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

const AllowancesPage = () => {
  const [items, setItems] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Allowance | null>(null);
  const [toDelete, setToDelete] = useState<Allowance | null>(null);

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
      setItems(await allowanceService.list());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ code: "", name: "", defaultAmount: null, isTaxable: true, description: "", isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (a: Allowance) => {
    setEditing(a);
    reset({
      code: a.code,
      name: a.name,
      defaultAmount: a.defaultAmount != null ? Number(a.defaultAmount) : null,
      isTaxable: a.isTaxable,
      description: a.description ?? "",
      isActive: a.isActive,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        defaultAmount: values.defaultAmount != null ? String(values.defaultAmount) : null,
      };
      if (editing) await allowanceService.update(editing.id, payload);
      else await allowanceService.create(payload);
      toast.success(editing ? "Cập nhật thành công" : "Tạo phụ cấp thành công");
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
      await allowanceService.delete(toDelete.id);
      toast.success("Xóa thành công");
      setToDelete(null);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Xóa thất bại");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Danh mục phụ cấp</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý các loại phụ cấp (ăn trưa, xăng xe, điện thoại…) và trạng thái chịu thuế.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm phụ cấp
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        {!loading && items.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Chưa có phụ cấp nào"
            description="Tạo phụ cấp để gán cho nhân viên. VD: LUNCH (miễn thuế), FUEL (chịu thuế)."
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Thêm phụ cấp</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Mức mặc định</TableHead>
                <TableHead>Chịu thuế</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            {loading ? <TableSkeleton cols={7} /> : (
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono font-medium">{a.code}</TableCell>
                    <TableCell>{a.name}</TableCell>
                    <TableCell className="font-mono">
                      {a.defaultAmount != null
                        ? Number(a.defaultAmount).toLocaleString("vi-VN") + " ₫"
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {a.isTaxable
                        ? <Badge variant="warning">Chịu thuế</Badge>
                        : <Badge variant="success">Miễn thuế</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {a.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.isActive ? "success" : "outline"}>
                        {a.isActive ? "Hoạt động" : "Tạm dừng"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(a)}><Pencil className="h-4 w-4" />Sửa</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => setToDelete(a)}><Trash2 className="h-4 w-4" />Xóa</DropdownMenuItem>
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
            <DialogTitle>{editing ? "Sửa phụ cấp" : "Thêm phụ cấp"}</DialogTitle>
            <DialogDescription>
              "Chịu thuế" ảnh hưởng công thức tính thuế TNCN. Miễn thuế = không cộng vào thu nhập chịu thuế.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="code">Mã *</Label>
                <Input id="code" placeholder="LUNCH, FUEL, PHONE..." {...register("code")} />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Tên *</Label>
                <Input id="name" placeholder="Phụ cấp ăn trưa" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="defaultAmount">Mức mặc định (VND)</Label>
                <Input
                  id="defaultAmount"
                  type="number"
                  step="1000"
                  min={0}
                  placeholder="Để trống nếu không có mức chuẩn"
                  {...register("defaultAmount", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea id="description" rows={2} {...register("description")} />
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isTaxable" {...register("isTaxable")} className="h-4 w-4" />
                <Label htmlFor="isTaxable" className="cursor-pointer">Chịu thuế TNCN</Label>
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
        title="Xóa phụ cấp"
        description={`Xóa "${toDelete?.name}"? Chỉ xóa được nếu chưa gán cho NV.`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AllowancesPage;
