import { create } from "zustand";
import { toast } from "sonner";
import { branchService } from "@/services/branchService";
import type { Branch, BranchPayload } from "@/types/org";

interface BranchState {
  items: Branch[];
  loading: boolean;
  fetch: () => Promise<void>;
  create: (payload: BranchPayload) => Promise<Branch | null>;
  update: (id: number, payload: BranchPayload) => Promise<Branch | null>;
  remove: (id: number) => Promise<boolean>;
}

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export const useBranchStore = create<BranchState>((set, get) => ({
  items: [],
  loading: false,

  fetch: async () => {
    try {
      set({ loading: true });
      const items = await branchService.list();
      set({ items });
    } catch (e) {
      toast.error(errorMessage(e, "Không lấy được danh sách chi nhánh"));
    } finally {
      set({ loading: false });
    }
  },

  create: async (payload) => {
    try {
      const item = await branchService.create(payload);
      set({ items: [item, ...get().items] });
      toast.success("Tạo chi nhánh thành công");
      return item;
    } catch (e) {
      toast.error(errorMessage(e, "Tạo chi nhánh thất bại"));
      return null;
    }
  },

  update: async (id, payload) => {
    try {
      const item = await branchService.update(id, payload);
      set({ items: get().items.map((b) => (b.id === id ? item : b)) });
      toast.success("Cập nhật chi nhánh thành công");
      return item;
    } catch (e) {
      toast.error(errorMessage(e, "Cập nhật chi nhánh thất bại"));
      return null;
    }
  },

  remove: async (id) => {
    try {
      await branchService.delete(id);
      set({ items: get().items.filter((b) => b.id !== id) });
      toast.success("Xóa chi nhánh thành công");
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Xóa chi nhánh thất bại"));
      return false;
    }
  },
}));
