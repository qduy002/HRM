import api from "@/lib/axios";
import type { EmployeeEducation, EducationPayload } from "@/types/employee";

export const educationService = {
  list: async (employeeId: number): Promise<EmployeeEducation[]> => {
    const res = await api.get(`/employees/${employeeId}/educations`);
    return res.data.educations;
  },
  create: async (employeeId: number, payload: EducationPayload): Promise<EmployeeEducation> => {
    const res = await api.post(`/employees/${employeeId}/educations`, payload);
    return res.data.education;
  },
  update: async (employeeId: number, id: number, payload: Partial<EducationPayload>): Promise<EmployeeEducation> => {
    const res = await api.put(`/employees/${employeeId}/educations/${id}`, payload);
    return res.data.education;
  },
  delete: async (employeeId: number, id: number): Promise<void> => {
    await api.delete(`/employees/${employeeId}/educations/${id}`);
  },
};
