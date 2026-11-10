const testServiceLabel = /^(?:test|sample)(?:[-\s]?\d*)?$/i;

export function isPublicService(service: { slug: string; name: string }) {
  return service.slug.trim().toLowerCase() !== "tesst"
    && !testServiceLabel.test(service.slug.trim())
    && !testServiceLabel.test(service.name.trim());
}
