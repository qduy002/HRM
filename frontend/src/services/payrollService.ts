import api from "@/lib/axios";
import type {
  Payroll,
  PayrollListFilter,
  PayrollPreviewPayload,
  PayrollPreviewResult,
  PayrollGenerateResult,
} from "@/types/payroll";

export const payrollService = {
  list: async (filter: PayrollListFilter = {}): Promise<Payroll[]> => {
    const res = await api.get("/payrolls", { params: filter });
    return res.data.payrolls;
  },

  get: async (id: number): Promise<Payroll> => {
    const res = await api.get(`/payrolls/${id}`);
    return res.data.payroll;
  },

  getMyPayslip: async (month?: number, year?: number): Promise<Payroll> => {
    const res = await api.get("/payrolls/my", { params: { month, year } });
    return res.data.payroll;
  },

  preview: async (payload: PayrollPreviewPayload): Promise<PayrollPreviewResult> => {
    const res = await api.post("/payrolls/preview", payload);
    return res.data;
  },

  generate: async (payload: { month: number; year: number; employeeIds?: number[] }): Promise<PayrollGenerateResult> => {
    const res = await api.post("/payrolls/generate", payload);
    return res.data;
  },

  finalize: async (id: number): Promise<Payroll> => {
    const res = await api.post(`/payrolls/${id}/finalize`);
    return res.data.payroll;
  },

  unlock: async (id: number): Promise<Payroll> => {
    const res = await api.post(`/payrolls/${id}/unlock`);
    return res.data.payroll;
  },

  markPaid: async (id: number): Promise<Payroll> => {
    const res = await api.post(`/payrolls/${id}/mark-paid`);
    return res.data.payroll;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/payrolls/${id}`);
  },

  exportCSV: async (month: number, year: number): Promise<Blob> => {
    const res = await api.get("/payrolls/export", {
      params: { month, year },
      responseType: "blob",
    });
    return res.data;
  },
};
