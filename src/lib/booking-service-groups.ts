/** Preserve CMS ordering within each category, including owner-created categories. */
export function groupBookingServices<T extends { category: string }>(services: T[]) {
  const groups = new Map<string, T[]>();
  for (const service of services) {
    const category = service.category.trim();
    const group = groups.get(category) ?? [];
    group.push(service);
    groups.set(category, group);
  }
  const order = ["Hair", "Makeup", "Aesthetic", "Wellness"];
  return [...groups]
    .sort(([a], [b]) => {
      const rank = (category: string) => {
        const index = order.indexOf(category);
        return index < 0 ? order.length : index;
      };
      return rank(a) - rank(b);
    })
    .map(([category, items]) => ({ category, items }));
}
