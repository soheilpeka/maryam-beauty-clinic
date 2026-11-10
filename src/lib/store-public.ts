const testProductLabel = /^(?:test|sample)(?:[-\s]?\d*)?$/i;

export function isPublicStoreProduct(product: { name: string; slug: string }) {
  return !testProductLabel.test(product.slug.trim()) && !testProductLabel.test(product.name.trim());
}
