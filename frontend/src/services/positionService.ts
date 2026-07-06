import api from "@/lib/axios";
import type { Position, PositionPayload } from "@/types/org";

export const positionService = {
  list: async (): Promise<Position[]> => {
    const res = await api.get("/positions");
    return res.data.positions;
  },
  get: async (id: number): Promise<Position> => {
    const res = await api.get(`/positions/${id}`);
    return res.data.position;
  },
  create: async (payload: PositionPayload): Promise<Position> => {
    const res = await api.post("/positions", payload);
    return res.data.position;
  },
  update: async (id: number, payload: PositionPayload): Promise<Position> => {
    const res = await api.put(`/positions/${id}`, payload);
    return res.data.position;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/positions/${id}`);
  },
};
