import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useDirtyGuard } from "@/hooks/useDirtyGuard";
import { useBranchStore } from "@/stores/useBranchStore";
import type { Branch } from "@/types/org";

const schema = z.object({
  code: z.string().min(1, "Vui lòng nhập mã chi nhánh"),
  name: z.string().min(1, "Vui lòng nhập tên chi nhánh"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

const BranchesPage = () => {
  const { items, loading, fetch, create, update, remove } = useBranchStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [toDelete, setToDelete] = useState<Branch | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const { showConfirm, setShowConfirm, requestClose, confirmClose } = useDirtyGuard(
    isDirty,
    () => setDialogOpen(false)
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  const openCreate = () => {
    setEditing(null);
    reset({ code: "", name: "", address: "", phone: "", email: "", isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditing(b);
    reset({
      code: b.code,
      name: b.name,
      address: b.address ?? "",
      phone: b.phone ?? "",
      email: b.email ?? "",
      isActive: b.isActive,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      email: values.email || undefined,
      address: values.address || undefined,
      phone: values.phone || undefined,
    };
    const result = editing ? await update(editing.id, payload) : await create(payload);
    if (result) setDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const ok = await remove(toDelete.id);
    if (ok) setToDelete(null);
  };

  const showSkeleton = loading && items.length === 0;
  const showEmpty = !loading && items.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Chi nhánh</h1>
          <p className="text-muted-foreground text-sm">Quản lý danh sách chi nhánh công ty</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm chi nhánh
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        {showEmpty ? (
          <EmptyState
            icon={Building2}
            title="Chưa có chi nhánh nào"
            description="Bắt đầu bằng cách tạo chi nhánh đầu tiên cho công ty của bạn."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Tạo chi nhánh đầu tiên
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên chi nhánh</TableHead>
                <TableHead>SĐT</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            {showSkeleton ? (
              <TableSkeleton cols={6} />
            ) : (
              <TableBody>
                {items.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono font-medium">{b.code}</TableCell>
                    <TableCell>{b.name}</TableCell>
                    <TableCell>{b.phone || "-"}</TableCell>
                    <TableCell>{b.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={b.isActive ? "success" : "outline"}>
                        {b.isActive ? "Hoạt động" : "Tạm dừng"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(b)}>
                            <Pencil className="h-4 w-4" />
                            Sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => setToDelete(b)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Xóa
                          </DropdownMenuItem>
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
            <DialogTitle>{editing ? "Sửa chi nhánh" : "Thêm chi nhánh mới"}</DialogTitle>
            <DialogDescription>
              {editing ? "Cập nhật thông tin chi nhánh" : "Nhập thông tin chi nhánh mới"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="code">Mã *</Label>
                <Input id="code" {...register("code")} placeholder="HN, HCM, DN..." />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Tên chi nhánh *</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Textarea id="address" {...register("address")} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="phone">SĐT</Label>
                <Input id="phone" {...register("phone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" {...register("isActive")} className="h-4 w-4" />
              <Label htmlFor="isActive" className="cursor-pointer">
                Đang hoạt động
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={requestClose} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : editing ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Bỏ thay đổi?"
        description="Bạn có thay đổi chưa lưu. Bỏ đi sẽ mất toàn bộ thay đổi."
        confirmText="Bỏ thay đổi"
        variant="destructive"
        onConfirm={confirmClose}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Xóa chi nhánh"
        description={`Bạn chắc chắn xóa chi nhánh "${toDelete?.name}"? Chi nhánh còn phòng ban sẽ không xóa được.`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default BranchesPage;
