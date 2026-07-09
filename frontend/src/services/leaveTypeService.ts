import api from "@/lib/axios";
import type { LeaveType, LeaveTypePayload } from "@/types/leave";

export const leaveTypeService = {
  list: async (): Promise<LeaveType[]> => {
    const res = await api.get("/leave-types");
    return res.data.leaveTypes;
  },
  create: async (payload: LeaveTypePayload): Promise<LeaveType> => {
    const res = await api.post("/leave-types", payload);
    return res.data.leaveType;
  },
  update: async (id: number, payload: LeaveTypePayload): Promise<LeaveType> => {
    const res = await api.put(`/leave-types/${id}`, payload);
    return res.data.leaveType;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/leave-types/${id}`);
  },
  seedDefaults: async (): Promise<{ created: number; message: string }> => {
    const res = await api.post("/leave-types/seed-defaults");
    return res.data;
  },
};
