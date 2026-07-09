import api from "@/lib/axios";
import type { Attendance, AttendanceStatus, TodayStatus } from "@/types/attendance";

export const attendanceService = {
  checkIn: async (): Promise<{ attendance: Attendance; message: string }> => {
    const res = await api.post("/attendances/check-in");
    return res.data;
  },
  checkOut: async (): Promise<{ attendance: Attendance; message: string }> => {
    const res = await api.post("/attendances/check-out");
    return res.data;
  },
  getToday: async (): Promise<TodayStatus> => {
    const res = await api.get("/attendances/today");
    return res.data;
  },
  listMe: async (month: string): Promise<Attendance[]> => {
    const res = await api.get("/attendances/me", { params: { month } });
    return res.data.attendances;
  },
  listAll: async (params: { month: string; employeeId?: number; status?: AttendanceStatus }): Promise<Attendance[]> => {
    const res = await api.get("/attendances", { params });
    return res.data.attendances;
  },
  markAbsent: async (date?: string): Promise<{ marked: number; message: string }> => {
    const res = await api.post("/attendances/mark-absent", null, { params: date ? { date } : {} });
    return res.data;
  },
  update: async (id: number, patch: Partial<Attendance>): Promise<Attendance> => {
    const res = await api.put(`/attendances/${id}`, patch);
    return res.data.attendance;
  },
};
