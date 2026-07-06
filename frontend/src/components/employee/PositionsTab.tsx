import { useEffect, useState } from "react";
import { ArrowRightLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ChangePositionDialog } from "./ChangePositionDialog";
import { employeeService } from "@/services/employeeService";
import type { EmployeePosition } from "@/types/employee";

interface Props {
  employeeId: number;
}

const formatDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("vi-VN") : "—");

export const PositionsTab = ({ employeeId }: Props) => {
  const [positions, setPositions] = useState<EmployeePosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const items = await employeeService.listPositions(employeeId);
      setPositions(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const showEmpty = !loading && positions.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Lịch sử vị trí</h3>
          <p className="text-sm text-muted-foreground">
            Chuyển phòng, thăng chức được ghi lại đầy đủ theo thời gian.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <ArrowRightLeft className="h-4 w-4" />
          Đổi vị trí
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        {showEmpty ? (
          <EmptyState
            icon={Clock}
            title="Chưa có lịch sử vị trí"
            description="Bấm 'Đổi vị trí' để ghi nhận vị trí công tác."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Từ ngày</TableHead>
                <TableHead>Đến ngày</TableHead>
                <TableHead>Chi nhánh</TableHead>
                <TableHead>Phòng ban</TableHead>
                <TableHead>Chức danh</TableHead>
                <TableHead>Cấp bậc</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            {loading ? (
              <TableSkeleton cols={7} />
            ) : (
              <TableBody>
                {positions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.effectiveFrom)}</TableCell>
                    <TableCell>
                      {p.effectiveTo ? (
                        formatDate(p.effectiveTo)
                      ) : (
                        <Badge variant="success">Hiện tại</Badge>
                      )}
                    </TableCell>
                    <TableCell>{p.Branch?.name ?? "—"}</TableCell>
                    <TableCell>{p.Department?.name ?? "—"}</TableCell>
                    <TableCell>{p.Position?.name ?? "—"}</TableCell>
                    <TableCell>{p.Level?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {p.note ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        )}
      </div>

      <ChangePositionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employeeId={employeeId}
        onChanged={load}
      />
    </div>
  );
};
