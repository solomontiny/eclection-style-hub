import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "./products";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  addItem: (product: Product, size?: string, qty?: number) => void;
  updateQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "esc_cart_v1";
const itemKey = (id: string, size: string) => `${id}::${size}`;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items, hydrated]);

  const addItem = (product: Product, size = "M", qty = 1) => {
    setItems((arr) => {
      const key = itemKey(product.id, size);
      const existing = arr.find((it) => itemKey(it.id, it.size) === key);
      if (existing) {
        return arr.map((it) =>
          itemKey(it.id, it.size) === key ? { ...it, qty: it.qty + qty } : it,
        );
      }
      return [
        ...arr,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image ?? product.image_url ?? "",
          size,
          qty,
        },
      ];
    });
    setOpen(true);
  };

  const updateQty = (key: string, qty: number) =>
    setItems((arr) =>
      arr
        .map((it) => (itemKey(it.id, it.size) === key ? { ...it, qty: Math.max(0, qty) } : it))
        .filter((it) => it.qty > 0),
    );
  const removeItem = (key: string) =>
    setItems((arr) => arr.filter((it) => itemKey(it.id, it.size) !== key));
  const clear = () => setItems([]);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((s, it) => s + it.qty, 0);
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    return { items, count, subtotal, open, setOpen, addItem, updateQty, removeItem, clear };
  }, [items, open]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export const cartItemKey = itemKey;
