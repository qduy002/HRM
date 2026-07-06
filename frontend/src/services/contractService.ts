import api from "@/lib/axios";
import type { Contract, ContractPayload } from "@/types/employee";

export const contractService = {
  list: async (employeeId: number): Promise<Contract[]> => {
    const res = await api.get(`/employees/${employeeId}/contracts`);
    return res.data.contracts;
  },
  create: async (employeeId: number, payload: ContractPayload): Promise<Contract> => {
    const res = await api.post(`/employees/${employeeId}/contracts`, payload);
    return res.data.contract;
  },
  update: async (employeeId: number, contractId: number, payload: Partial<ContractPayload>): Promise<Contract> => {
    const res = await api.put(`/employees/${employeeId}/contracts/${contractId}`, payload);
    return res.data.contract;
  },
  delete: async (employeeId: number, contractId: number): Promise<void> => {
    await api.delete(`/employees/${employeeId}/contracts/${contractId}`);
  },
};
