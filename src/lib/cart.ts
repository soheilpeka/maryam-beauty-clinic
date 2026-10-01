/**
 * Cart types and money math, isomorphic: the client cart context and the server checkout
 * route both use them so totals can never disagree between what the customer saw and what
 * the server charged. Persisted cart lines carry only the slug, quantity and display data;
 * the price/stock are ALWAYS re-read from the database at checkout.
 */

export interface CartLine {
  slug: string;
  /** Display name captured when the item was added (the cart is a UI cache) */
  name: string;
  /** Unit price in cents captured for display only; the server re-prices at checkout */
  priceCents: number;
  quantity: number;
  imageUrl?: string | null;
}

export const CART_STORAGE_KEY = "mbc-store-cart";
export const MAX_LINE_QUANTITY = 99;

/** Line total in cents. */
export function lineTotal(line: { priceCents: number; quantity: number }): number {
  return line.priceCents * line.quantity;
}

/**
 * Sum of line totals (merchandise subtotal, before shipping). Accepts the minimal shape the
 * math needs, so the server-side checkout can subtotal its own resolved lines without
 * constructing display-only fields the client cart carries.
 */
export function cartSubtotal(lines: Array<{ priceCents: number; quantity: number }>): number {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}

/** Total number of units in the cart, for the header badge. */
export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

/**
 * Shipping for a subtotal, given the store settings. Free shipping applies when the
 * threshold is configured (non-zero) and the subtotal reaches it. Everything is integer
 * cents so rounding is never an issue.
 */
export function shippingFor(
  subtotalCents: number,
  settings: { shippingFeeCents: number; freeShippingThresholdCents: number },
): number {
  if (settings.freeShippingThresholdCents > 0 && subtotalCents >= settings.freeShippingThresholdCents) {
    return 0;
  }
  return settings.shippingFeeCents;
}

/** Add a line, merging into an existing one for the same slug and clamping the quantity. */
export function addLine(lines: CartLine[], product: { slug: string; name: string; priceCents: number; imageUrl?: string | null }, quantity = 1): CartLine[] {
  const existing = lines.find((l) => l.slug === product.slug);
  if (existing) {
    return lines.map((l) =>
      l.slug === product.slug
        ? { ...l, quantity: clampQty(l.quantity + quantity) }
        : l,
    );
  }
  return [...lines, { slug: product.slug, name: product.name, priceCents: product.priceCents, quantity: clampQty(quantity), imageUrl: product.imageUrl ?? null }];
}

/** Set an exact quantity, removing the line when it drops to zero. */
export function setLineQuantity(lines: CartLine[], slug: string, quantity: number): CartLine[] {
  const q = clampQty(quantity);
  if (q <= 0) return lines.filter((l) => l.slug !== slug);
  return lines.map((l) => (l.slug === slug ? { ...l, quantity: q } : l));
}

export function removeLine(lines: CartLine[], slug: string): CartLine[] {
  return lines.filter((l) => l.slug !== slug);
}

export function clampQty(q: number): number {
  if (!Number.isFinite(q)) return 1;
  return Math.max(1, Math.min(MAX_LINE_QUANTITY, Math.trunc(q)));
}
