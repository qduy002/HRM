import { create } from "zustand";
import { toast } from "sonner";
import { levelService } from "@/services/levelService";
import type { Level, LevelPayload } from "@/types/org";

interface LevelState {
  items: Level[];
  loading: boolean;
  fetch: () => Promise<void>;
  create: (payload: LevelPayload) => Promise<Level | null>;
  update: (id: number, payload: LevelPayload) => Promise<Level | null>;
  remove: (id: number) => Promise<boolean>;
}

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export const useLevelStore = create<LevelState>((set, get) => ({
  items: [],
  loading: false,

  fetch: async () => {
    try {
      set({ loading: true });
      const items = await levelService.list();
      set({ items });
    } catch (e) {
      toast.error(errorMessage(e, "Không lấy được danh sách cấp bậc"));
    } finally {
      set({ loading: false });
    }
  },

  create: async (payload) => {
    try {
      const item = await levelService.create(payload);
      set({ items: [...get().items, item].sort((a, b) => a.rank - b.rank) });
      toast.success("Tạo cấp bậc thành công");
      return item;
    } catch (e) {
      toast.error(errorMessage(e, "Tạo cấp bậc thất bại"));
      return null;
    }
  },

  update: async (id, payload) => {
    try {
      const item = await levelService.update(id, payload);
      set({
        items: get().items.map((l) => (l.id === id ? item : l)).sort((a, b) => a.rank - b.rank),
      });
      toast.success("Cập nhật cấp bậc thành công");
      return item;
    } catch (e) {
      toast.error(errorMessage(e, "Cập nhật cấp bậc thất bại"));
      return null;
    }
  },

  remove: async (id) => {
    try {
      await levelService.delete(id);
      set({ items: get().items.filter((l) => l.id !== id) });
      toast.success("Xóa cấp bậc thành công");
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Xóa cấp bậc thất bại"));
      return false;
    }
  },
}));
