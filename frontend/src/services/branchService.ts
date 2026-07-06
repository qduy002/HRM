import api from "@/lib/axios";
import type { Branch, BranchPayload } from "@/types/org";

export const branchService = {
  list: async (): Promise<Branch[]> => {
    const res = await api.get("/branches");
    return res.data.branches;
  },
  get: async (id: number): Promise<Branch> => {
    const res = await api.get(`/branches/${id}`);
    return res.data.branch;
  },
  create: async (payload: BranchPayload): Promise<Branch> => {
    const res = await api.post("/branches", payload);
    return res.data.branch;
  },
  update: async (id: number, payload: BranchPayload): Promise<Branch> => {
    const res = await api.put(`/branches/${id}`, payload);
    return res.data.branch;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/branches/${id}`);
  },
};
