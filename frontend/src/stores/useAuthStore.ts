import { create } from "zustand";
import { toast } from "sonner";
import { persist } from "zustand/middleware";
import { authService } from "@/services/authService";
import type { AuthState } from "@/types/store";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      company: null,
      hasEmployee: false,
      loading: false,

      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      setCompany: (company) => set({ company }),

      clearState: () => {
        set({ accessToken: null, user: null, company: null, hasEmployee: false, loading: false });
        localStorage.clear();
        sessionStorage.clear();
      },

      signupTenant: async (data) => {
        try {
          get().clearState();
          set({ loading: true });
          const { accessToken } = await authService.signupTenant(data);
          set({ accessToken });
          await get().fetchMe();
          toast.success("Đăng ký tenant thành công!");
        } catch (error) {
          console.error(error);
          const msg =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            "Đăng ký tenant thất bại. Vui lòng thử lại.";
          toast.error(msg);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      signIn: async (email, password) => {
        try {
          get().clearState();
          set({ loading: true });
          const { accessToken } = await authService.signIn(email, password);
          set({ accessToken });
          await get().fetchMe();
          toast.success("Đăng nhập thành công!");
        } catch (error) {
          console.error(error);
          const msg =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            "Đăng nhập thất bại. Vui lòng thử lại.";
          toast.error(msg);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      signOut: async () => {
        try {
          get().clearState();
          await authService.signOut();
          toast.success("Đăng xuất thành công!");
        } catch (error) {
          console.error(error);
          toast.error("Đăng xuất thất bại. Vui lòng thử lại.");
        }
      },

      fetchMe: async () => {
        try {
          set({ loading: true });
          const { user, company, hasEmployee } = await authService.fetchMe();
          set({ user, company, hasEmployee: !!hasEmployee });
        } catch (error) {
          console.error(error);
          set({ user: null, company: null, hasEmployee: false, accessToken: null });
        } finally {
          set({ loading: false });
        }
      },

      refresh: async () => {
        try {
          set({ loading: true });
          const accessToken = await authService.refreshToken();
          set({ accessToken });
          await get().fetchMe();
        } catch (error) {
          console.error("Lỗi làm mới token:", error);
          get().clearState();
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user, company: state.company, hasEmployee: state.hasEmployee }),
    }
  )
);
