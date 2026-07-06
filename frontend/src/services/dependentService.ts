import api from "@/lib/axios";
import type { EmployeeDependent, DependentPayload } from "@/types/employee";

export const dependentService = {
  list: async (employeeId: number): Promise<EmployeeDependent[]> => {
    const res = await api.get(`/employees/${employeeId}/dependents`);
    return res.data.dependents;
  },
  create: async (employeeId: number, payload: DependentPayload): Promise<EmployeeDependent> => {
    const res = await api.post(`/employees/${employeeId}/dependents`, payload);
    return res.data.dependent;
  },
  update: async (employeeId: number, id: number, payload: Partial<DependentPayload>): Promise<EmployeeDependent> => {
    const res = await api.put(`/employees/${employeeId}/dependents/${id}`, payload);
    return res.data.dependent;
  },
  delete: async (employeeId: number, id: number): Promise<void> => {
    await api.delete(`/employees/${employeeId}/dependents/${id}`);
  },
};
