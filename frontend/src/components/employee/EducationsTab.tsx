import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { GraduationCap, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
import { educationService } from "@/services/educationService";
import type { EducationLevel, EmployeeEducation } from "@/types/employee";

const LEVEL_LABELS: Record<EducationLevel, string> = {
  primary: "Tiểu học",
  secondary: "THCS",
  high_school: "THPT",
  vocational: "Trung cấp",
  associate: "Cao đẳng",
  bachelor: "Đại học",
  master: "Thạc sĩ",
  doctorate: "Tiến sĩ",
};

const schema = z.object({
  level: z.enum(["primary","secondary","high_school","vocational","associate","bachelor","master","doctorate"]),
  school: z.string().min(1, "Nhập tên trường"),
  major: z.string().optional(),
  graduationYear: z.number().int().min(1900).max(2100).optional().nullable(),
  gpa: z.number().min(0).max(10).optional().nullable(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  employeeId: number;
}

export const EducationsTab = ({ employeeId }: Props) => {
  const [items, setItems] = useState<EmployeeEducation[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeEducation | null>(null);
  const [toDelete, setToDelete] = useState<EmployeeEducation | null>(null);

  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const load = async () => {
    try {
      setLoading(true);
      setItems(await educationService.list(employeeId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    reset({ level: "bachelor", school: "" });
    setDialogOpen(true);
  };

  const openEdit = (e: EmployeeEducation) => {
    setEditing(e);
    reset({
      level: e.level,
      school: e.school,
      major: e.major ?? "",
      graduationYear: e.graduationYear ?? null,
      gpa: e.gpa ? Number(e.gpa) : null,
      note: e.note ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        major: values.major || null,
        graduationYear: values.graduationYear ?? null,
        gpa: values.gpa != null ? String(values.gpa) : null,
        note: values.note || null,
      };
      if (editing) await educationService.update(employeeId, editing.id, payload);
      else await educationService.create(employeeId, payload);
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
      await educationService.delete(employeeId, toDelete.id);
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
          <h3 className="text-lg font-semibold">Trình độ học vấn</h3>
          <p className="text-sm text-muted-foreground">Bằng cấp, trường đào tạo của nhân viên.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Thêm</Button>
      </div>

      <div className="rounded-md border bg-background">
        {showEmpty ? (
          <EmptyState icon={GraduationCap} title="Chưa có học vấn" description="Ghi nhận bằng cấp cao nhất, chuyên ngành đào tạo." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trình độ</TableHead>
                <TableHead>Trường</TableHead>
                <TableHead>Chuyên ngành</TableHead>
                <TableHead>Năm TN</TableHead>
                <TableHead>GPA</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            {loading ? <TableSkeleton cols={6} /> : (
              <TableBody>
                {items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{LEVEL_LABELS[e.level]}</TableCell>
                    <TableCell className="font-medium">{e.school}</TableCell>
                    <TableCell>{e.major || "—"}</TableCell>
                    <TableCell>{e.graduationYear || "—"}</TableCell>
                    <TableCell>{e.gpa || "—"}</TableCell>
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
            <DialogTitle>{editing ? "Sửa học vấn" : "Thêm học vấn"}</DialogTitle>
            <DialogDescription>Bằng cấp, trường đào tạo</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="level">Trình độ *</Label>
                <select id="level" {...register("level")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                  {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">Trường *</Label>
                <Input id="school" {...register("school")} />
                {errors.school && <p className="text-xs text-destructive">{errors.school.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="major">Chuyên ngành</Label>
                <Input id="major" {...register("major")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="graduationYear">Năm tốt nghiệp</Label>
                <Input id="graduationYear" type="number" min={1900} max={2100}
                  {...register("graduationYear", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpa">GPA</Label>
                <Input id="gpa" type="number" step="0.01" min={0} max={10}
                  {...register("gpa", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })} />
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
        title="Xóa học vấn"
        description={`Xóa "${toDelete?.school}"?`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};
