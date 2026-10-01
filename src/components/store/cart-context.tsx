"use client";

/**
 * Cart state for the store. Lines are persisted to localStorage so a returning visitor
 * keeps their cart, but prices are only ever DISPLAY values here: the server re-reads every
 * product at checkout, so a stale or tampered cached price can never be charged.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CartLine, CART_STORAGE_KEY, addLine, setLineQuantity, removeLine, cartCount, clampQty } from "@/lib/cart";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (product: { slug: string; name: string; priceCents: number; imageUrl?: string | null }, quantity?: number) => void;
  setQuantity: (slug: string, quantity: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // Load once on the client. SSR renders an empty cart, so there is no hydration mismatch:
  // the persisted state is applied after mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setLines(
            parsed
              .filter((l): l is CartLine =>
                typeof l === "object" &&
                l !== null &&
                typeof (l as CartLine).slug === "string" &&
                typeof (l as CartLine).name === "string" &&
                typeof (l as CartLine).priceCents === "number" &&
                typeof (l as CartLine).quantity === "number",
              )
              .map((l) => ({ ...l, quantity: clampQty(l.quantity) })),
          );
        }
      }
    } catch {
      // Corrupt or unavailable storage: start from an empty cart rather than failing.
    } finally {
      setReady(true);
    }
  }, []);

  // Persist on every change (after the initial load only, so an empty first paint is not
  // written back over a real cart before it has been read).
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage full or blocked: the in-memory cart still works for this session.
    }
  }, [lines, ready]);

  const add = useCallback<CartContextValue["add"]>((product, quantity) => {
    setLines((current) => addLine(current, product, quantity));
  }, []);

  const setQuantity = useCallback<CartContextValue["setQuantity"]>((slug, quantity) => {
    setLines((current) => setLineQuantity(current, slug, quantity));
  }, []);

  const remove = useCallback<CartContextValue["remove"]>((slug) => {
    setLines((current) => removeLine(current, slug));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({ lines, count: cartCount(lines), ready, add, setQuantity, remove, clear }),
    [lines, ready, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside a CartProvider");
  }
  return ctx;
}
