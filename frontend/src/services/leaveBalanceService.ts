import api from "@/lib/axios";
import type { HrLeaveBalanceRow, LeaveBalance } from "@/types/leave";

export const leaveBalanceService = {
  listMe: async (year?: number): Promise<{ year: number; balances: LeaveBalance[] }> => {
    const res = await api.get("/leave-balances/me", { params: year ? { year } : {} });
    return res.data;
  },
  listAll: async (params: { year?: number; employeeId?: number }): Promise<{ year: number; balances: HrLeaveBalanceRow[] }> => {
    const res = await api.get("/leave-balances", { params });
    return res.data;
  },
  create: async (payload: {
    employeeId: number;
    leaveTypeId: number;
    year: number;
    allocatedDays?: number;
    carriedOverDays?: number;
  }): Promise<HrLeaveBalanceRow> => {
    const res = await api.post("/leave-balances", payload);
    return res.data.balance;
  },
  update: async (
    id: number,
    payload: { allocatedDays?: number; usedDays?: number; carriedOverDays?: number }
  ): Promise<HrLeaveBalanceRow> => {
    const res = await api.put(`/leave-balances/${id}`, payload);
    return res.data.balance;
  },
};
