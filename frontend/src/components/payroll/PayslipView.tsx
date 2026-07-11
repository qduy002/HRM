import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Payroll, PayrollItemType } from "@/types/payroll";

const fmt = (n: string | number | null | undefined) =>
  n == null || n === "" ? "—" : Number(n).toLocaleString("vi-VN") + " ₫";

const STATUS_LABEL: Record<Payroll["status"], { label: string; variant: "outline" | "success" | "warning" }> = {
  draft: { label: "Nháp", variant: "outline" },
  finalized: { label: "Đã chốt", variant: "warning" },
  paid: { label: "Đã trả", variant: "success" },
};

const ITEM_TYPE_LABEL: Record<PayrollItemType, string> = {
  earning: "Thu nhập",
  deduction: "Khấu trừ",
  insurance: "Bảo hiểm",
  tax: "Thuế",
};

const ITEM_TYPE_COLOR: Record<PayrollItemType, string> = {
  earning: "text-emerald-600",
  deduction: "text-orange-600",
  insurance: "text-blue-600",
  tax: "text-red-600",
};

interface Props {
  payroll: Payroll;
}

export const PayslipView = ({ payroll: p }: Props) => {
  const items = p.PayrollItems ?? [];
  const earnings = items.filter((it) => it.type === "earning");
  const deductions = items.filter((it) => it.type !== "earning");

  const totalEarn = earnings.reduce((s, it) => s + Number(it.amount), 0);
  const totalDeduct = deductions.reduce((s, it) => s + Number(it.amount), 0);

  const status = STATUS_LABEL[p.status];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">
                Bảng lương tháng {String(p.month).padStart(2, "0")}/{p.year}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Kỳ lương: {p.fromDate} → {p.toDate}
              </p>
            </div>
            <Badge variant={status.variant} className="text-sm">{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-muted-foreground">Nhân viên</div>
              <div>
                <span className="font-mono font-medium">{p.Employee?.code}</span>
                {" — "}
                <span>{p.Employee?.displayName}</span>
              </div>
              {p.Employee?.bankAccountNumber && (
                <div className="text-sm text-muted-foreground">
                  {p.Employee.bankName} • STK: <span className="font-mono">{p.Employee.bankAccountNumber}</span>
                  {p.Employee.bankBranch && ` (${p.Employee.bankBranch})`}
                </div>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="text-muted-foreground">
                Ngày công: <span className="font-mono font-medium text-foreground">{p.actualPaidDays} / {p.workingDaysStandard}</span>
              </div>
              <div className="text-muted-foreground">
                OT: <span className="font-mono font-medium text-foreground">{Number(p.otHours).toFixed(2)} giờ</span>
              </div>
              <div className="text-muted-foreground">
                Người phụ thuộc: <span className="font-mono font-medium text-foreground">{p.dependentCount}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary numbers */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">GROSS</div>
            <div className="text-lg font-bold font-mono">{fmt(p.grossSalary)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Tổng BH (NV đóng)</div>
            <div className="text-lg font-bold font-mono text-blue-600">− {fmt(p.totalInsuranceEmployee)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Thuế TNCN</div>
            <div className="text-lg font-bold font-mono text-red-600">− {fmt(p.personalIncomeTax)}</div>
          </CardContent>
        </Card>
        <Card className="border-primary">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">★ NET (Thực lĩnh)</div>
            <div className="text-lg font-bold font-mono text-primary">{fmt(p.netSalary)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chi tiết các khoản</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Loại</TableHead>
                <TableHead className="w-24">Mã</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {earnings.map((it) => (
                <TableRow key={it.id}>
                  <TableCell><Badge variant="outline" className={ITEM_TYPE_COLOR[it.type]}>{ITEM_TYPE_LABEL[it.type]}</Badge></TableCell>
                  <TableCell className="font-mono">{it.code}</TableCell>
                  <TableCell>{it.name}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">+ {fmt(it.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-semibold bg-muted/30">
                <TableCell colSpan={3}>Tổng thu nhập</TableCell>
                <TableCell className="text-right font-mono text-emerald-600">+ {fmt(totalEarn)}</TableCell>
              </TableRow>
              {deductions.map((it) => (
                <TableRow key={it.id}>
                  <TableCell><Badge variant="outline" className={ITEM_TYPE_COLOR[it.type]}>{ITEM_TYPE_LABEL[it.type]}</Badge></TableCell>
                  <TableCell className="font-mono">{it.code}</TableCell>
                  <TableCell>{it.name}</TableCell>
                  <TableCell className="text-right font-mono text-red-600">− {fmt(it.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-semibold bg-muted/30">
                <TableCell colSpan={3}>Tổng khấu trừ</TableCell>
                <TableCell className="text-right font-mono text-red-600">− {fmt(totalDeduct)}</TableCell>
              </TableRow>
              <TableRow className="border-t-4 border-primary/50 text-base font-bold">
                <TableCell colSpan={3}>THỰC LĨNH</TableCell>
                <TableCell className="text-right font-mono text-primary">{fmt(p.netSalary)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Snapshot chi tiết (debug/audit) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Snapshot chi tiết (audit)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <div className="flex justify-between border-b py-1">
              <span className="text-muted-foreground">Lương cơ bản (full)</span>
              <span className="font-mono">{fmt(p.basicSalary)}</span>
            </div>
            <div className="flex justify-between border-b py-1">
              <span className="text-muted-foreground">Lương BHXH base</span>
              <span className="font-mono">{fmt(p.bhxhSalaryBase)}</span>
            </div>
            <div className="flex justify-between border-b py-1">
              <span className="text-muted-foreground">Phụ cấp chịu thuế</span>
              <span className="font-mono">{fmt(p.totalTaxableAllowance)}</span>
            </div>
            <div className="flex justify-between border-b py-1">
              <span className="text-muted-foreground">Phụ cấp miễn thuế</span>
              <span className="font-mono">{fmt(p.totalNonTaxableAllowance)}</span>
            </div>
            <div className="flex justify-between border-b py-1">
              <span className="text-muted-foreground">Giảm trừ bản thân</span>
              <span className="font-mono">{fmt(p.selfDeduction)}</span>
            </div>
            <div className="flex justify-between border-b py-1">
              <span className="text-muted-foreground">Giảm trừ NPT × {p.dependentCount}</span>
              <span className="font-mono">{fmt(Number(p.dependentDeduction) * p.dependentCount)}</span>
            </div>
            <div className="flex justify-between border-b py-1">
              <span className="text-muted-foreground">Thu nhập chịu thuế</span>
              <span className="font-mono">{fmt(p.taxableIncome)}</span>
            </div>
            {p.unlockCount > 0 && (
              <div className="flex justify-between border-b py-1">
                <span className="text-muted-foreground">Số lần unlock</span>
                <span className="font-mono text-orange-600">{p.unlockCount}</span>
              </div>
            )}
          </div>
          {p.finalizedAt && (
            <div className="mt-3 text-xs text-muted-foreground">
              Chốt bởi <span className="font-mono">{p.finalizer?.email}</span> lúc {new Date(p.finalizedAt).toLocaleString("vi-VN")}
            </div>
          )}
          {p.paidAt && (
            <div className="text-xs text-muted-foreground">
              Trả bởi <span className="font-mono">{p.payer?.email}</span> lúc {new Date(p.paidAt).toLocaleString("vi-VN")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
