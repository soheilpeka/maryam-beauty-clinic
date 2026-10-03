"use client";

import { useCallback, useEffect, useState } from "react";
import type { CartLine } from "@/lib/cart";

export interface QuoteLine {
  slug: string;
  quantity: number;
  available: boolean;
  stock?: number;
  name?: string;
  imageUrl?: string | null;
  priceCents?: number;
  lineTotalCents?: number;
}
export interface CartQuote {
  enabled: boolean;
  lines: QuoteLine[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  freeShippingThresholdCents: number;
}

/** Both cart and checkout display a fresh server quote; old requests cannot replace it. */
export function useCartQuote(lines: CartLine[], ready: boolean, locale: string) {
  const wanted = JSON.stringify(lines.map(({ slug, quantity }) => ({ slug, quantity })));
  const [revision, setRevision] = useState(0);
  const key = `${locale}:${wanted}:${revision}`;
  const [state, setState] = useState<{ key: string; quote: CartQuote | null; error: boolean }>();
  const refresh = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    if (!ready || wanted === "[]") return;
    const controller = new AbortController();
    fetch("/api/store/cart/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale, lines: JSON.parse(wanted) }),
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error("quote failed");
      const quote: CartQuote = await response.json();
      if (!Array.isArray(quote.lines)) throw new Error("invalid quote");
      if (!controller.signal.aborted) setState({ key, quote, error: false });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ key, quote: null, error: true });
    });
    return () => controller.abort();
  }, [key, wanted, ready, locale]);

  const current = ready && lines.length && state?.key === key ? state : undefined;
  return { quote: current?.quote ?? null, quoteError: current?.error ?? false, refresh };
}
