import api from "@/lib/axios";
import type { WorkSchedule, WorkSchedulePayload } from "@/types/attendance";

export const workScheduleService = {
  list: async (employeeId?: number): Promise<WorkSchedule[]> => {
    const res = await api.get("/work-schedules", { params: employeeId ? { employeeId } : {} });
    return res.data.workSchedules;
  },
  create: async (payload: WorkSchedulePayload): Promise<WorkSchedule> => {
    const res = await api.post("/work-schedules", payload);
    return res.data.workSchedule;
  },
  update: async (id: number, payload: Partial<WorkSchedulePayload>): Promise<WorkSchedule> => {
    const res = await api.put(`/work-schedules/${id}`, payload);
    return res.data.workSchedule;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/work-schedules/${id}`);
  },
};
