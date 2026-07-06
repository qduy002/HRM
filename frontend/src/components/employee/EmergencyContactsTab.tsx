import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LifeBuoy, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
import { emergencyContactService } from "@/services/emergencyContactService";
import type { EmergencyContact } from "@/types/employee";

const schema = z.object({
  name: z.string().min(1, "Nhập tên"),
  relationship: z.string().min(1, "Nhập quan hệ"),
  phone: z.string().min(1, "Nhập SĐT"),
  alternatePhone: z.string().optional(),
  address: z.string().optional(),
  priority: z.number().int().min(1),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  employeeId: number;
}

export const EmergencyContactsTab = ({ employeeId }: Props) => {
  const [items, setItems] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [toDelete, setToDelete] = useState<EmergencyContact | null>(null);

  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const load = async () => {
    try {
      setLoading(true);
      setItems(await emergencyContactService.list(employeeId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", relationship: "", phone: "", priority: 1 });
    setDialogOpen(true);
  };

  const openEdit = (e: EmergencyContact) => {
    setEditing(e);
    reset({
      name: e.name,
      relationship: e.relationship,
      phone: e.phone,
      alternatePhone: e.alternatePhone ?? "",
      address: e.address ?? "",
      priority: e.priority,
      note: e.note ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        alternatePhone: values.alternatePhone || null,
        address: values.address || null,
        note: values.note || null,
      };
      if (editing) await emergencyContactService.update(employeeId, editing.id, payload);
      else await emergencyContactService.create(employeeId, payload);
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
      await emergencyContactService.delete(employeeId, toDelete.id);
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
          <h3 className="text-lg font-semibold">Liên hệ khẩn cấp</h3>
          <p className="text-sm text-muted-foreground">Người thân/bạn bè liên hệ khi có sự cố.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Thêm</Button>
      </div>

      <div className="rounded-md border bg-background">
        {showEmpty ? (
          <EmptyState
            icon={LifeBuoy}
            title="Chưa có liên hệ khẩn cấp"
            description="Nên có ít nhất 1 người liên hệ khi cần."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Ưu tiên</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Quan hệ</TableHead>
                <TableHead>SĐT</TableHead>
                <TableHead>SĐT phụ</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            {loading ? <TableSkeleton cols={6} /> : (
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-bold">{c.priority}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.relationship}</TableCell>
                    <TableCell className="font-mono text-sm">{c.phone}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{c.alternatePhone || "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(c)}><Pencil className="h-4 w-4" />Sửa</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => setToDelete(c)}><Trash2 className="h-4 w-4" />Xóa</DropdownMenuItem>
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
            <DialogTitle>{editing ? "Sửa liên hệ khẩn cấp" : "Thêm liên hệ khẩn cấp"}</DialogTitle>
            <DialogDescription>Người thân/bạn liên hệ khi có sự cố</DialogDescription>
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
                <Input id="relationship" placeholder="Cha / Mẹ / Vợ / Bạn thân..." {...register("relationship")} />
                {errors.relationship && <p className="text-xs text-destructive">{errors.relationship.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">SĐT chính *</Label>
                <Input id="phone" {...register("phone")} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternatePhone">SĐT phụ</Label>
                <Input id="alternatePhone" {...register("alternatePhone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Ưu tiên *</Label>
                <Input id="priority" type="number" min={1} {...register("priority", { valueAsNumber: true })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Textarea id="address" {...register("address")} rows={2} />
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
        title="Xóa liên hệ khẩn cấp"
        description={`Xóa "${toDelete?.name}"?`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};
