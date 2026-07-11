import api from "@/lib/axios";
import type { EmployeeAllowance, EmployeeAllowancePayload } from "@/types/payroll";

export const employeeAllowanceService = {
  list: async (employeeId?: number): Promise<EmployeeAllowance[]> => {
    const res = await api.get("/employee-allowances", { params: { employeeId } });
    return res.data.employeeAllowances;
  },
  getCurrent: async (employeeId: number): Promise<EmployeeAllowance[]> => {
    const res = await api.get("/employee-allowances/current", { params: { employeeId } });
    return res.data.employeeAllowances;
  },
  create: async (payload: EmployeeAllowancePayload): Promise<EmployeeAllowance> => {
    const res = await api.post("/employee-allowances", payload);
    return res.data.employeeAllowance;
  },
  update: async (id: number, payload: Partial<EmployeeAllowancePayload>): Promise<EmployeeAllowance> => {
    const res = await api.put(`/employee-allowances/${id}`, payload);
    return res.data.employeeAllowance;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/employee-allowances/${id}`);
  },
};
