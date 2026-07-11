import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { PayslipView } from "@/components/payroll/PayslipView";
import { payrollService } from "@/services/payrollService";
import type { Payroll } from "@/types/payroll";

const now = new Date();

const MyPayslipPage = () => {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundMsg, setNotFoundMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setNotFoundMsg(null);
        const p = await payrollService.getMyPayslip(month, year);
        setPayroll(p);
      } catch (e) {
        setPayroll(null);
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setNotFoundMsg(msg ?? "Không có payslip cho kỳ này");
      } finally {
        setLoading(false);
      }
    })();
  }, [month, year]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Payslip của tôi</h1>
        <p className="text-muted-foreground text-sm">
          Xem bảng lương hàng tháng. Chỉ hiển thị khi HR đã chốt.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="month" className="text-xs">Tháng</Label>
              <Input
                id="month" type="number" min={1} max={12} className="w-20"
                value={month} onChange={(e) => setMonth(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="year" className="text-xs">Năm</Label>
              <Input
                id="year" type="number" min={2020} max={2050} className="w-24"
                value={year} onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-muted-foreground">Đang tải...</div>
      ) : payroll ? (
        <PayslipView payroll={payroll} />
      ) : (
        <EmptyState
          icon={FileText}
          title={`Chưa có payslip tháng ${String(month).padStart(2, "0")}/${year}`}
          description={notFoundMsg || "HR có thể chưa chốt bảng lương cho kỳ này."}
        />
      )}
    </div>
  );
};

export default MyPayslipPage;
