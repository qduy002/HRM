import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar, Clock, LogIn, LogOut, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { attendanceService } from "@/services/attendanceService";
import type { Attendance, AttendanceStatus, TodayStatus } from "@/types/attendance";

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  on_time: "Đúng giờ",
  late: "Đi trễ",
  early_leave: "Về sớm",
  absent: "Vắng mặt",
  on_leave: "Nghỉ phép",
  holiday: "Ngày lễ",
};

const STATUS_VARIANT: Record<AttendanceStatus, "success" | "warning" | "destructive" | "outline"> = {
  on_time: "success",
  late: "warning",
  early_leave: "warning",
  absent: "destructive",
  on_leave: "outline",
  holiday: "outline",
};

const formatTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

const formatDate = (yyyymmdd: string) => new Date(yyyymmdd).toLocaleDateString("vi-VN");

const getMonthOptions = () => {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value, label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}` });
  }
  return options;
};

const MyAttendancePage = () => {
  const [today, setToday] = useState<TodayStatus | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [month, setMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadToday = useCallback(async () => {
    try {
      setLoadingToday(true);
      setToday(await attendanceService.getToday());
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Không tải được trạng thái hôm nay");
    } finally {
      setLoadingToday(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      setHistory(await attendanceService.listMe(month));
    } finally {
      setLoadingHistory(false);
    }
  }, [month]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleCheckIn = async () => {
    try {
      setProcessing(true);
      const res = await attendanceService.checkIn();
      toast.success(res.message);
      await Promise.all([loadToday(), loadHistory()]);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Check-in thất bại");
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setProcessing(true);
      const res = await attendanceService.checkOut();
      toast.success(res.message);
      await Promise.all([loadToday(), loadHistory()]);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Check-out thất bại");
    } finally {
      setProcessing(false);
    }
  };

  const att = today?.attendance;
  const hasCheckedIn = !!att?.checkInAt;
  const hasCheckedOut = !!att?.checkOutAt;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chấm công của tôi</h1>
        <p className="text-muted-foreground text-sm">
          Check-in đầu ca, check-out cuối ca. Hệ thống tự tính giờ làm và OT.
        </p>
      </div>

      {/* Today card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Hôm nay {today && `— ${new Date(today.date).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingToday ? (
            <p className="text-muted-foreground">Đang tải...</p>
          ) : today ? (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Shift info */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Ca làm việc</p>
                <p className="font-medium">{today.shift.name}</p>
                <p className="text-sm text-muted-foreground">
                  {today.shift.startTime.slice(0, 5)} – {today.shift.endTime.slice(0, 5)}
                </p>
                <p className="text-xs text-muted-foreground">Nghỉ trưa: {today.shift.breakMinutes} phút</p>
              </div>

              {/* Times */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Check-in</p>
                  <p className="font-mono text-lg">{formatTime(att?.checkInAt)}</p>
                  {att && att.lateMinutes > 0 && (
                    <Badge variant="warning" className="mt-1">
                      Trễ {att.lateMinutes} phút
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Check-out</p>
                  <p className="font-mono text-lg">{formatTime(att?.checkOutAt)}</p>
                  {att && att.earlyMinutes > 0 && (
                    <Badge variant="warning" className="mt-1">
                      Về sớm {att.earlyMinutes} phút
                    </Badge>
                  )}
                </div>
              </div>

              {/* Metrics + action button */}
              <div className="space-y-3">
                {att && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Thời gian làm</p>
                    <p className="font-mono text-lg">{att.hoursWorked} giờ</p>
                    {Number(att.otHours) > 0 && (
                      <Badge variant="success" className="mt-1">
                        <TimerReset className="h-3 w-3" /> OT {att.otHours}h
                      </Badge>
                    )}
                  </div>
                )}

                {!hasCheckedIn && (
                  <Button size="lg" className="w-full" onClick={handleCheckIn} disabled={processing}>
                    <LogIn className="h-4 w-4" />
                    {processing ? "Đang xử lý..." : "Check-in"}
                  </Button>
                )}
                {hasCheckedIn && !hasCheckedOut && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                    onClick={handleCheckOut}
                    disabled={processing}
                  >
                    <LogOut className="h-4 w-4" />
                    {processing ? "Đang xử lý..." : "Check-out"}
                  </Button>
                )}
                {hasCheckedIn && hasCheckedOut && (
                  <div className="text-center py-3 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      ✓ Đã hoàn thành hôm nay
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Month history */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lịch sử chấm công</h2>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          {getMonthOptions().map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border bg-background">
        {!loadingHistory && history.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Chưa có bản ghi chấm công tháng này"
            description="Bắt đầu bằng cách check-in mỗi ngày làm việc."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Giờ làm</TableHead>
                <TableHead>OT</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            {loadingHistory ? (
              <TableSkeleton cols={7} />
            ) : (
              <TableBody>
                {history.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{formatDate(a.date)}</TableCell>
                    <TableCell className="font-mono text-sm">{formatTime(a.checkInAt)}</TableCell>
                    <TableCell className="font-mono text-sm">{formatTime(a.checkOutAt)}</TableCell>
                    <TableCell className="font-mono">{a.hoursWorked}</TableCell>
                    <TableCell className="font-mono">{Number(a.otHours) > 0 ? a.otHours : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {a.note || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        )}
      </div>
    </div>
  );
};

export default MyAttendancePage;
