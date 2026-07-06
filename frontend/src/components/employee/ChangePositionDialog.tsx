import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { employeeService } from "@/services/employeeService";
import { useBranchStore } from "@/stores/useBranchStore";
import { useDepartmentStore } from "@/stores/useDepartmentStore";
import { usePositionStore } from "@/stores/usePositionStore";
import { useLevelStore } from "@/stores/useLevelStore";

const schema = z.object({
  branchId: z.number().int().min(1, "Chọn chi nhánh"),
  departmentId: z.number().int().min(1, "Chọn phòng ban"),
  positionId: z.number().int().min(1, "Chọn chức danh"),
  levelId: z.number().int().nullable().optional(),
  effectiveFrom: z.string().min(1, "Chọn ngày hiệu lực"),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: number;
  onChanged: () => void;
}

export const ChangePositionDialog = ({ open, onOpenChange, employeeId, onChanged }: Props) => {
  const branches = useBranchStore((s) => s.items);
  const departments = useDepartmentStore((s) => s.items);
  const positions = usePositionStore((s) => s.items);
  const levels = useLevelStore((s) => s.items);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      branchId: branches[0]?.id ?? 0,
      departmentId: departments[0]?.id ?? 0,
      positionId: positions[0]?.id ?? 0,
      levelId: null,
      effectiveFrom: new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await employeeService.changePosition(employeeId, {
        branchId: values.branchId,
        departmentId: values.departmentId,
        positionId: values.positionId,
        levelId: values.levelId || null,
        effectiveFrom: values.effectiveFrom,
        note: values.note || undefined,
      });
      toast.success("Đổi vị trí thành công");
      reset();
      onChanged();
      onOpenChange(false);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Đổi vị trí thất bại");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi vị trí công tác</DialogTitle>
          <DialogDescription>
            Vị trí cũ sẽ tự đóng ở ngày trước ngày hiệu lực mới.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.branchId && <p className="text-xs text-destructive">{errors.branchId.message}</p>}
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
                    {d.name}
                  </option>
                ))}
              </select>
              {errors.departmentId && <p className="text-xs text-destructive">{errors.departmentId.message}</p>}
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
              {errors.positionId && <p className="text-xs text-destructive">{errors.positionId.message}</p>}
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
                <option value="">— Không đổi/chưa gán —</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="effectiveFrom">Ngày hiệu lực *</Label>
            <Input id="effectiveFrom" type="date" {...register("effectiveFrom")} />
            {errors.effectiveFrom && (
              <p className="text-xs text-destructive">{errors.effectiveFrom.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú (lý do)</Label>
            <Textarea id="note" {...register("note")} rows={2} placeholder="Thăng chức, chuyển phòng..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Đổi vị trí"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
