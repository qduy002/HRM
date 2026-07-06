import { create } from "zustand";
import { toast } from "sonner";
import { positionService } from "@/services/positionService";
import type { Position, PositionPayload } from "@/types/org";

interface PositionState {
  items: Position[];
  loading: boolean;
  fetch: () => Promise<void>;
  create: (payload: PositionPayload) => Promise<Position | null>;
  update: (id: number, payload: PositionPayload) => Promise<Position | null>;
  remove: (id: number) => Promise<boolean>;
}

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export const usePositionStore = create<PositionState>((set, get) => ({
  items: [],
  loading: false,

  fetch: async () => {
    try {
      set({ loading: true });
      const items = await positionService.list();
      set({ items });
    } catch (e) {
      toast.error(errorMessage(e, "Không lấy được danh sách chức danh"));
    } finally {
      set({ loading: false });
    }
  },

  create: async (payload) => {
    try {
      const item = await positionService.create(payload);
      set({ items: [item, ...get().items] });
      toast.success("Tạo chức danh thành công");
      return item;
    } catch (e) {
      toast.error(errorMessage(e, "Tạo chức danh thất bại"));
      return null;
    }
  },

  update: async (id, payload) => {
    try {
      const item = await positionService.update(id, payload);
      set({ items: get().items.map((p) => (p.id === id ? item : p)) });
      toast.success("Cập nhật chức danh thành công");
      return item;
    } catch (e) {
      toast.error(errorMessage(e, "Cập nhật chức danh thất bại"));
      return null;
    }
  },

  remove: async (id) => {
    try {
      await positionService.delete(id);
      set({ items: get().items.filter((p) => p.id !== id) });
      toast.success("Xóa chức danh thành công");
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Xóa chức danh thất bại"));
      return false;
    }
  },
}));
