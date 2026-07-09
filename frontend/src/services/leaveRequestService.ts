import api from "@/lib/axios";
import type { LeaveRequest, LeaveRequestPayload, LeaveRequestStatus } from "@/types/leave";

export const leaveRequestService = {
  listMe: async (status?: LeaveRequestStatus): Promise<LeaveRequest[]> => {
    const res = await api.get("/leave-requests/me", { params: status ? { status } : {} });
    return res.data.requests;
  },
  listPendingApproval: async (): Promise<{ requests: LeaveRequest[]; stage: "manager" | "hr" | "all" }> => {
    const res = await api.get("/leave-requests/pending-approval");
    return res.data;
  },
  listAll: async (params: { employeeId?: number; status?: LeaveRequestStatus; year?: number }): Promise<LeaveRequest[]> => {
    const res = await api.get("/leave-requests", { params });
    return res.data.requests;
  },
  create: async (payload: LeaveRequestPayload): Promise<LeaveRequest> => {
    const res = await api.post("/leave-requests", payload);
    return res.data.request;
  },
  managerApprove: async (id: number, note?: string): Promise<LeaveRequest> => {
    const res = await api.post(`/leave-requests/${id}/manager-approve`, { note });
    return res.data.request;
  },
  hrApprove: async (id: number, note?: string): Promise<LeaveRequest> => {
    const res = await api.post(`/leave-requests/${id}/hr-approve`, { note });
    return res.data.request;
  },
  directApprove: async (id: number, note?: string): Promise<LeaveRequest> => {
    const res = await api.post(`/leave-requests/${id}/direct-approve`, { note });
    return res.data.request;
  },
  reject: async (id: number, reason: string): Promise<LeaveRequest> => {
    const res = await api.post(`/leave-requests/${id}/reject`, { reason });
    return res.data.request;
  },
  cancel: async (id: number): Promise<LeaveRequest> => {
    const res = await api.post(`/leave-requests/${id}/cancel`);
    return res.data.request;
  },
};
