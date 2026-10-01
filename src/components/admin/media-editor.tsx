"use client";

import { useLocale } from "next-intl";
import { safeImageUrl } from "@/lib/validation";

export type ImageDraft = { url: string; altEn: string; altFr: string };

export function MediaEditor({ primary, images, onPrimary, onImages, allowGallery = true }: { primary: string; images: ImageDraft[]; onPrimary: (url: string) => void; onImages: (images: ImageDraft[]) => void; allowGallery?: boolean }) {
  const fr = useLocale() === "fr";
  const change = (index: number, patch: Partial<ImageDraft>) => onImages(images.map((image, i) => i === index ? { ...image, ...patch } : image));
  const preview = (url: string, alt: string) => url && safeImageUrl.safeParse(url).success ? <img src={url} alt={alt} className="mt-3 h-36 max-w-full rounded-xl border border-border object-contain" /> : null;
  return <fieldset className="space-y-4 rounded-xl border border-border p-4">
    <legend className="px-2 text-sm font-medium">{fr ? "Images et aperçu" : "Images and preview"}</legend>
    <p className="text-xs leading-relaxed text-muted-foreground">{fr ? "Chemin public local ou URL HTTPS d’image. Le stockage cloud peut être connecté ultérieurement." : "Local public path or HTTPS image URL. Cloud storage can be connected later."}</p>
    <label className="block text-sm">{fr ? "Image principale" : "Primary image"}<input value={primary} onChange={event => onPrimary(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3" placeholder="/example-pics/photo.jpg" /></label>
    {preview(primary, fr ? "Aperçu de l’image principale" : "Primary image preview")}
    {images.map((image, index) => <div key={index} className="space-y-2 border-t border-border pt-4">
      <label className="block text-sm">{fr ? "Image" : "Image"} {index + 1}<input required value={image.url} onChange={event => change(index, { url: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background p-3" /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">{fr ? "Texte alternatif anglais" : "English alt text"}<input required value={image.altEn} onChange={event => change(index, { altEn: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background p-3" /></label><label className="text-sm">{fr ? "Texte alternatif français" : "French alt text"}<input required value={image.altFr} onChange={event => change(index, { altFr: event.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background p-3" /></label></div>
      {preview(image.url, fr ? image.altFr : image.altEn)}
      <div className="flex gap-3 text-sm"><button type="button" disabled={index === 0} onClick={() => { const next = [...images]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onImages(next); }} className="rounded-full border border-border px-3 py-2 disabled:opacity-40">{fr ? "Monter" : "Move up"}</button><button type="button" onClick={() => onImages(images.filter((_, i) => i !== index))} className="rounded-full border border-border px-3 py-2">{fr ? "Retirer" : "Remove"}</button></div>
    </div>)}
    {allowGallery && <button type="button" disabled={images.length >= 8} onClick={() => onImages([...images, { url: "", altEn: "", altFr: "" }])} className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40">{fr ? "Ajouter une image" : "Add gallery image"}</button>}
  </fieldset>;
}
