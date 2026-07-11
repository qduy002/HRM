import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Lock, Play, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PayslipView } from "@/components/payroll/PayslipView";
import { useAuthStore } from "@/stores/useAuthStore";
import { payrollService } from "@/services/payrollService";
import type { Payroll } from "@/types/payroll";

const PayrollDetailPage = () => {
  const { id, companyCode } = useParams<{ id: string; companyCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isHR = user?.role === "admin" || user?.role === "hr";

  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"finalize" | "unlock" | "mark-paid" | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setPayroll(await payrollService.get(Number(id)));
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Không tải được bảng lương");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAction = async () => {
    if (!payroll || !action) return;
    try {
      if (action === "finalize") await payrollService.finalize(payroll.id);
      else if (action === "unlock") await payrollService.unlock(payroll.id);
      else if (action === "mark-paid") await payrollService.markPaid(payroll.id);
      toast.success(
        action === "finalize" ? "Đã chốt bảng lương"
        : action === "unlock" ? "Đã mở khóa"
        : "Đã đánh dấu thanh toán"
      );
      setAction(null);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Thao tác thất bại");
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Đang tải...</div>;
  }
  if (!payroll) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Không tìm thấy bảng lương.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate(`/${companyCode}/payroll`)}>
          <ArrowLeft className="h-4 w-4" />Về danh sách
        </Button>
        {isHR && (
          <div className="flex gap-2">
            {payroll.status === "draft" && (
              <Button onClick={() => setAction("finalize")}>
                <Lock className="h-4 w-4" />Chốt bảng lương
              </Button>
            )}
            {payroll.status === "finalized" && (
              <>
                <Button variant="outline" onClick={() => setAction("unlock")}>
                  <Unlock className="h-4 w-4" />Mở khóa
                </Button>
                <Button onClick={() => setAction("mark-paid")}>
                  <Play className="h-4 w-4" />Đánh dấu đã trả
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <PayslipView payroll={payroll} />

      <ConfirmDialog
        open={!!action}
        onOpenChange={(open) => !open && setAction(null)}
        title={
          action === "finalize" ? "Chốt bảng lương?"
          : action === "mark-paid" ? "Đánh dấu đã thanh toán?"
          : "Mở khóa bảng lương?"
        }
        description={
          action === "finalize" ? "Sau khi chốt, NV có thể thấy payslip của mình. Bạn vẫn có thể unlock để sửa lại."
          : action === "mark-paid" ? "Đánh dấu bảng lương đã được thanh toán cho NV."
          : `Mở lại để chỉnh sửa. Số lần unlock hiện tại: ${payroll.unlockCount}.`
        }
        confirmText={
          action === "finalize" ? "Chốt bảng lương"
          : action === "mark-paid" ? "Đánh dấu đã trả"
          : "Mở khóa"
        }
        onConfirm={runAction}
      />
    </div>
  );
};

export default PayrollDetailPage;
