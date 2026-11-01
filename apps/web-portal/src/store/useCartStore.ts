import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  priceFormatted?: string;
  image: string;
  quantity: number;
  category?: string;
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  toggleCart: (open?: boolean) => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (newItem) => {
        const existing = get().items.find((i) => i.id === newItem.id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.id === newItem.id
                ? { ...i, quantity: i.quantity + (newItem.quantity || 1) }
                : i
            ),
          });
        } else {
          set({
            items: [...get().items, { ...newItem, quantity: newItem.quantity || 1 }],
          });
        }
      },

      removeItem: (id) => {
        set({
          items: get().items.filter((i) => i.id !== id),
        });
      },

      updateQuantity: (id, delta) => {
        const updated = get()
          .items.map((i) => {
            if (i.id === id) {
              const newQty = i.quantity + delta;
              return newQty > 0 ? { ...i, quantity: newQty } : null;
            }
            return i;
          })
          .filter(Boolean) as CartItem[];

        set({ items: updated });
      },

      clearCart: () => set({ items: [] }),

      toggleCart: (open) =>
        set((state) => ({
          isOpen: typeof open === "boolean" ? open : !state.isOpen,
        })),

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: "asanro-cart-storage",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
