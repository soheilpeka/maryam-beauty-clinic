/** URL-only media policy. No filesystem upload or remote fetch is performed. */
export const MEDIA_POLICY = {
  provider: "url" as const,
  maxBytes: 10 * 1024 * 1024,
  maxGalleryImages: 8,
  mimeTypes: ["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"] as const,
  publicDirectories: ["example-pics", "preview", "media", "images"],
};

// A future approved storage adapter must verify actual type/size when uploading.
// This policy validates references only, not the contents of an external file.
export function isSafeImageUrl(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) {
    if (/[\\%\s]/.test(value) || value.split("/").some(part => part === "." || part === "..")) return false;
    return MEDIA_POLICY.publicDirectories.includes(value.split("/")[1]) && /\.(avif|gif|jpe?g|png|webp)$/i.test(value);
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && /\.(avif|gif|jpe?g|png|webp)$/i.test(url.pathname);
  } catch { return false; }
}
