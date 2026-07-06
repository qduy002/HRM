import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Award, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useLevelStore } from "@/stores/useLevelStore";
import type { Level } from "@/types/org";

const schema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Vui lòng nhập tên cấp bậc"),
  rank: z.number().int().min(1, "Rank phải >= 1"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const LevelsPage = () => {
  const { items, loading, fetch, create, update, remove } = useLevelStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Level | null>(null);
  const [toDelete, setToDelete] = useState<Level | null>(null);

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
    reset({ code: "", name: "", rank: (items.at(-1)?.rank ?? 0) + 1, description: "" });
    setDialogOpen(true);
  };

  const openEdit = (l: Level) => {
    setEditing(l);
    reset({
      code: l.code ?? "",
      name: l.name,
      rank: l.rank,
      description: l.description ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      code: values.code || undefined,
      description: values.description || undefined,
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
          <h1 className="text-2xl font-bold">Cấp bậc</h1>
          <p className="text-muted-foreground text-sm">
            Định nghĩa các cấp bậc trong công ty (Intern → Junior → Senior → Lead...)
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm cấp bậc
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        {showEmpty ? (
          <EmptyState
            icon={Award}
            title="Chưa có cấp bậc nào"
            description="Tạo hệ thống cấp bậc từ thấp đến cao. Ví dụ: 1=Intern, 2=Junior, 3=Middle, 4=Senior, 5=Lead."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Thêm cấp bậc
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>Tên cấp bậc</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            {showSkeleton ? (
              <TableSkeleton cols={5} />
            ) : (
              <TableBody>
                {items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono font-bold">{l.rank}</TableCell>
                    <TableCell className="font-mono">{l.code || "-"}</TableCell>
                    <TableCell>{l.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-md truncate">
                      {l.description || "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(l)}>
                            <Pencil className="h-4 w-4" />
                            Sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => setToDelete(l)}
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
            <DialogTitle>{editing ? "Sửa cấp bậc" : "Thêm cấp bậc mới"}</DialogTitle>
            <DialogDescription>
              Rank là số thứ tự sắp xếp (1 = thấp nhất). Ví dụ: 1=Intern, 2=Junior, 3=Middle, 4=Senior...
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rank">Rank *</Label>
                <Input
                  id="rank"
                  type="number"
                  min={1}
                  {...register("rank", { valueAsNumber: true })}
                />
                {errors.rank && <p className="text-xs text-destructive">{errors.rank.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Mã</Label>
                <Input id="code" {...register("code")} placeholder="L1, L2..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Tên *</Label>
                <Input id="name" {...register("name")} placeholder="Junior..." />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea id="description" {...register("description")} rows={3} />
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
        title="Xóa cấp bậc"
        description={`Bạn chắc chắn xóa cấp bậc "${toDelete?.name}"?`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default LevelsPage;
