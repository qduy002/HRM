import api from "@/lib/axios";
import type { Department, DepartmentPayload } from "@/types/org";

export const departmentService = {
  list: async (): Promise<Department[]> => {
    const res = await api.get("/departments");
    return res.data.departments;
  },
  get: async (id: number): Promise<Department> => {
    const res = await api.get(`/departments/${id}`);
    return res.data.department;
  },
  create: async (payload: DepartmentPayload): Promise<Department> => {
    const res = await api.post("/departments", payload);
    return res.data.department;
  },
  update: async (id: number, payload: DepartmentPayload): Promise<Department> => {
    const res = await api.put(`/departments/${id}`, payload);
    return res.data.department;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },
};
