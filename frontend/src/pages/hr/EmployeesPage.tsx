import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Users as UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { useBranchStore } from "@/stores/useBranchStore";
import { useDepartmentStore } from "@/stores/useDepartmentStore";
import { usePositionStore } from "@/stores/usePositionStore";
import { useLevelStore } from "@/stores/useLevelStore";
import type { Employee, EmployeeStatus } from "@/types/employee";

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  probation: "Thử việc",
  active: "Chính thức",
  on_leave: "Nghỉ tạm",
  terminated: "Đã nghỉ việc",
};

const STATUS_VARIANT: Record<EmployeeStatus, "warning" | "success" | "outline" | "destructive"> = {
  probation: "warning",
  active: "success",
  on_leave: "outline",
  terminated: "destructive",
};

const schema = z.object({
  lastName: z.string().min(1, "Vui lòng nhập họ"),
  firstName: z.string().min(1, "Vui lòng nhập tên"),
  branchId: z.number().int().min(1, "Vui lòng chọn chi nhánh"),
  departmentId: z.number().int().min(1, "Vui lòng chọn phòng ban"),
  positionId: z.number().int().min(1, "Vui lòng chọn chức danh"),
  levelId: z.number().int().nullable().optional(),
  gender: z.enum(["male", "female", "other"]).optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  identityNumber: z.string().optional(),
  phone: z.string().optional(),
  personalEmail: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  joinedDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const EmployeesPage = () => {
  const { companyCode } = useParams<{ companyCode: string }>();

  const { items, total, loading, filter, fetch, setFilter, create, remove } = useEmployeeStore();
  const branches = useBranchStore((s) => s.items);
  const fetchBranches = useBranchStore((s) => s.fetch);
  const departments = useDepartmentStore((s) => s.items);
  const fetchDepartments = useDepartmentStore((s) => s.fetch);
  const positions = usePositionStore((s) => s.items);
  const fetchPositions = usePositionStore((s) => s.fetch);
  const levels = useLevelStore((s) => s.items);
  const fetchLevels = useLevelStore((s) => s.fetch);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Employee | null>(null);
  const [searchInput, setSearchInput] = useState(filter.search ?? "");

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
    if (departments.length === 0) fetchDepartments();
    if (positions.length === 0) fetchPositions();
    if (levels.length === 0) fetchLevels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search 300ms
  useEffect(() => {
    const handle = setTimeout(() => {
      if ((filter.search ?? "") !== searchInput) {
        setFilter({ search: searchInput || undefined });
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const openCreate = () => {
    reset({
      lastName: "",
      firstName: "",
      branchId: branches[0]?.id ?? 0,
      departmentId: departments[0]?.id ?? 0,
      positionId: positions[0]?.id ?? 0,
      levelId: null,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      lastName: values.lastName,
      firstName: values.firstName,
      branchId: values.branchId,
      departmentId: values.departmentId,
      positionId: values.positionId,
      levelId: values.levelId || null,
      gender: values.gender || undefined,
      dateOfBirth: values.dateOfBirth || undefined,
      identityNumber: values.identityNumber || undefined,
      phone: values.phone || undefined,
      personalEmail: values.personalEmail || undefined,
      joinedDate: values.joinedDate || undefined,
    };
    const result = await create(payload);
    if (result) setDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const ok = await remove(toDelete.id);
    if (ok) setToDelete(null);
  };

  const showSkeleton = loading && items.length === 0;
  const showEmpty = !loading && items.length === 0 && !filter.search && !filter.branchId && !filter.departmentId && !filter.status;
  const hasPrereqs = branches.length > 0 && departments.length > 0 && positions.length > 0;

  const currentPos = (emp: Employee) =>
    emp.EmployeePositions?.find((p) => p.effectiveTo == null) ?? emp.EmployeePositions?.[0] ?? null;

  const totalPages = Math.max(1, Math.ceil(total / (filter.pageSize ?? 20)));
  const currentPage = filter.page ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Nhân viên</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý danh sách nhân viên. {total > 0 && `Tổng: ${total} người.`}
          </p>
        </div>
        <Button onClick={openCreate} disabled={!hasPrereqs}>
          <Plus className="h-4 w-4" />
          Thêm nhân viên
        </Button>
      </div>

      {!hasPrereqs && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
          Cần có ít nhất 1 chi nhánh + 1 phòng ban + 1 chức danh trước khi thêm nhân viên.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã, họ tên..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <select
          value={filter.branchId ?? ""}
          onChange={(e) => setFilter({ branchId: e.target.value ? Number(e.target.value) : null })}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tất cả chi nhánh</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={filter.departmentId ?? ""}
          onChange={(e) => setFilter({ departmentId: e.target.value ? Number(e.target.value) : null })}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tất cả phòng ban</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={filter.status ?? ""}
          onChange={(e) =>
            setFilter({ status: (e.target.value as EmployeeStatus) || null })
          }
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border bg-background">
        {showEmpty ? (
          <EmptyState
            icon={UsersIcon}
            title="Chưa có nhân viên nào"
            description={
              hasPrereqs
                ? "Bắt đầu bằng cách thêm nhân viên đầu tiên vào hệ thống."
                : "Vui lòng tạo chi nhánh, phòng ban và chức danh trước."
            }
            action={
              hasPrereqs && (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Thêm nhân viên đầu tiên
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Chi nhánh</TableHead>
                  <TableHead>Phòng ban</TableHead>
                  <TableHead>Chức danh</TableHead>
                  <TableHead>Cấp bậc</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              {showSkeleton ? (
                <TableSkeleton cols={8} />
              ) : (
                <TableBody>
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                        Không tìm thấy kết quả phù hợp
                      </TableCell>
                    </TableRow>
                  )}
                  {items.map((emp) => {
                    const pos = currentPos(emp);
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-mono font-medium">{emp.code}</TableCell>
                        <TableCell>{emp.displayName}</TableCell>
                        <TableCell className="text-sm">{pos?.Branch?.name ?? "-"}</TableCell>
                        <TableCell className="text-sm">{pos?.Department?.name ?? "-"}</TableCell>
                        <TableCell className="text-sm">{pos?.Position?.name ?? "-"}</TableCell>
                        <TableCell className="text-sm">{pos?.Level?.name ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[emp.status]}>
                            {STATUS_LABELS[emp.status]}
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
                              <DropdownMenuItem asChild>
                                <Link to={`/${companyCode}/employees/${emp.id}`}>
                                  <Eye className="h-4 w-4" />
                                  Xem chi tiết
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => setToDelete(emp)}
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

            {items.length > 0 && (
              <div className="flex justify-between items-center px-4 py-3 border-t text-sm">
                <div className="text-muted-foreground">
                  Trang {currentPage} / {totalPages} — {total} nhân viên
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1 || loading}
                    onClick={() => setFilter({ page: currentPage - 1 })}
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages || loading}
                    onClick={() => setFilter({ page: currentPage + 1 })}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create employee dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && requestClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm nhân viên mới</DialogTitle>
            <DialogDescription>
              Mã nhân viên sẽ tự động sinh theo prefix của công ty. Vị trí ban đầu bắt buộc.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Thông tin cơ bản</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="lastName">Họ *</Label>
                  <Input id="lastName" {...register("lastName")} />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">Tên *</Label>
                  <Input id="firstName" {...register("firstName")} />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Giới tính</Label>
                  <select
                    id="gender"
                    {...register("gender")}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">— Chọn —</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Ngày sinh</Label>
                  <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="identityNumber">CCCD/CMND</Label>
                  <Input id="identityNumber" {...register("identityNumber")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">SĐT</Label>
                  <Input id="phone" {...register("phone")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personalEmail">Email cá nhân</Label>
                  <Input id="personalEmail" type="email" {...register("personalEmail")} />
                  {errors.personalEmail && (
                    <p className="text-xs text-destructive">{errors.personalEmail.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="joinedDate">Ngày vào công ty</Label>
                  <Input id="joinedDate" type="date" {...register("joinedDate")} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Vị trí công tác *</h3>
              <div className="grid grid-cols-2 gap-3">
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
                  <Label htmlFor="departmentId">Phòng ban *</Label>
                  <select
                    id="departmentId"
                    {...register("departmentId", { valueAsNumber: true })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                  {errors.departmentId && (
                    <p className="text-xs text-destructive">{errors.departmentId.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="positionId">Chức danh *</Label>
                  <select
                    id="positionId"
                    {...register("positionId", { valueAsNumber: true })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {errors.positionId && (
                    <p className="text-xs text-destructive">{errors.positionId.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="levelId">Cấp bậc</Label>
                  <select
                    id="levelId"
                    {...register("levelId", {
                      setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                    })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">— Không chọn —</option>
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={requestClose}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : "Tạo nhân viên"}
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
        title="Xóa nhân viên"
        description={`Bạn chắc chắn xóa "${toDelete?.displayName}" (${toDelete?.code})? Thao tác này không thể hoàn tác. Mọi HĐ, người phụ thuộc, tài liệu... sẽ bị xóa theo.`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default EmployeesPage;
