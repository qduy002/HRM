import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, ScrollText, HandCoins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { payrollRefService } from "@/services/payrollRefService";
import type { InsuranceRate, PersonalDeductionRate, TaxBracket } from "@/types/payroll";

const fmt = (n: string | number | null | undefined) =>
  n == null || n === "" ? "—" : Number(n).toLocaleString("vi-VN") + " ₫";

const pct = (n: string | number | null | undefined) =>
  n == null || n === "" ? "—" : Number(n).toFixed(2) + "%";

const PayrollReferencesPage = () => {
  const [insurance, setInsurance] = useState<InsuranceRate | null>(null);
  const [brackets, setBrackets] = useState<TaxBracket[]>([]);
  const [pd, setPd] = useState<PersonalDeductionRate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [ins, br, dedu] = await Promise.all([
          payrollRefService.getCurrentInsuranceRate().catch(() => null),
          payrollRefService.getCurrentTaxBrackets().catch(() => []),
          payrollRefService.getCurrentPersonalDeduction().catch(() => null),
        ]);
        setInsurance(ins);
        setBrackets(br);
        setPd(dedu);
        if (!ins || br.length === 0 || !dedu) {
          toast.warning("Thiếu dữ liệu tham chiếu. Chạy: npm run seed:payroll-refs");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cap = insurance ? Number(insurance.minRegion1Wage) * insurance.salaryBaseCapMultiplier : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tham chiếu thuế & bảo hiểm</h1>
        <p className="text-muted-foreground text-sm">
          Dữ liệu chuẩn Việt Nam (NĐ 74/2024/NĐ-CP, NQ 954/2020, Luật thuế TNCN). Chỉ đọc — cập nhật bằng seed script.
        </p>
      </div>

      {/* Insurance */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Bảo hiểm bắt buộc (BHXH / BHYT / BHTN)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Đang tải...</div>
          ) : !insurance ? (
            <div className="text-sm text-destructive">Chưa có dữ liệu insurance rates</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Tỷ lệ đóng</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loại</TableHead>
                      <TableHead>Nhân viên đóng</TableHead>
                      <TableHead>Công ty đóng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">BHXH</TableCell>
                      <TableCell className="font-mono">{pct(insurance.bhxhEmployee)}</TableCell>
                      <TableCell className="font-mono">{pct(insurance.bhxhCompany)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">BHYT</TableCell>
                      <TableCell className="font-mono">{pct(insurance.bhytEmployee)}</TableCell>
                      <TableCell className="font-mono">{pct(insurance.bhytCompany)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">BHTN</TableCell>
                      <TableCell className="font-mono">{pct(insurance.bhtnEmployee)}</TableCell>
                      <TableCell className="font-mono">{pct(insurance.bhtnCompany)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Lương tối thiểu vùng (VND)</h3>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Vùng</TableHead><TableHead>Mức</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>Vùng 1</TableCell><TableCell className="font-mono">{fmt(insurance.minRegion1Wage)}</TableCell></TableRow>
                    <TableRow><TableCell>Vùng 2</TableCell><TableCell className="font-mono">{fmt(insurance.minRegion2Wage)}</TableCell></TableRow>
                    <TableRow><TableCell>Vùng 3</TableCell><TableCell className="font-mono">{fmt(insurance.minRegion3Wage)}</TableCell></TableRow>
                    <TableRow><TableCell>Vùng 4</TableCell><TableCell className="font-mono">{fmt(insurance.minRegion4Wage)}</TableCell></TableRow>
                  </TableBody>
                </Table>
                <div className="text-sm rounded-md border bg-muted/40 p-3">
                  <div className="font-medium">Trần đóng BHXH</div>
                  <div className="text-muted-foreground">
                    Lương tối thiểu vùng 1 × {insurance.salaryBaseCapMultiplier}
                    <span className="mx-1">=</span>
                    <span className="font-mono text-foreground">{fmt(cap)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax brackets */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <ScrollText className="h-5 w-5 text-primary" />
          <CardTitle>Bậc thuế TNCN (7 bậc luỹ tiến)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Đang tải...</div>
          ) : brackets.length === 0 ? (
            <div className="text-sm text-destructive">Chưa có bậc thuế</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bậc</TableHead>
                  <TableHead>Thu nhập chịu thuế / tháng (từ)</TableHead>
                  <TableHead>Đến</TableHead>
                  <TableHead>Thuế suất</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brackets.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell><Badge variant="outline">Bậc {b.bracketNumber}</Badge></TableCell>
                    <TableCell className="font-mono">{fmt(b.fromAmount)}</TableCell>
                    <TableCell className="font-mono">
                      {b.toAmount != null ? fmt(b.toAmount) : <span className="text-muted-foreground">Không giới hạn</span>}
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{pct(b.rate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Personal deduction */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <HandCoins className="h-5 w-5 text-primary" />
          <CardTitle>Giảm trừ gia cảnh</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Đang tải...</div>
          ) : !pd ? (
            <div className="text-sm text-destructive">Chưa có dữ liệu</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border p-4">
                <div className="text-sm text-muted-foreground">Bản thân người nộp thuế</div>
                <div className="text-2xl font-bold font-mono mt-1">{fmt(pd.selfDeduction)}</div>
                <div className="text-xs text-muted-foreground mt-1">Áp dụng cho tất cả NV có thu nhập chịu thuế</div>
              </div>
              <div className="rounded-md border p-4">
                <div className="text-sm text-muted-foreground">Mỗi người phụ thuộc</div>
                <div className="text-2xl font-bold font-mono mt-1">{fmt(pd.dependentDeduction)}</div>
                <div className="text-xs text-muted-foreground mt-1">Cần đăng ký người phụ thuộc trong hồ sơ NV</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollReferencesPage;
