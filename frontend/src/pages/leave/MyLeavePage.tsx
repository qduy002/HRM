import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarDays, MoreHorizontal, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { leaveBalanceService } from "@/services/leaveBalanceService";
import { leaveRequestService } from "@/services/leaveRequestService";
import { leaveTypeService } from "@/services/leaveTypeService";
import type { LeaveBalance, LeaveRequest, LeaveRequestStatus, LeaveType } from "@/types/leave";

const STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  pending: "Chờ manager duyệt",
  manager_approved: "Chờ HR duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
  cancelled: "Đã hủy",
};

const STATUS_VARIANT: Record<LeaveRequestStatus, "warning" | "outline" | "success" | "destructive"> = {
  pending: "warning",
  manager_approved: "warning",
  approved: "success",
  rejected: "destructive",
  cancelled: "outline",
};

const schema = z
  .object({
    leaveTypeId: z.number().int().min(1, "Chọn loại phép"),
    fromDate: z.string().min(1, "Chọn ngày bắt đầu"),
    toDate: z.string().min(1, "Chọn ngày kết thúc"),
    halfDay: z.enum(["morning", "afternoon"]).nullable().optional(),
    reason: z.string().min(3, "Nhập lý do (tối thiểu 3 ký tự)"),
  })
  .refine((data) => new Date(data.toDate) >= new Date(data.fromDate), {
    message: "Ngày kết thúc phải >= ngày bắt đầu",
    path: ["toDate"],
  })
  .refine((data) => !data.halfDay || data.fromDate === data.toDate, {
    message: "Nghỉ nửa ngày chỉ áp dụng khi fromDate = toDate",
    path: ["halfDay"],
  });

type FormValues = z.infer<typeof schema>;

const formatDate = (v: string) => new Date(v).toLocaleDateString("vi-VN");

const MyLeavePage = () => {
  const currentYear = new Date().getFullYear();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toCancel, setToCancel] = useState<LeaveRequest | null>(null);

  const {
    register, handleSubmit, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const halfDayEnabled = !!watch("halfDay");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [bal, reqs, types] = await Promise.all([
        leaveBalanceService.listMe(currentYear),
        leaveRequestService.listMe(),
        leaveTypeService.list(),
      ]);
      setBalances(bal.balances);
      setRequests(reqs);
      setLeaveTypes(types.filter((t) => t.isActive));
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    if (leaveTypes.length === 0) {
      toast.error("Chưa có loại phép nào. Liên hệ HR để khởi tạo.");
      return;
    }
    reset({
      leaveTypeId: leaveTypes[0].id,
      fromDate: new Date().toISOString().split("T")[0],
      toDate: new Date().toISOString().split("T")[0],
      halfDay: null,
      reason: "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await leaveRequestService.create({
        leaveTypeId: values.leaveTypeId,
        fromDate: values.fromDate,
        toDate: values.toDate,
        halfDay: values.halfDay || null,
        reason: values.reason,
      });
      toast.success("Gửi đơn thành công. Chờ manager duyệt.");
      setDialogOpen(false);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Gửi đơn thất bại");
    }
  };

  const confirmCancel = async () => {
    if (!toCancel) return;
    try {
      await leaveRequestService.cancel(toCancel.id);
      toast.success("Đã hủy đơn");
      setToCancel(null);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Hủy đơn thất bại");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Đơn phép của tôi</h1>
          <p className="text-muted-foreground text-sm">
            Xem số phép còn lại năm {currentYear} và quản lý đơn xin nghỉ.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Xin phép
        </Button>
      </div>

      {/* Balance cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {loading && balances.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="h-4 rounded bg-muted animate-pulse w-1/2 mb-2" />
                  <div className="h-8 rounded bg-muted animate-pulse w-1/3" />
                </CardContent>
              </Card>
            ))
          : balances.map((b) => (
              <Card key={b.leaveTypeId}>
                <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: b.color || "#94a3b8" }}
                    />
                    {b.name}
                  </CardTitle>
                  {!b.isPaid && <Badge variant="outline">Không lương</Badge>}
                </CardHeader>
                <CardContent>
                  {b.daysPerYear == null ? (
                    <div>
                      <p className="text-2xl font-bold">Không giới hạn</p>
                      <p className="text-xs text-muted-foreground">Đã dùng: {b.usedDays} ngày</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl font-bold">
                        {b.remainingDays}
                        <span className="text-sm font-normal text-muted-foreground"> / {b.allocatedDays} ngày</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Đã dùng: {b.usedDays}
                        {b.carriedOverDays > 0 && ` · Chuyển năm trước: ${b.carriedOverDays}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
      </div>

      {/* My requests */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Đơn phép của tôi</h2>
        <div className="rounded-md border bg-background">
          {!loading && requests.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Chưa có đơn phép nào"
              description="Bấm 'Xin phép' để tạo đơn đầu tiên."
              action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Xin phép</Button>}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại</TableHead>
                  <TableHead>Từ ngày</TableHead>
                  <TableHead>Đến ngày</TableHead>
                  <TableHead>Số ngày</TableHead>
                  <TableHead>Lý do</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const canCancel = r.status === "pending" || r.status === "manager_approved";
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: r.LeaveType?.color || "#94a3b8" }}
                          />
                          {r.LeaveType?.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(r.fromDate)}
                        {r.halfDay === "morning" && <span className="text-xs text-muted-foreground"> (sáng)</span>}
                        {r.halfDay === "afternoon" && <span className="text-xs text-muted-foreground"> (chiều)</span>}
                      </TableCell>
                      <TableCell>{formatDate(r.toDate)}</TableCell>
                      <TableCell className="font-mono">{r.days}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{r.reason}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                        {r.status === "rejected" && r.rejectedReason && (
                          <div className="text-xs text-destructive mt-1 max-w-[220px] truncate" title={r.rejectedReason}>
                            {r.rejectedReason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {canCancel && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-destructive" onSelect={() => setToCancel(r)}>
                                <X className="h-4 w-4" />
                                Hủy đơn
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Submit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo đơn xin nghỉ</DialogTitle>
            <DialogDescription>Số ngày sẽ tự tính dựa trên cấu hình ngày làm việc của công ty.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="leaveTypeId">Loại phép *</Label>
              <select id="leaveTypeId" {...register("leaveTypeId", { valueAsNumber: true })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                {leaveTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.daysPerYear ? `(${t.daysPerYear} ngày/năm)` : "(không giới hạn)"}
                    {!t.isPaid && " — không lương"}
                  </option>
                ))}
              </select>
              {errors.leaveTypeId && <p className="text-xs text-destructive">{errors.leaveTypeId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="fromDate">Từ ngày *</Label>
                <Input id="fromDate" type="date" {...register("fromDate")} />
                {errors.fromDate && <p className="text-xs text-destructive">{errors.fromDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="toDate">Đến ngày *</Label>
                <Input id="toDate" type="date" {...register("toDate")} disabled={halfDayEnabled} />
                {errors.toDate && <p className="text-xs text-destructive">{errors.toDate.message}</p>}
                {halfDayEnabled && (
                  <p className="text-xs text-muted-foreground">Nghỉ nửa ngày: khóa toDate = fromDate</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="halfDay">Nửa ngày (nếu có)</Label>
              <select id="halfDay" {...register("halfDay", {
                setValueAs: (v) => (v === "" || v == null ? null : v),
              })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                <option value="">— Nghỉ cả ngày —</option>
                <option value="morning">Nửa ngày (buổi sáng)</option>
                <option value="afternoon">Nửa ngày (buổi chiều)</option>
              </select>
              {errors.halfDay && <p className="text-xs text-destructive">{errors.halfDay.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Lý do *</Label>
              <Textarea id="reason" rows={3} {...register("reason")} placeholder="Nêu ngắn gọn lý do xin nghỉ..." />
              {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Hủy</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang gửi..." : "Gửi đơn"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toCancel}
        onOpenChange={(open) => !open && setToCancel(null)}
        title="Hủy đơn phép"
        description="Bạn chắc chắn muốn hủy đơn này?"
        confirmText="Hủy đơn"
        variant="destructive"
        onConfirm={confirmCancel}
      />
    </div>
  );
};

export default MyLeavePage;
