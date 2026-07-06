import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Network,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
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
import { useDepartmentStore } from "@/stores/useDepartmentStore";
import { useBranchStore } from "@/stores/useBranchStore";
import type { Department } from "@/types/org";

const schema = z.object({
  branchId: z.number().int().min(1, "Vui lòng chọn chi nhánh"),
  parentDepartmentId: z.number().int().nullable().optional(),
  code: z.string().min(1, "Vui lòng nhập mã phòng ban"),
  name: z.string().min(1, "Vui lòng nhập tên phòng ban"),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface TreeNode extends Department {
  depth: number;
  children: TreeNode[];
}

const buildTree = (items: Department[]): TreeNode[] => {
  const map = new Map<number, TreeNode>();
  items.forEach((it) => map.set(it.id, { ...it, depth: 0, children: [] }));

  const roots: TreeNode[] = [];
  items.forEach((it) => {
    const node = map.get(it.id)!;
    const parentId = it.parentDepartmentId;
    if (parentId && map.has(parentId)) {
      const parent = map.get(parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const setDepth = (nodes: TreeNode[], depth: number) => {
    nodes.forEach((n) => {
      n.depth = depth;
      n.children.sort((a, b) => a.name.localeCompare(b.name));
      setDepth(n.children, depth + 1);
    });
  };
  roots.sort((a, b) => a.name.localeCompare(b.name));
  setDepth(roots, 0);

  return roots;
};

const flattenVisible = (roots: TreeNode[], expanded: Set<number>): TreeNode[] => {
  const result: TreeNode[] = [];
  const walk = (nodes: TreeNode[]) => {
    for (const n of nodes) {
      result.push(n);
      if (expanded.has(n.id) && n.children.length > 0) walk(n.children);
    }
  };
  walk(roots);
  return result;
};

const DepartmentsPage = () => {
  const { items, loading, fetch, create, update, remove } = useDepartmentStore();
  const branches = useBranchStore((s) => s.items);
  const fetchBranches = useBranchStore((s) => s.fetch);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [toDelete, setToDelete] = useState<Department | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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
    if (branches.length === 0) fetchBranches();
  }, [fetch, fetchBranches, branches.length]);

  const tree = useMemo(() => buildTree(items), [items]);
  const visible = useMemo(() => flattenVisible(tree, expanded), [tree, expanded]);

  // Auto-expand roots khi tree chỉ 1-2 cấp — UX tốt hơn khi user thấy hết cây
  useEffect(() => {
    if (items.length === 0) return;
    setExpanded((prev) => {
      if (prev.size > 0) return prev;
      const next = new Set<number>();
      tree.forEach((n) => next.add(n.id));
      return next;
    });
  }, [items.length, tree]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<number>();
    const walk = (nodes: TreeNode[]) => {
      nodes.forEach((n) => {
        if (n.children.length > 0) all.add(n.id);
        walk(n.children);
      });
    };
    walk(tree);
    setExpanded(all);
  };

  const collapseAll = () => setExpanded(new Set());

  const openCreate = () => {
    setEditing(null);
    reset({
      branchId: branches[0]?.id ?? 0,
      parentDepartmentId: null,
      code: "",
      name: "",
      description: "",
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    reset({
      branchId: d.branchId,
      parentDepartmentId: d.parentDepartmentId ?? null,
      code: d.code,
      name: d.name,
      description: d.description ?? "",
      isActive: d.isActive,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      parentDepartmentId: values.parentDepartmentId ?? null,
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

  const availableParents = items.filter((d) => !editing || d.id !== editing.id);

  const showSkeleton = loading && items.length === 0;
  const showEmpty = !loading && items.length === 0;
  const hasBranches = branches.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Phòng ban</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý phòng ban theo chi nhánh, hỗ trợ phân cấp cha/con
          </p>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={expandAll}>
                Mở rộng tất cả
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Thu gọn
              </Button>
            </>
          )}
          <Button onClick={openCreate} disabled={!hasBranches}>
            <Plus className="h-4 w-4" />
            Thêm phòng ban
          </Button>
        </div>
      </div>

      {!hasBranches && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
          Chưa có chi nhánh nào. Vui lòng tạo chi nhánh trước khi tạo phòng ban.
        </div>
      )}

      <div className="rounded-md border bg-background">
        {showEmpty ? (
          <EmptyState
            icon={Network}
            title="Chưa có phòng ban nào"
            description={
              hasBranches
                ? "Tổ chức nhân sự theo phòng ban. Có thể tạo phòng con nằm dưới phòng cha để phân cấp."
                : "Cần có chi nhánh trước. Vào mục Chi nhánh để tạo."
            }
            action={
              hasBranches ? (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Thêm phòng ban đầu tiên
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên phòng ban</TableHead>
                <TableHead>Chi nhánh</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            {showSkeleton ? (
              <TableSkeleton cols={5} />
            ) : (
              <TableBody>
                {visible.map((n) => {
                  const hasChildren = n.children.length > 0;
                  const isExpanded = expanded.has(n.id);
                  return (
                    <TableRow key={n.id}>
                      <TableCell className="font-mono font-medium">
                        <div
                          className="flex items-center gap-1"
                          style={{ paddingLeft: n.depth * 20 }}
                        >
                          {hasChildren ? (
                            <button
                              onClick={() => toggleExpand(n.id)}
                              className="rounded p-0.5 hover:bg-accent"
                              aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="inline-block w-[18px]" />
                          )}
                          {n.code}
                        </div>
                      </TableCell>
                      <TableCell>{n.name}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {n.Branch?.name}{" "}
                          <span className="text-muted-foreground">({n.Branch?.code})</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={n.isActive ? "success" : "outline"}>
                          {n.isActive ? "Hoạt động" : "Tạm dừng"}
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
                            <DropdownMenuItem onSelect={() => openEdit(n)}>
                              <Pencil className="h-4 w-4" />
                              Sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => setToDelete(n)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            )}
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && requestClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa phòng ban" : "Thêm phòng ban mới"}</DialogTitle>
            <DialogDescription>
              Chọn chi nhánh phòng ban thuộc về. Có thể chọn phòng cha để phân cấp.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branchId">Chi nhánh *</Label>
              <select
                id="branchId"
                {...register("branchId", { valueAsNumber: true })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
              {errors.branchId && (
                <p className="text-xs text-destructive">{errors.branchId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentDepartmentId">Phòng ban cha (nếu có)</Label>
              <select
                id="parentDepartmentId"
                {...register("parentDepartmentId", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">— Không có (phòng gốc) —</option>
                {availableParents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="code">Mã *</Label>
                <Input id="code" {...register("code")} placeholder="IT, HR..." />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Tên phòng ban *</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea id="description" {...register("description")} rows={2} />
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
        title="Xóa phòng ban"
        description={`Bạn chắc chắn xóa phòng ban "${toDelete?.name}"? Phòng ban còn nhân viên sẽ không xóa được. Phòng con sẽ tự động thành phòng gốc.`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default DepartmentsPage;
