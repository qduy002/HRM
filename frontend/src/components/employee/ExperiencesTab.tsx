import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Briefcase, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
import { experienceService } from "@/services/experienceService";
import type { EmployeeExperience } from "@/types/employee";

const schema = z.object({
  companyName: z.string().min(1, "Nhập tên công ty"),
  position: z.string().min(1, "Nhập chức vụ"),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const formatDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("vi-VN") : "—");

interface Props {
  employeeId: number;
}

export const ExperiencesTab = ({ employeeId }: Props) => {
  const [items, setItems] = useState<EmployeeExperience[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeExperience | null>(null);
  const [toDelete, setToDelete] = useState<EmployeeExperience | null>(null);

  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const load = async () => {
    try {
      setLoading(true);
      setItems(await experienceService.list(employeeId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    reset({ companyName: "", position: "" });
    setDialogOpen(true);
  };

  const openEdit = (e: EmployeeExperience) => {
    setEditing(e);
    reset({
      companyName: e.companyName,
      position: e.position,
      fromDate: e.fromDate ?? "",
      toDate: e.toDate ?? "",
      description: e.description ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        fromDate: values.fromDate || null,
        toDate: values.toDate || null,
        description: values.description || null,
      };
      if (editing) await experienceService.update(employeeId, editing.id, payload);
      else await experienceService.create(employeeId, payload);
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
      await experienceService.delete(employeeId, toDelete.id);
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
          <h3 className="text-lg font-semibold">Kinh nghiệm làm việc</h3>
          <p className="text-sm text-muted-foreground">Các công ty đã làm trước khi vào đây.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Thêm</Button>
      </div>

      <div className="rounded-md border bg-background">
        {showEmpty ? (
          <EmptyState icon={Briefcase} title="Chưa có kinh nghiệm" description="Ghi nhận công việc trước đây của nhân viên." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Công ty</TableHead>
                <TableHead>Chức vụ</TableHead>
                <TableHead>Từ</TableHead>
                <TableHead>Đến</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            {loading ? <TableSkeleton cols={6} /> : (
              <TableBody>
                {items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.companyName}</TableCell>
                    <TableCell>{e.position}</TableCell>
                    <TableCell>{formatDate(e.fromDate)}</TableCell>
                    <TableCell>{formatDate(e.toDate)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {e.description || "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(e)}><Pencil className="h-4 w-4" />Sửa</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => setToDelete(e)}><Trash2 className="h-4 w-4" />Xóa</DropdownMenuItem>
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
            <DialogTitle>{editing ? "Sửa kinh nghiệm" : "Thêm kinh nghiệm"}</DialogTitle>
            <DialogDescription>Công việc trước đây</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="companyName">Công ty *</Label>
                <Input id="companyName" {...register("companyName")} />
                {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Chức vụ *</Label>
                <Input id="position" {...register("position")} />
                {errors.position && <p className="text-xs text-destructive">{errors.position.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromDate">Từ ngày</Label>
                <Input id="fromDate" type="date" {...register("fromDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toDate">Đến ngày</Label>
                <Input id="toDate" type="date" {...register("toDate")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả công việc</Label>
              <Textarea id="description" {...register("description")} rows={3} />
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
        title="Xóa kinh nghiệm"
        description={`Xóa "${toDelete?.companyName}"?`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};
