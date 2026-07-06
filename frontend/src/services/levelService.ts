import api from "@/lib/axios";
import type { Level, LevelPayload } from "@/types/org";

export const levelService = {
  list: async (): Promise<Level[]> => {
    const res = await api.get("/levels");
    return res.data.levels;
  },
  get: async (id: number): Promise<Level> => {
    const res = await api.get(`/levels/${id}`);
    return res.data.level;
  },
  create: async (payload: LevelPayload): Promise<Level> => {
    const res = await api.post("/levels", payload);
    return res.data.level;
  },
  update: async (id: number, payload: LevelPayload): Promise<Level> => {
    const res = await api.put(`/levels/${id}`, payload);
    return res.data.level;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/levels/${id}`);
  },
};
