import api from "@/lib/axios";
import type { EmployeeExperience, ExperiencePayload } from "@/types/employee";

export const experienceService = {
  list: async (employeeId: number): Promise<EmployeeExperience[]> => {
    const res = await api.get(`/employees/${employeeId}/experiences`);
    return res.data.experiences;
  },
  create: async (employeeId: number, payload: ExperiencePayload): Promise<EmployeeExperience> => {
    const res = await api.post(`/employees/${employeeId}/experiences`, payload);
    return res.data.experience;
  },
  update: async (employeeId: number, id: number, payload: Partial<ExperiencePayload>): Promise<EmployeeExperience> => {
    const res = await api.put(`/employees/${employeeId}/experiences/${id}`, payload);
    return res.data.experience;
  },
  delete: async (employeeId: number, id: number): Promise<void> => {
    await api.delete(`/employees/${employeeId}/experiences/${id}`);
  },
};
