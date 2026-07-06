import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ExternalLink, FileText, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { documentService } from "@/services/documentService";
import type { DocumentType, EmployeeDocument } from "@/types/employee";

const TYPE_LABELS: Record<DocumentType, string> = {
  cv: "CV / Sơ yếu lý lịch",
  identity_front: "CCCD mặt trước",
  identity_back: "CCCD mặt sau",
  contract: "Hợp đồng scan",
  diploma: "Bằng cấp",
  certificate: "Chứng chỉ",
  other: "Khác",
};

const schema = z.object({
  type: z.enum(["cv","identity_front","identity_back","contract","diploma","certificate","other"]),
  name: z.string().min(1, "Nhập tên tài liệu"),
  fileUrl: z.string().min(1, "Nhập link URL của file"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  employeeId: number;
}

export const DocumentsTab = ({ employeeId }: Props) => {
  const [items, setItems] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeDocument | null>(null);
  const [toDelete, setToDelete] = useState<EmployeeDocument | null>(null);

  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const load = async () => {
    try {
      setLoading(true);
      setItems(await documentService.list(employeeId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    reset({ type: "cv", name: "", fileUrl: "" });
    setDialogOpen(true);
  };

  const openEdit = (d: EmployeeDocument) => {
    setEditing(d);
    reset({ type: d.type, name: d.name, fileUrl: d.fileUrl });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) await documentService.update(employeeId, editing.id, values);
      else await documentService.create(employeeId, values);
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
      await documentService.delete(employeeId, toDelete.id);
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
          <h3 className="text-lg font-semibold">Tài liệu</h3>
          <p className="text-sm text-muted-foreground">
            Sprint 1: chỉ lưu URL tới file. Upload thật sẽ có ở mini-sprint sau (Cloudflare R2).
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Thêm</Button>
      </div>

      <div className="rounded-md border bg-background">
        {showEmpty ? (
          <EmptyState icon={FileText} title="Chưa có tài liệu" description="Thêm link CV, ảnh CCCD, PDF HĐ..." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loại</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            {loading ? <TableSkeleton cols={4} /> : (
              <TableBody>
                {items.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{TYPE_LABELS[d.type]}</TableCell>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                      >
                        Mở link <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
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
            <DialogTitle>{editing ? "Sửa tài liệu" : "Thêm tài liệu"}</DialogTitle>
            <DialogDescription>Paste URL link tới file (Google Drive, S3, R2...)</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="type">Loại tài liệu *</Label>
              <select id="type" {...register("type")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Tên tài liệu *</Label>
              <Input id="name" placeholder="CV_NguyenVanA.pdf" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fileUrl">Link URL *</Label>
              <Input id="fileUrl" placeholder="https://..." {...register("fileUrl")} />
              {errors.fileUrl && <p className="text-xs text-destructive">{errors.fileUrl.message}</p>}
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
        title="Xóa tài liệu"
        description={`Xóa "${toDelete?.name}"?`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};
