import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { FileUpload } from "@/components/ui/file-upload";
import { documentService } from "@/services/documentService";
import { openFileByReference, uploadService } from "@/services/uploadService";
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
  fileUrl: z.string().min(1, "Vui lòng chọn file để upload"),
  fileSize: z.number().nullable().optional(),
  mimeType: z.string().nullable().optional(),
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
  const [opening, setOpening] = useState<number | null>(null);

  const {
    register, handleSubmit, control, setValue, reset, watch, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const currentType = watch("type");
  const currentName = watch("name");

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
    reset({ type: "cv", name: "", fileUrl: "", fileSize: null, mimeType: null });
    setDialogOpen(true);
  };

  const openEdit = (d: EmployeeDocument) => {
    setEditing(d);
    reset({
      type: d.type,
      name: d.name,
      fileUrl: d.fileUrl,
      fileSize: d.fileSize ?? null,
      mimeType: d.mimeType ?? null,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        type: values.type,
        name: values.name,
        fileUrl: values.fileUrl,
        fileSize: values.fileSize ?? null,
        mimeType: values.mimeType ?? null,
      };
      if (editing) await documentService.update(employeeId, editing.id, payload);
      else await documentService.create(employeeId, payload);
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
      const key = toDelete.fileUrl;
      await documentService.delete(employeeId, toDelete.id);
      // Best-effort dọn file trên R2 (không chặn nếu fail)
      if (key && !key.startsWith("http")) {
        uploadService.delete(key).catch(() => {});
      }
      toast.success("Xóa thành công");
      setToDelete(null);
      load();
    } catch {
      toast.error("Xóa thất bại");
    }
  };

  const handleOpen = async (doc: EmployeeDocument) => {
    try {
      setOpening(doc.id);
      // Dùng tên user nhập, thêm extension từ key R2 (là ext file gốc lúc upload).
      // Không dùng mimeType vì Word/Excel có subtype dài như "vnd.openxmlformats-...".
      const hasExt = /\.[a-z0-9]{2,5}$/i.test(doc.name);
      const extMatch = doc.fileUrl.match(/\.([a-z0-9]{2,5})$/i);
      const ext = extMatch ? extMatch[1] : "";
      const filename = hasExt || !ext ? doc.name : `${doc.name}.${ext}`;
      await openFileByReference(doc.fileUrl, { filename });
    } catch {
      toast.error("Không mở được file");
    } finally {
      setOpening(null);
    }
  };

  const showEmpty = !loading && items.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Tài liệu</h3>
          <p className="text-sm text-muted-foreground">
            Upload PDF, ảnh CCCD, bằng cấp... trực tiếp lên Cloudflare R2. File private, xem qua link tạm.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Thêm</Button>
      </div>

      <div className="rounded-md border bg-background">
        {showEmpty ? (
          <EmptyState icon={FileText} title="Chưa có tài liệu" description="Upload CV, ảnh CCCD, PDF HĐ..." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loại</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>File</TableHead>
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
                      <button
                        onClick={() => handleOpen(d)}
                        disabled={opening === d.id}
                        className="text-primary hover:underline inline-flex items-center gap-1 text-sm disabled:opacity-50"
                      >
                        {opening === d.id ? "Đang mở..." : "Mở file"}
                        <ExternalLink className="h-3 w-3" />
                      </button>
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
            <DialogDescription>Chọn file để upload lên R2 (max 10 MB)</DialogDescription>
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
              <Label htmlFor="name">Tên hiển thị *</Label>
              <Input id="name" placeholder="Ví dụ: CV_NguyenVanA" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <Controller
                control={control}
                name="fileUrl"
                render={({ field }) => (
                  <FileUpload
                    value={field.value}
                    onChange={(key, meta) => {
                      field.onChange(key);
                      if (meta) {
                        setValue("fileSize", meta.size);
                        setValue("mimeType", meta.mimeType);
                        // Auto set name nếu chưa nhập
                        if (!currentName || currentName === "") {
                          setValue("name", meta.originalName);
                        }
                      } else {
                        setValue("fileSize", null);
                        setValue("mimeType", null);
                      }
                    }}
                    module="documents"
                    employeeId={employeeId}
                    accept={
                      currentType === "identity_front" || currentType === "identity_back"
                        ? ".jpg,.jpeg,.png,.webp"
                        : ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    }
                  />
                )}
              />
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
        description={`Xóa "${toDelete?.name}"? File sẽ bị xóa khỏi R2.`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};
