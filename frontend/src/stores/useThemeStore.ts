import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeState } from "@/types/store";

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: false,

      setTheme: (isDark) => {
        set({ isDark });
        if (isDark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },

      toggleTheme: () => {
        get().setTheme(!get().isDark);
      },
    }),
    { name: "theme-storage" }
  )
);
