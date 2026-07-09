import api from "@/lib/axios";
import type { Shift, ShiftPayload } from "@/types/attendance";

export const shiftService = {
  list: async (): Promise<Shift[]> => {
    const res = await api.get("/shifts");
    return res.data.shifts;
  },
  create: async (payload: ShiftPayload): Promise<Shift> => {
    const res = await api.post("/shifts", payload);
    return res.data.shift;
  },
  update: async (id: number, payload: ShiftPayload): Promise<Shift> => {
    const res = await api.put(`/shifts/${id}`, payload);
    return res.data.shift;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/shifts/${id}`);
  },
};
