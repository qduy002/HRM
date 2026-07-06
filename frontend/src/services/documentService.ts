import api from "@/lib/axios";
import type { EmployeeDocument, DocumentPayload } from "@/types/employee";

export const documentService = {
  list: async (employeeId: number): Promise<EmployeeDocument[]> => {
    const res = await api.get(`/employees/${employeeId}/documents`);
    return res.data.documents;
  },
  create: async (employeeId: number, payload: DocumentPayload): Promise<EmployeeDocument> => {
    const res = await api.post(`/employees/${employeeId}/documents`, payload);
    return res.data.document;
  },
  update: async (employeeId: number, id: number, payload: Partial<DocumentPayload>): Promise<EmployeeDocument> => {
    const res = await api.put(`/employees/${employeeId}/documents/${id}`, payload);
    return res.data.document;
  },
  delete: async (employeeId: number, id: number): Promise<void> => {
    await api.delete(`/employees/${employeeId}/documents/${id}`);
  },
};
