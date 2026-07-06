import api from "@/lib/axios";
import type { EmergencyContact, EmergencyContactPayload } from "@/types/employee";

export const emergencyContactService = {
  list: async (employeeId: number): Promise<EmergencyContact[]> => {
    const res = await api.get(`/employees/${employeeId}/emergency-contacts`);
    return res.data.emergencyContacts;
  },
  create: async (employeeId: number, payload: EmergencyContactPayload): Promise<EmergencyContact> => {
    const res = await api.post(`/employees/${employeeId}/emergency-contacts`, payload);
    return res.data.emergencyContact;
  },
  update: async (employeeId: number, id: number, payload: Partial<EmergencyContactPayload>): Promise<EmergencyContact> => {
    const res = await api.put(`/employees/${employeeId}/emergency-contacts/${id}`, payload);
    return res.data.emergencyContact;
  },
  delete: async (employeeId: number, id: number): Promise<void> => {
    await api.delete(`/employees/${employeeId}/emergency-contacts/${id}`);
  },
};
