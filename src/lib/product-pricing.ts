/** Shared display pricing; checkout independently re-reads the database price. */
export function productPricing(product: { price: number; salePrice?: number | null; compareAtPrice?: number | null }) {
  const price = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price
    ? product.salePrice : product.price;
  const original = product.compareAtPrice != null && product.compareAtPrice > price
    ? product.compareAtPrice : product.price;
  const onSale = original > price;
  return { price, original, onSale, percent: onSale ? Math.min(99, Math.max(1, Math.round((original - price) * 100 / original))) : 0 };
}
