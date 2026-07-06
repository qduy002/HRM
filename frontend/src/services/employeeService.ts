import api from "@/lib/axios";
import type {
  Employee,
  EmployeePosition,
  EmployeeListResponse,
  EmployeeListFilter,
  EmployeeCreatePayload,
  EmployeeUpdatePayload,
  GrantAccountPayload,
  ChangePositionPayload,
} from "@/types/employee";

const buildParams = (filter: EmployeeListFilter): Record<string, string | number> => {
  const params: Record<string, string | number> = {};
  if (filter.search) params.search = filter.search;
  if (filter.branchId) params.branchId = filter.branchId;
  if (filter.departmentId) params.departmentId = filter.departmentId;
  if (filter.status) params.status = filter.status;
  if (filter.page) params.page = filter.page;
  if (filter.pageSize) params.pageSize = filter.pageSize;
  return params;
};

export const employeeService = {
  list: async (filter: EmployeeListFilter): Promise<EmployeeListResponse> => {
    const res = await api.get("/employees", { params: buildParams(filter) });
    return res.data;
  },

  get: async (id: number): Promise<Employee> => {
    const res = await api.get(`/employees/${id}`);
    return res.data.employee;
  },

  create: async (payload: EmployeeCreatePayload): Promise<Employee> => {
    const res = await api.post("/employees", payload);
    return res.data.employee;
  },

  update: async (id: number, payload: EmployeeUpdatePayload): Promise<Employee> => {
    const res = await api.put(`/employees/${id}`, payload);
    return res.data.employee;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },

  grantAccount: async (id: number, payload: GrantAccountPayload): Promise<{ user: { id: number; username: string; email: string; role: string } }> => {
    const res = await api.post(`/employees/${id}/grant-account`, payload);
    return res.data;
  },

  changePosition: async (id: number, payload: ChangePositionPayload): Promise<EmployeePosition> => {
    const res = await api.post(`/employees/${id}/change-position`, payload);
    return res.data.position;
  },

  listPositions: async (id: number): Promise<EmployeePosition[]> => {
    const res = await api.get(`/employees/${id}/positions`);
    return res.data.positions;
  },
};
