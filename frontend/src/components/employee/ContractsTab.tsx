import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FileText, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
import { contractService } from "@/services/contractService";
import type { Contract, ContractStatus, ContractType } from "@/types/employee";

const TYPE_LABELS: Record<ContractType, string> = {
  probation: "Thử việc",
  fixed_term: "Xác định thời hạn",
  indefinite: "Không xác định thời hạn",
  seasonal: "Mùa vụ",
  collaboration: "Cộng tác viên",
};

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "Nháp",
  active: "Đang hiệu lực",
  expired: "Hết hạn",
  terminated: "Đã chấm dứt",
};

const STATUS_VARIANT: Record<ContractStatus, "outline" | "success" | "warning" | "destructive"> = {
  draft: "outline",
  active: "success",
  expired: "warning",
  terminated: "destructive",
};

const schema = z.object({
  code: z.string().min(1, "Nhập mã hợp đồng"),
  type: z.enum(["probation", "fixed_term", "indefinite", "seasonal", "collaboration"]),
  signedDate: z.string().min(1, "Chọn ngày ký"),
  startDate: z.string().min(1, "Chọn ngày bắt đầu"),
  endDate: z.string().optional(),
  basicSalary: z.number().min(0, "Lương phải >= 0"),
  allowanceAmount: z.number().min(0).optional(),
  workingHoursPerWeek: z.number().int().min(1).max(72).optional(),
  status: z.enum(["draft", "active", "expired", "terminated"]).optional(),
  fileUrl: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const formatDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("vi-VN") : "—");
const formatMoney = (v?: string) => (v ? `${Number(v).toLocaleString("vi-VN")} ₫` : "—");

interface Props {
  employeeId: number;
}

export const ContractsTab = ({ employeeId }: Props) => {
  const [items, setItems] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [toDelete, setToDelete] = useState<Contract | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const load = async () => {
    try {
      setLoading(true);
      setItems(await contractService.list(employeeId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const openCreate = () => {
    setEditing(null);
    reset({
      code: "",
      type: "probation",
      signedDate: new Date().toISOString().split("T")[0],
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      basicSalary: 0,
      allowanceAmount: 0,
      workingHoursPerWeek: 40,
      status: "active",
      fileUrl: "",
      note: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (c: Contract) => {
    setEditing(c);
    reset({
      code: c.code,
      type: c.type,
      signedDate: c.signedDate,
      startDate: c.startDate,
      endDate: c.endDate ?? "",
      basicSalary: Number(c.basicSalary),
      allowanceAmount: Number(c.allowanceAmount),
      workingHoursPerWeek: c.workingHoursPerWeek,
      status: c.status,
      fileUrl: c.fileUrl ?? "",
      note: c.note ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        basicSalary: String(values.basicSalary),
        allowanceAmount: String(values.allowanceAmount ?? 0),
        workingHoursPerWeek: values.workingHoursPerWeek ?? 40,
        status: values.status ?? "active",
        endDate: values.endDate || null,
        fileUrl: values.fileUrl || null,
        note: values.note || null,
      };
      if (editing) {
        await contractService.update(employeeId, editing.id, payload);
        toast.success("Cập nhật HĐ thành công");
      } else {
        await contractService.create(employeeId, payload);
        toast.success("Tạo HĐ thành công");
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Lưu HĐ thất bại");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await contractService.delete(employeeId, toDelete.id);
      toast.success("Xóa HĐ thành công");
      setToDelete(null);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Xóa HĐ thất bại");
    }
  };

  const showEmpty = !loading && items.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Hợp đồng lao động</h3>
          <p className="text-sm text-muted-foreground">
            1 nhân viên chỉ có 1 hợp đồng đang hiệu lực tại 1 thời điểm.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm HĐ
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        {showEmpty ? (
          <EmptyState
            icon={FileText}
            title="Chưa có hợp đồng nào"
            description="Ghi nhận HĐ thử việc / chính thức của nhân viên."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Thêm HĐ đầu tiên
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã HĐ</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Ngày ký</TableHead>
                <TableHead>Hiệu lực</TableHead>
                <TableHead>Lương cơ bản</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            {loading ? (
              <TableSkeleton cols={7} />
            ) : (
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">{c.code}</TableCell>
                    <TableCell>{TYPE_LABELS[c.type]}</TableCell>
                    <TableCell>{formatDate(c.signedDate)}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(c.startDate)} — {c.endDate ? formatDate(c.endDate) : "Không XĐ"}
                    </TableCell>
                    <TableCell>{formatMoney(c.basicSalary)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABELS[c.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" /> Sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => setToDelete(c)}
                          >
                            <Trash2 className="h-4 w-4" /> Xóa
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa hợp đồng" : "Tạo hợp đồng mới"}</DialogTitle>
            <DialogDescription>Thông tin cơ bản của hợp đồng lao động</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="code">Mã HĐ *</Label>
                <Input id="code" placeholder="HD001/2026" {...register("code")} />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Loại HĐ *</Label>
                <select
                  id="type"
                  {...register("type")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signedDate">Ngày ký *</Label>
                <Input id="signedDate" type="date" {...register("signedDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Ngày bắt đầu *</Label>
                <Input id="startDate" type="date" {...register("startDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Ngày kết thúc</Label>
                <Input id="endDate" type="date" {...register("endDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Trạng thái</Label>
                <select
                  id="status"
                  {...register("status")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="basicSalary">Lương cơ bản (VND) *</Label>
                <Input
                  id="basicSalary"
                  type="number"
                  min={0}
                  {...register("basicSalary", { valueAsNumber: true })}
                />
                {errors.basicSalary && (
                  <p className="text-xs text-destructive">{errors.basicSalary.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="allowanceAmount">Phụ cấp (VND)</Label>
                <Input
                  id="allowanceAmount"
                  type="number"
                  min={0}
                  {...register("allowanceAmount", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workingHoursPerWeek">Số giờ làm/tuần</Label>
                <Input
                  id="workingHoursPerWeek"
                  type="number"
                  min={1}
                  max={72}
                  {...register("workingHoursPerWeek", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fileUrl">Link PDF hợp đồng</Label>
                <Input id="fileUrl" {...register("fileUrl")} placeholder="https://..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea id="note" {...register("note")} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : editing ? "Cập nhật" : "Tạo HĐ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Xóa hợp đồng"
        description={`Xóa HĐ "${toDelete?.code}"?`}
        confirmText="Xóa"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
};
