import api from "@/lib/axios";
import type { SignupTenantPayload } from "@/types/store";

export const authService = {
  signupTenant: async (data: SignupTenantPayload) => {
    const response = await api.post("/auth/signup-tenant", data, { withCredentials: true });
    return response.data;
  },

  signIn: async (email: string, password: string) => {
    const response = await api.post(
      "/auth/signin",
      { email, password },
      { withCredentials: true }
    );
    return response.data;
  },

  signOut: async () => {
    return await api.post("/auth/signout", {}, { withCredentials: true });
  },

  fetchMe: async () => {
    const response = await api.get("/users/me", { withCredentials: true });
    return response.data;
  },

  refreshToken: async () => {
    const response = await api.post("/auth/refresh", {}, { withCredentials: true });
    return response.data.accessToken;
  },
};
