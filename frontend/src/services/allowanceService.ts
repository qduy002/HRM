import api from "@/lib/axios";
import type { Allowance, AllowancePayload } from "@/types/payroll";

export const allowanceService = {
  list: async (): Promise<Allowance[]> => {
    const res = await api.get("/allowances");
    return res.data.allowances;
  },
  create: async (payload: AllowancePayload): Promise<Allowance> => {
    const res = await api.post("/allowances", payload);
    return res.data.allowance;
  },
  update: async (id: number, payload: AllowancePayload): Promise<Allowance> => {
    const res = await api.put(`/allowances/${id}`, payload);
    return res.data.allowance;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/allowances/${id}`);
  },
};
