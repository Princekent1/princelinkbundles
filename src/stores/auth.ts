import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TokenPayload } from "@/lib/jwt";

type AuthStore = {
  user: TokenPayload | null;
  setUser: (user: TokenPayload) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: "auth",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    }
  )
);
