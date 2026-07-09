export type LeaveRequestStatus =
  | "pending"
  | "manager_approved"
  | "approved"
  | "rejected"
  | "cancelled";

export type HalfDayOption = "morning" | "afternoon";

export interface LeaveType {
  id: number;
  companyId: number;
  code: string;
  name: string;
  daysPerYear: string | null;
  isPaid: boolean;
  requiresApproval: boolean;
  color?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LeaveTypePayload = Partial<
  Pick<LeaveType, "code" | "name" | "daysPerYear" | "isPaid" | "requiresApproval" | "color" | "isActive">
>;

export interface LeaveBalance {
  id?: number;
  companyId?: number;
  employeeId?: number;
  leaveTypeId: number;
  code: string;
  name: string;
  color?: string | null;
  isPaid?: boolean;
  daysPerYear?: string | null;
  year: number;
  allocatedDays: number;
  usedDays: number;
  carriedOverDays: number;
  remainingDays: number;
}

export interface HrLeaveBalanceRow {
  id: number;
  companyId: number;
  employeeId: number;
  leaveTypeId: number;
  year: number;
  allocatedDays: string;
  usedDays: string;
  carriedOverDays: string;
  Employee?: { id: number; code: string; displayName: string };
  LeaveType?: { id: number; code: string; name: string; color?: string | null };
}

export interface LeaveRequest {
  id: number;
  companyId: number;
  employeeId: number;
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  halfDay?: HalfDayOption | null;
  days: string;
  reason: string;
  status: LeaveRequestStatus;
  createdBy: number;
  managerApprovedBy?: number | null;
  managerApprovedAt?: string | null;
  managerNote?: string | null;
  hrApprovedBy?: number | null;
  hrApprovedAt?: string | null;
  hrNote?: string | null;
  rejectedBy?: number | null;
  rejectedAt?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
  updatedAt: string;
  Employee?: { id: number; code: string; displayName: string };
  LeaveType?: { id: number; code: string; name: string; color?: string | null; isPaid?: boolean };
  creator?: { id: number; username: string; email: string };
  managerApprover?: { id: number; username: string; email: string } | null;
  hrApprover?: { id: number; username: string; email: string } | null;
  rejecter?: { id: number; username: string; email: string } | null;
}

export interface LeaveRequestPayload {
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  halfDay?: HalfDayOption | null;
  reason: string;
}
