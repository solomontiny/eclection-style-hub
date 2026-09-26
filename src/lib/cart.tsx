import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "./products";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  color?: string;
  qty: number;
  isBulk?: boolean;
  bundleId?: string; // New: group identifier for bundle items
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  addItem: (product: Product, size?: string, color?: string, qty?: number, isBulk?: boolean, bundleId?: string, customPrice?: number) => void;
  updateQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const itemKey = (id: string, size: string, color?: string, bundleId?: string) =>
  bundleId ? `${bundleId}::${id}-${size}-${color || "none"}` : `${id}-${size}-${color || "none"}`;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  const addItem = (product: Product, size = "M", color?: string, qty = 1, isBulk = false, bundleId?: string, customPrice?: number) => {
    const itemPrice = isBulk ? (customPrice ?? 6000) : (product.sale_price ?? product.price);
    setItems((arr) => {
      const key = itemKey(product.id, size, color, bundleId);
      const existing = arr.find((it) => itemKey(it.id, it.size, it.color, it.bundleId) === key);
      if (existing) {
        return arr.map((it) => {
          return itemKey(it.id, it.size, it.color, it.bundleId) === key ? { ...it, price: itemPrice, qty: it.qty + qty } : it;
        });
      }
      return [
        ...arr,
        {
          id: product.id,
          name: product.name,
          price: itemPrice,
          image: (color && product.color_images?.[color]) ?? product.image ?? product.image_url ?? "",
          size,
          color,
          qty,
          isBulk,
          bundleId,
        },
      ];
    });
    setOpen(true);
  };

  const updateQty = (key: string, qty: number) =>
    setItems((arr) =>
      arr
        .map((it) => (itemKey(it.id, it.size, it.color, it.bundleId) === key ? { ...it, qty: Math.max(0, qty) } : it))
        .filter((it) => it.qty > 0),
    );
  const removeItem = (key: string) =>
    setItems((arr) => arr.filter((it) => itemKey(it.id, it.size, it.color, it.bundleId) !== key));
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
