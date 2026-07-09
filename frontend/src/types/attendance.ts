export type AttendanceStatus =
  | "on_time"
  | "late"
  | "early_leave"
  | "absent"
  | "on_leave"
  | "holiday";

export interface Shift {
  id: number;
  companyId: number;
  code: string;
  name: string;
  startTime: string; // "HH:MM:SS"
  endTime: string;
  breakMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ShiftPayload = Partial<Pick<Shift, "code" | "name" | "startTime" | "endTime" | "breakMinutes" | "isActive">>;

export interface WorkSchedule {
  id: number;
  companyId: number;
  employeeId: number;
  shiftId: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  Employee?: { id: number; code: string; displayName: string };
  Shift?: { id: number; code: string; name: string; startTime: string; endTime: string };
}

export interface WorkSchedulePayload {
  employeeId: number;
  shiftId: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  note?: string;
}

export interface Attendance {
  id: number;
  companyId: number;
  employeeId: number;
  date: string; // YYYY-MM-DD
  checkInAt?: string | null;
  checkOutAt?: string | null;
  hoursWorked: string; // decimal from BE
  otHours: string;
  status: AttendanceStatus;
  lateMinutes: number;
  earlyMinutes: number;
  checkInIp?: string | null;
  checkOutIp?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  Employee?: { id: number; code: string; displayName: string };
}

export interface TodayStatus {
  date: string;
  employee: { id: number; code: string; displayName: string };
  shift: { name: string; startTime: string; endTime: string; breakMinutes: number };
  attendance: Attendance | null;
}
