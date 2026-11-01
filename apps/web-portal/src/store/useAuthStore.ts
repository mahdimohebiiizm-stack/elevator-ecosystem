import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string; // UUID v4 identifier
  name: string;
  phone: string;
  role: "ADMIN" | "USER";
  messenger_id?: string;
  wallet_balance?: number;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoginModalOpen: boolean;
  login: (user: AuthUser, token?: string | null) => void;
  logout: () => void;
  toggleLoginModal: (open?: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoginModalOpen: false,

      login: (user, token) =>
        set({
          user,
          token: token || null,
          isAuthenticated: true,
          isLoginModalOpen: false,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),

      toggleLoginModal: (open) =>
        set((state) => ({
          isLoginModalOpen:
            typeof open === "boolean" ? open : !state.isLoginModalOpen,
        })),
    }),
    {
      name: "asanro-auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
