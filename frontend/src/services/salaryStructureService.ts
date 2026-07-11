import api from "@/lib/axios";
import type { SalaryStructure, SalaryStructurePayload } from "@/types/payroll";

export const salaryStructureService = {
  list: async (employeeId?: number): Promise<SalaryStructure[]> => {
    const res = await api.get("/salary-structures", { params: { employeeId } });
    return res.data.salaryStructures;
  },
  getCurrent: async (employeeId: number): Promise<SalaryStructure | null> => {
    const res = await api.get("/salary-structures/current", { params: { employeeId } });
    return res.data.salary;
  },
  create: async (payload: SalaryStructurePayload): Promise<SalaryStructure> => {
    const res = await api.post("/salary-structures", payload);
    return res.data.salary;
  },
  update: async (id: number, payload: Partial<SalaryStructurePayload>): Promise<SalaryStructure> => {
    const res = await api.put(`/salary-structures/${id}`, payload);
    return res.data.salary;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/salary-structures/${id}`);
  },
};
