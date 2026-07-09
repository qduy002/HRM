import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { leaveRequestService } from "@/services/leaveRequestService";
import { useAuthStore } from "@/stores/useAuthStore";
import type { LeaveRequest } from "@/types/leave";

const formatDate = (v: string) => new Date(v).toLocaleDateString("vi-VN");

interface RejectFormValues {
  reason: string;
}

const PendingApprovalPage = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [stage, setStage] = useState<"manager" | "hr" | "all" | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [approveTarget, setApproveTarget] = useState<LeaveRequest | null>(null);
  const [directTarget, setDirectTarget] = useState<LeaveRequest | null>(null);

  const {
    register: registerReject, handleSubmit: handleSubmitReject, reset: resetReject,
    formState: { errors: rejectErrors },
  } = useForm<RejectFormValues>();

  const {
    register: registerApprove, handleSubmit: handleSubmitApprove, reset: resetApprove,
  } = useForm<{ note?: string }>();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await leaveRequestService.listPendingApproval();
      setRequests(res.requests);
      setStage(res.stage);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Không tải được danh sách");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openApprove = (r: LeaveRequest) => {
    resetApprove({ note: "" });
    setApproveTarget(r);
  };

  const openReject = (r: LeaveRequest) => {
    resetReject({ reason: "" });
    setRejectTarget(r);
  };

  const openDirect = (r: LeaveRequest) => {
    resetApprove({ note: "" });
    setDirectTarget(r);
  };

  const onDirectConfirm = async (values: { note?: string }) => {
    if (!directTarget) return;
    try {
      setProcessing(directTarget.id);
      await leaveRequestService.directApprove(directTarget.id, values.note);
      toast.success("Đã duyệt vượt cấp. Đơn có hiệu lực.");
      setDirectTarget(null);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Duyệt vượt cấp thất bại");
    } finally {
      setProcessing(null);
    }
  };

  const onApproveConfirm = async (values: { note?: string }) => {
    if (!approveTarget) return;
    try {
      setProcessing(approveTarget.id);
      // Detect action per-request theo status thay vì stage
      if (approveTarget.status === "pending") {
        await leaveRequestService.managerApprove(approveTarget.id, values.note);
        toast.success("Đã duyệt tầng Manager. Chờ HR duyệt cuối.");
      } else {
        await leaveRequestService.hrApprove(approveTarget.id, values.note);
        toast.success("Đã duyệt cuối cùng. Đơn có hiệu lực.");
      }
      setApproveTarget(null);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Duyệt thất bại");
    } finally {
      setProcessing(null);
    }
  };

  const onRejectConfirm = async (values: RejectFormValues) => {
    if (!rejectTarget) return;
    try {
      setProcessing(rejectTarget.id);
      await leaveRequestService.reject(rejectTarget.id, values.reason);
      toast.success("Đã từ chối đơn");
      setRejectTarget(null);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Từ chối thất bại");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Đơn chờ duyệt</h1>
        <p className="text-muted-foreground text-sm">
          {stage === "manager" && "Đơn của nhân viên thuộc phòng ban bạn quản lý — duyệt tầng 1."}
          {stage === "hr" && "Đơn đã được manager duyệt — bạn duyệt cuối cùng để có hiệu lực."}
          {stage === "all" && "Bạn là admin — thấy cả đơn chưa qua manager (duyệt tầng 1) và đơn manager đã duyệt (duyệt tầng 2)."}
          {!stage && "Đơn cần bạn duyệt sẽ hiển thị ở đây."}
        </p>
      </div>

      <div className="rounded-md border bg-background">
        {!loading && requests.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Không có đơn nào chờ duyệt"
            description="Khi có đơn mới hoặc đã qua tầng trước, sẽ hiển thị ở đây."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhân viên</TableHead>
                <TableHead>Loại phép</TableHead>
                <TableHead>Từ - Đến</TableHead>
                <TableHead>Số ngày</TableHead>
                <TableHead>Lý do</TableHead>
                <TableHead>Đã qua Manager</TableHead>
                <TableHead className="w-40">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            {loading ? <TableSkeleton cols={7} /> : (
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.Employee?.displayName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.Employee?.code}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: r.LeaveType?.color || "#94a3b8" }} />
                        {r.LeaveType?.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(r.fromDate)}
                      {r.halfDay === "morning" && <span className="text-xs text-muted-foreground"> (sáng)</span>}
                      {r.halfDay === "afternoon" && <span className="text-xs text-muted-foreground"> (chiều)</span>}
                      {" — "}
                      {formatDate(r.toDate)}
                    </TableCell>
                    <TableCell className="font-mono">{r.days}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs">{r.reason}</TableCell>
                    <TableCell>
                      {r.managerApprovedBy ? (
                        <div>
                          <Badge variant="success">Đã duyệt</Badge>
                          <div className="text-xs text-muted-foreground mt-1">{r.managerApprover?.email}</div>
                        </div>
                      ) : (
                        <Badge variant="outline">Chưa</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => openApprove(r)}
                          disabled={processing === r.id}
                          title="Duyệt tầng hiện tại (đi theo workflow)"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Duyệt
                        </Button>
                        {isAdmin && r.status !== "approved" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openDirect(r)}
                            disabled={processing === r.id}
                            title="Bypass workflow — đơn về approved ngay"
                          >
                            <Zap className="h-4 w-4" />
                            Duyệt trực tiếp
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReject(r)}
                          disabled={processing === r.id}
                        >
                          <XCircle className="h-4 w-4" />
                          Từ chối
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        )}
      </div>

      {/* Approve dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approveTarget?.status === "pending"
                ? "Duyệt tầng Manager"
                : "Duyệt cuối cùng (HR)"}
            </DialogTitle>
            <DialogDescription>
              {approveTarget?.status === "pending"
                ? "Đơn sẽ chuyển sang HR để duyệt cuối cùng."
                : "Đơn sẽ có hiệu lực, số phép của NV sẽ trừ tương ứng."}
              <br />
              Nhân viên: <strong>{approveTarget?.Employee?.displayName}</strong> ({approveTarget?.days} ngày)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitApprove(onApproveConfirm)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="approveNote">Ghi chú (tùy chọn)</Label>
              <Textarea id="approveNote" rows={2} {...registerApprove("note")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setApproveTarget(null)}>Hủy</Button>
              <Button type="submit" disabled={processing !== null}>
                {processing !== null ? "Đang xử lý..." : "Xác nhận duyệt"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Direct approve dialog (admin only) */}
      <Dialog open={!!directTarget} onOpenChange={(open) => !open && setDirectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Duyệt vượt cấp (Admin)
            </DialogTitle>
            <DialogDescription>
              Đơn sẽ về trạng thái <strong>đã duyệt</strong> ngay, bỏ qua workflow.
              Cả tầng Manager và HR đều được ghi là bạn cho mục đích audit.
              <br />
              Nhân viên: <strong>{directTarget?.Employee?.displayName}</strong> ({directTarget?.days} ngày)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitApprove(onDirectConfirm)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="directNote">Ghi chú (lý do vượt cấp — recommend)</Label>
              <Textarea
                id="directNote"
                rows={2}
                placeholder="VD: Manager đang nghỉ, đơn khẩn..."
                {...registerApprove("note")}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDirectTarget(null)}>Hủy</Button>
              <Button type="submit" disabled={processing !== null}>
                {processing !== null ? "Đang xử lý..." : "Xác nhận vượt cấp"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối đơn</DialogTitle>
            <DialogDescription>
              Nhân viên: <strong>{rejectTarget?.Employee?.displayName}</strong>. Nêu lý do rõ ràng để nhân viên hiểu.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitReject(onRejectConfirm)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Lý do từ chối *</Label>
              <Textarea id="rejectReason" rows={3} {...registerReject("reason", { required: "Nhập lý do từ chối" })} />
              {rejectErrors.reason && <p className="text-xs text-destructive">{rejectErrors.reason.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>Hủy</Button>
              <Button type="submit" variant="destructive" disabled={processing !== null}>
                {processing !== null ? "Đang xử lý..." : "Từ chối"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingApprovalPage;
