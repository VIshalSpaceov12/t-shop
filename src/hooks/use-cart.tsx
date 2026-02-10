"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";

type CartProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  sellingPrice: number;
  images: { url: string; altText: string | null }[];
};

type CartVariant = {
  id: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
};

export type CartItem = {
  id: string;
  quantity: number;
  variant: CartVariant;
  product: CartProduct;
};

type CartContextType = {
  items: CartItem[];
  itemCount: number;
  loading: boolean;
  addItem: (variantId: string, quantity?: number) => Promise<boolean>;
  updateItem: (itemId: string, quantity: number) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setItemCount(data.itemCount || 0);
      }
    } catch {
      // Silently fail - cart will show as empty
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      refresh();
    } else {
      setItems([]);
      setItemCount(0);
    }
  }, [session, refresh]);

  const addItem = useCallback(
    async (variantId: string, quantity = 1): Promise<boolean> => {
      setLoading(true);
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId, quantity }),
        });
        if (res.ok) {
          await refresh();
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refresh]
  );

  const updateItem = useCallback(
    async (itemId: string, quantity: number): Promise<boolean> => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cart/${itemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        });
        if (res.ok) {
          await refresh();
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refresh]
  );

  const removeItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
        if (res.ok) {
          await refresh();
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refresh]
  );

  return (
    <CartContext.Provider
      value={{ items, itemCount, loading, addItem, updateItem, removeItem, refresh }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
