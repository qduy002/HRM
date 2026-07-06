import { create } from "zustand";
import { toast } from "sonner";
import { employeeService } from "@/services/employeeService";
import type {
  Employee,
  EmployeeCreatePayload,
  EmployeeUpdatePayload,
  EmployeeListFilter,
} from "@/types/employee";

interface EmployeeState {
  items: Employee[];
  total: number;
  loading: boolean;
  filter: EmployeeListFilter;

  fetch: (nextFilter?: EmployeeListFilter) => Promise<void>;
  setFilter: (patch: Partial<EmployeeListFilter>) => void;
  create: (payload: EmployeeCreatePayload) => Promise<Employee | null>;
  update: (id: number, payload: EmployeeUpdatePayload) => Promise<Employee | null>;
  remove: (id: number) => Promise<boolean>;
}

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const DEFAULT_FILTER: EmployeeListFilter = { page: 1, pageSize: 20 };

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  items: [],
  total: 0,
  loading: false,
  filter: DEFAULT_FILTER,

  fetch: async (nextFilter) => {
    try {
      set({ loading: true });
      const filter = nextFilter ?? get().filter;
      const res = await employeeService.list(filter);
      set({
        items: res.employees,
        total: res.pagination.total,
        filter,
      });
    } catch (e) {
      toast.error(errorMessage(e, "Không lấy được danh sách nhân viên"));
    } finally {
      set({ loading: false });
    }
  },

  setFilter: (patch) => {
    const filter = { ...get().filter, ...patch };
    // Reset page về 1 nếu đổi filter khác (ngoại trừ pageSize/page)
    if ("search" in patch || "branchId" in patch || "departmentId" in patch || "status" in patch) {
      filter.page = 1;
    }
    set({ filter });
    get().fetch(filter);
  },

  create: async (payload) => {
    try {
      const emp = await employeeService.create(payload);
      toast.success(`Tạo nhân viên thành công (mã ${emp.code})`);
      await get().fetch();
      return emp;
    } catch (e) {
      toast.error(errorMessage(e, "Tạo nhân viên thất bại"));
      return null;
    }
  },

  update: async (id, payload) => {
    try {
      const emp = await employeeService.update(id, payload);
      toast.success("Cập nhật nhân viên thành công");
      set({ items: get().items.map((x) => (x.id === id ? { ...x, ...emp } : x)) });
      return emp;
    } catch (e) {
      toast.error(errorMessage(e, "Cập nhật nhân viên thất bại"));
      return null;
    }
  },

  remove: async (id) => {
    try {
      await employeeService.delete(id);
      toast.success("Xóa nhân viên thành công");
      set({
        items: get().items.filter((x) => x.id !== id),
        total: Math.max(0, get().total - 1),
      });
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Xóa nhân viên thất bại"));
      return false;
    }
  },
}));
