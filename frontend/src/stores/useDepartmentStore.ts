import { create } from "zustand";
import { toast } from "sonner";
import { departmentService } from "@/services/departmentService";
import type { Department, DepartmentPayload } from "@/types/org";

interface DepartmentState {
  items: Department[];
  loading: boolean;
  fetch: () => Promise<void>;
  create: (payload: DepartmentPayload) => Promise<Department | null>;
  update: (id: number, payload: DepartmentPayload) => Promise<Department | null>;
  remove: (id: number) => Promise<boolean>;
}

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export const useDepartmentStore = create<DepartmentState>((set, get) => ({
  items: [],
  loading: false,

  fetch: async () => {
    try {
      set({ loading: true });
      const items = await departmentService.list();
      set({ items });
    } catch (e) {
      toast.error(errorMessage(e, "Không lấy được danh sách phòng ban"));
    } finally {
      set({ loading: false });
    }
  },

  create: async (payload) => {
    try {
      const item = await departmentService.create(payload);
      set({ items: [item, ...get().items] });
      toast.success("Tạo phòng ban thành công");
      return item;
    } catch (e) {
      toast.error(errorMessage(e, "Tạo phòng ban thất bại"));
      return null;
    }
  },

  update: async (id, payload) => {
    try {
      const item = await departmentService.update(id, payload);
      set({ items: get().items.map((d) => (d.id === id ? item : d)) });
      toast.success("Cập nhật phòng ban thành công");
      return item;
    } catch (e) {
      toast.error(errorMessage(e, "Cập nhật phòng ban thất bại"));
      return null;
    }
  },

  remove: async (id) => {
    try {
      await departmentService.delete(id);
      set({ items: get().items.filter((d) => d.id !== id) });
      toast.success("Xóa phòng ban thành công");
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Xóa phòng ban thất bại"));
      return false;
    }
  },
}));
