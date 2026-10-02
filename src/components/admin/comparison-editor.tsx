"use client";
import { ImageComparison } from "@/components/image-comparison";
import { comparisonSchema, FULL_PHOTO } from "@/lib/comparison-validation";
import type { PhotoViewport } from "@/lib/content/comparisons";
export function ComparisonPreview({ data, fr }: { data: Record<string, unknown>; fr: boolean }) {
  const parsed = comparisonSchema.safeParse({ name: data.name, nameFr: data.nameFr, description: data.description, descriptionFr: data.descriptionFr, imageUrl: data.imageUrl, afterImageUrl: data.afterImageUrl, beforeCrop: data.beforeCrop, afterCrop: data.afterCrop, aspectRatio: Number(data.aspectRatio), category: data.category, active: Boolean(data.active), order: Number(data.order) });
  if (!parsed.success) return <p className="text-sm text-muted-foreground">{fr ? "Complétez les champs valides pour voir l’aperçu." : "Complete valid fields to see the preview."}</p>;
  const p = parsed.data, title = fr ? p.nameFr : p.name;
  return <div className="my-4"><ImageComparison before={{ src: p.imageUrl, alt: title, viewport: p.beforeCrop }} after={{ src: p.afterImageUrl, alt: title, viewport: p.afterCrop }} beforeLabel={fr ? "Avant" : "Before"} afterLabel={fr ? "Après" : "After"} label={fr ? "Glisser pour comparer" : "Drag to compare"} aspectRatio={p.aspectRatio} /></div>;
}
export function ComparisonEditor({ draft, update, fr }: { draft: Record<string, unknown>; update: (key: string, value: unknown) => void; fr: boolean }) {
  return <fieldset className="space-y-4 rounded-xl border border-border p-4">
    <legend>{fr ? "Photos avant / après" : "Before / after photographs"}</legend>
    <p className="text-xs text-muted-foreground">{fr ? "Deux photos séparées ou deux cadrages d’une même image. Utilisez des chemins publics ou URL HTTPS. Aucun téléversement local n’est proposé." : "Use two separate photos or two viewports from one board. Enter public paths or HTTPS image URLs. Local uploads are not provided."}</p>
    {(["imageUrl", "afterImageUrl"] as const).map((key, index) => <label key={key} className="block text-sm">{fr ? (index ? "Image après" : "Image avant") : (index ? "After image" : "Before image")}<input id={`comparisons-${key}`} value={String(draft[key] ?? "")} onChange={e => update(key, e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3" /></label>)}
    <label className="block text-sm">{fr ? "Catégorie" : "Category"}<select value={String(draft.category)} onChange={e => update("category", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3"><option value="laser">Laser</option><option value="rf">{fr ? "Radiofréquence" : "Radiofrequency"}</option><option value="other">{fr ? "Autres" : "Other"}</option></select></label>
    <label className="block text-sm">{fr ? "Ratio largeur / hauteur" : "Width / height ratio"}<input type="number" min="0.25" max="4" step="0.01" value={String(draft.aspectRatio)} onChange={e => update("aspectRatio", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3" /></label>
    <button type="button" onClick={() => { update("beforeCrop", { ...FULL_PHOTO }); update("afterCrop", { ...FULL_PHOTO }); }} className="rounded-full border border-border px-4 py-2 text-sm">{fr ? "Utiliser les photos entières" : "Use complete photographs"}</button>
    <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm">{fr ? "Cadrage avancé (%)" : "Advanced framing (%)"}</summary><p className="my-3 text-xs">{fr ? "X et Y : début du cadrage. Largeur et hauteur : portion visible de l’image." : "X and Y: crop origin. Width and height: visible portion of the image."}</p>
      {(["beforeCrop", "afterCrop"] as const).map((key, i) => <fieldset key={key} className="my-3 grid grid-cols-2 gap-3"><legend>{fr ? (i ? "Après" : "Avant") : (i ? "After" : "Before")}</legend>{(["x", "y", "width", "height"] as const).map(part => <label className="text-xs" key={part}>{({ x: "X", y: "Y", width: fr ? "Largeur" : "Width", height: fr ? "Hauteur" : "Height" })[part]} (%)<input type="number" min={part === "x" || part === "y" ? 0 : 1} max="100" step="0.01" value={Math.round(Number((draft[key] as PhotoViewport)[part]) * 10000) / 100} onChange={e => update(key, { ...(draft[key] as PhotoViewport), [part]: Number(e.target.value) / 100 })} className="mt-1 w-full rounded-lg border border-border bg-background p-3" /></label>)}</fieldset>)}
    </details>
    <ComparisonPreview data={draft} fr={fr} />
  </fieldset>;
}
