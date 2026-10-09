"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { serviceSchema, productSchema, packageSchema, galleryItemSchema, flattenZodErrors } from "@/lib/validation";
import { translateValidationKey } from "@/lib/booking-ui";
import { getCsrfToken } from "@/lib/admin-client";
import { MediaEditor, type ImageDraft } from "./media-editor";
import { comparisonSchema, FULL_PHOTO } from "@/lib/comparison-validation";
import { ComparisonEditor, ComparisonPreview } from "./comparison-editor";
import { resolveServiceDescription } from "@/lib/content/service-copy";

type Kind = "services" | "products" | "packages" | "gallery" | "comparisons";
type StoreCategory = { id: string; name: string; nameFr: string | null; order: number };
type Row = { id: string; slug?: string; active: boolean; order: number; name?: string; nameFr?: string; category?: string; imageUrl?: string; images?: ImageDraft[]; services?: { serviceId: string }[]; [key: string]: unknown };
type Field = { key: string; en: string; fr: string; type?: "number" | "textarea"; optional?: boolean; money?: boolean };
const shared: Field[] = [{ key: "name", en: "Name", fr: "Nom anglais" }, { key: "nameFr", en: "French name", fr: "Nom français" }, { key: "description", en: "Description", fr: "Description anglaise", type: "textarea", optional: true }, { key: "descriptionFr", en: "French description", fr: "Description française", type: "textarea", optional: true }, { key: "price", en: "Price (CAD)", fr: "Prix (CAD)", type: "number", money: true }];
const fields: Record<Kind, Field[]> = {
  comparisons: shared.filter(field => field.key !== "price"),
  services: [...shared, { key: "duration", en: "Duration (min)", fr: "Durée (min)", type: "number" }, { key: "bufferMin", en: "Buffer (min)", fr: "Marge (min)", type: "number" }, { key: "category", en: "Category", fr: "Catégorie" }],
  products: [{ key: "sku", en: "SKU", fr: "UGS" }, ...shared, { key: "salePrice", en: "Sale price (CAD)", fr: "Prix promotionnel (CAD)", type: "number", money: true, optional: true }, { key: "stock", en: "Stock", fr: "Stock", type: "number" }, { key: "category", en: "Category", fr: "Catégorie" }],
  packages: [...shared, { key: "sessions", en: "Sessions", fr: "Séances", type: "number" }, { key: "validityDays", en: "Validity (days)", fr: "Validité (jours)", type: "number", optional: true }, { key: "badge", en: "Badge", fr: "Badge", optional: true }],
  gallery: [{ key: "altEn", en: "English alt text", fr: "Texte alternatif anglais" }, { key: "altFr", en: "French alt text", fr: "Texte alternatif français" }, { key: "captionEn", en: "English caption", fr: "Légende anglaise", optional: true }, { key: "captionFr", en: "French caption", fr: "Légende française", optional: true }, { key: "category", en: "Category", fr: "Catégorie" }],
};
const schemas = { services: serviceSchema, products: productSchema, packages: packageSchema, gallery: galleryItemSchema, comparisons: comparisonSchema };
const names = { services: ["service", "service"], products: ["product", "produit"], packages: ["package", "forfait"], gallery: ["image", "image"], comparisons: ["comparison", "comparaison"] };
const defaults = { active: true, featured: false, order: "0", duration: "0", bufferMin: "0", sessions: "1", stock: "0", category: "Hair", imageUrl: "", images: [], serviceIds: [] };

export function ContentManager({ kind, locale, storeCategories = [] }: { kind: Kind; locale: string; storeCategories?: StoreCategory[] }) {
  const fr = locale === "fr";
  const tv = useTranslations("Validation");
  const [rows, setRows] = useState<Row[]>([]);
  const [services, setServices] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("order");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [preview, setPreview] = useState<Row | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState(0);
  const uploadActivity = useCallback((active: boolean) => setUploads(count => Math.max(0, count + (active ? 1 : -1))), []);
  const dialog = useRef<HTMLDialogElement>(null);
  const failure = fr ? "Impossible de terminer cette opération. Vérifiez les champs ou réessayez." : "The operation could not be completed. Check the fields or try again.";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/${kind}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRows(data[kind === "gallery" ? "items" : kind] ?? []);
      if (kind === "packages") {
        const response = await fetch("/api/admin/services", { cache: "no-store" });
        if (!response.ok) throw new Error();
        setServices((await response.json()).services);
      }
      setError("");
    } catch { setError(failure); } finally { setLoading(false); }
  }, [kind, failure]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (draft) dialog.current?.showModal(); }, [draft]);
  const update = (key: string, value: unknown) => setDraft(current => current ? { ...current, [key]: value } : current);
  function edit(row?: Row) {
    setErrors({});
    const next: Record<string, unknown> = { ...defaults, images: [], serviceIds: [] };
    fields[kind].forEach(field => { next[field.key] = row?.[field.key] == null ? (next[field.key] ?? "") : field.money ? String(Number(row[field.key]) / 100) : String(row[field.key]); });
    if (row) Object.assign(next, { id: row.id, active: row.active, featured: row.featured ?? false, order: String(row.order), imageUrl: row.imageUrl ?? "", images: row.images?.map(({ url, altEn, altFr }) => ({ url, altEn, altFr })) ?? [], serviceIds: row.services?.map(item => item.serviceId) ?? [] });
    if (kind === "comparisons") Object.assign(next, { category: row?.category ?? "laser", afterImageUrl: row?.afterImageUrl ?? "", beforeCrop: row?.beforeCrop ?? { ...FULL_PHOTO }, afterCrop: row?.afterCrop ?? { ...FULL_PHOTO }, aspectRatio: row?.aspectRatio ?? 4 / 3 });
    setDraft(next);
  }
  function close() { if (!busy && !uploads) { dialog.current?.close(); setDraft(null); } }
  async function save() {
    if (!draft || uploads) return;
    const payload: Record<string, unknown> = { active: draft.active, order: Number(draft.order), imageUrl: draft.imageUrl };
    fields[kind].forEach(field => {
      const value = String(draft[field.key] ?? "").trim();
      if (field.optional && !value) { payload[field.key] = field.type === "number" ? null : ""; }
      else payload[field.key] = field.type === "number" ? (field.money ? Math.round(Number(value) * 100) : Number(value)) : value;
    });
    if (kind !== "gallery" && kind !== "comparisons") payload.images = draft.images;
    if (kind === "comparisons") Object.assign(payload, { category: draft.category, afterImageUrl: draft.afterImageUrl, beforeCrop: draft.beforeCrop, afterCrop: draft.afterCrop, aspectRatio: Number(draft.aspectRatio) });
    if (kind === "products") payload.featured = draft.featured;
    if (kind === "packages") payload.serviceIds = draft.serviceIds;
    const parsed = schemas[kind].safeParse(payload);
    if (!parsed.success) {
      if (kind === "comparisons") { setErrors({ form: fr ? "Vérifiez les noms (2–160 caractères), textes (1000 max), URL d’images, ratio et cadrages à l’intérieur de l’image." : "Check names (2–160 characters), text (1000 max), image URLs, ratio and crops inside the image." }); return; }
      setErrors(Object.fromEntries(Object.entries(flattenZodErrors<unknown>(parsed)).map(([key, value]) => [key, translateValidationKey(value, tv)])));
      return;
    }
    setBusy(true); setErrors({});
    try {
      const csrf = await getCsrfToken();
      if (!csrf) throw new Error();
      const response = await fetch(`/api/admin/${kind}${draft.id ? `/${draft.id}` : ""}`, { method: draft.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json", "x-admin-csrf": csrf }, body: JSON.stringify(parsed.data) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.error === "VALIDATION" && result.fieldErrors && typeof result.fieldErrors === "object") {
          const fieldErrors = Object.fromEntries(Object.entries(result.fieldErrors as Record<string, string>).map(([key, value]) => [key, translateValidationKey(value, tv)]));
          setErrors(Object.keys(fieldErrors).length ? fieldErrors : { form: failure });
          return;
        }
        throw new Error();
      }
      dialog.current?.close(); setDraft(null); setNotice(fr ? "Modifications enregistrées." : "Changes saved."); await load();
    } catch { setErrors({ form: failure }); } finally { setBusy(false); }
  }
  async function toggle(row: Row) {
    setBusy(true); setError("");
    try {
      const csrf = await getCsrfToken();
      const response = await fetch(`/api/admin/${kind}/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-csrf": csrf ?? "" }, body: JSON.stringify({ active: !row.active }) });
      if (!response.ok) throw new Error();
      setNotice(fr ? "Statut mis à jour." : "Status updated."); await load();
    } catch { setError(failure); } finally { setBusy(false); }
  }
  const visible = rows.filter(row => (filter === "all" || row.active === (filter === "active")) && JSON.stringify(row).toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === "name" ? String(fr ? a.nameFr ?? a.altFr : a.name ?? a.altEn).localeCompare(String(fr ? b.nameFr ?? b.altFr : b.name ?? b.altEn)) : a.order - b.order);
  const pages = Math.max(1, Math.ceil(visible.length / 12));
  const currentPage = Math.min(page, pages);
  return <div className="admin-content-manager space-y-6">
    {preview && <ContentPreview row={preview} kind={kind} fr={fr} close={() => setPreview(null)} />}
    <div className="cms-toolbar flex flex-wrap items-end gap-3"><label className="cms-search flex-1 text-sm">{fr ? "Rechercher" : "Search"}<input type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} className="mt-1 w-full rounded-xl border border-border bg-card p-3" /></label><label className="text-sm">{fr ? "Statut" : "Status"}<select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }} className="mt-1 block w-full rounded-xl border border-border bg-card p-3"><option value="all">{fr ? "Tous" : "All"}</option><option value="active">{fr ? "Actif" : "Active"}</option><option value="inactive">{fr ? "Inactif" : "Inactive"}</option></select></label><label className="text-sm">{fr ? "Trier" : "Sort"}<select value={sort} onChange={e => setSort(e.target.value)} className="mt-1 block w-full rounded-xl border border-border bg-card p-3"><option value="order">{fr ? "Ordre d’affichage" : "Display order"}</option><option value="name">{fr ? "Nom" : "Name"}</option></select></label><button type="button" onClick={() => edit()} className="cms-add rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground">{fr ? "Ajouter un" : "Add"} {names[kind][fr ? 1 : 0]}</button></div>
    {notice && <p role="status" className="rounded-xl border border-border bg-card p-4 text-sm">{notice}</p>}
    {error && <div role="alert" className="rounded-xl border border-destructive/30 p-4 text-destructive">{error}<button type="button" onClick={() => void load()} className="ml-3 underline">{fr ? "Réessayer" : "Retry"}</button></div>}
    {loading ? <p role="status">{fr ? "Chargement…" : "Loading…"}</p> : !visible.length ? <p className="rounded-2xl border border-dashed border-border p-10 text-center">{fr ? "Aucun contenu ne correspond à cette sélection." : "No content matches this selection."}</p> : <ul className="cms-items space-y-3">{visible.slice((currentPage - 1) * 12, currentPage * 12).map(row => <li key={row.id} className="cms-item flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5"><div className="cms-item-summary"><h2 className="font-serif text-xl">{String(fr ? row.nameFr ?? row.captionFr ?? row.altFr : row.name ?? row.captionEn ?? row.altEn)}</h2><p className="mt-2 text-xs text-muted-foreground">{String(row.sku ?? "")} {row.stock !== undefined ? `${row.stock} · ` : ""}{row.category} · #{row.order} · {row.active ? (fr ? "Actif" : "Active") : (fr ? "Inactif" : "Inactive")}</p>{row.slug && <p className="mt-1 text-xs text-muted-foreground">/{row.slug}</p>}</div><div className="cms-item-actions flex flex-wrap gap-2"><button type="button" onClick={() => edit(row)} className="rounded-full border border-border px-4 py-2 text-sm">{fr ? "Modifier" : "Edit"}</button><button type="button" disabled={busy || uploads > 0} onClick={() => void toggle(row)} className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50">{row.active ? (fr ? "Désactiver" : "Deactivate") : (fr ? "Activer" : "Activate")}</button><button type="button" onClick={() => setPreview(row)} className="rounded-full border border-border px-4 py-2 text-sm">{fr ? "Aperçu" : "Preview"}</button>{row.slug && row.active && !row.demo && (kind === "services" || kind === "products") && <Link href={kind === "services" ? `/service-page/${row.slug}` : `/store/${row.slug}`} className="rounded-full border border-border px-4 py-2 text-sm">{fr ? "Voir le site" : "View page"}</Link>}</div></li>)}</ul>}
    {pages > 1 && <div className="flex items-center justify-center gap-4"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-full border border-border px-4 py-2 disabled:opacity-40">{fr ? "Précédent" : "Previous"}</button><span>{currentPage} / {pages}</span><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className="rounded-full border border-border px-4 py-2 disabled:opacity-40">{fr ? "Suivant" : "Next"}</button></div>}
    {draft && <dialog ref={dialog} onCancel={e => { e.preventDefault(); close(); }} className="m-auto max-h-[90dvh] w-[min(44rem,calc(100%_-_2rem))] overflow-y-auto rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl" aria-labelledby="cms-dialog-title"><h2 id="cms-dialog-title" className="font-serif text-3xl">{draft.id ? (fr ? "Modifier" : "Edit") : (fr ? "Ajouter un" : "Add")} {names[kind][fr ? 1 : 0]}</h2><form onSubmit={e => { e.preventDefault(); void save(); }} className="mt-6 space-y-5" noValidate>
      {errors.form && <p role="alert" className="text-destructive">{errors.form}</p>}
      {kind === "services" && <p className="text-xs text-muted-foreground">{fr ? "Prix ou durée à 0 : les détails seront confirmés lors de la consultation." : "Price or duration of 0: details will be confirmed during consultation."}</p>}
      {kind === "services" && <p className="text-xs leading-relaxed text-muted-foreground">{fr ? "La description accepte les sections Aperçu, Description du service, Points forts du soin, Une approche personnalisée, Durée, les questions fréquentes et Demander un rendez-vous. Séparez les paragraphes par une ligne vide; utilisez * pour les listes." : "The description supports Preview, Service Description, Treatment Highlights, A Personal Approach, Duration, FAQ questions and Request an appointment. Separate paragraphs with a blank line; use * for list items."}</p>}
      {kind === "services" && <p className="rounded-xl border border-border bg-background p-3 text-sm leading-relaxed text-muted-foreground">{fr ? "Utilisez le même nom de catégorie pour regrouper les services. Toute nouvelle catégorie de service utilisée ici apparaît automatiquement dans les menus du site, le catalogue et les filtres de réservation." : "Use the same category name to group services. Any new service category entered here appears automatically in the site menus, service catalog and booking filters."}</p>}
      {kind === "comparisons" && <p className="text-sm leading-relaxed text-muted-foreground">{fr ? "Le nom et la courte description s’affichent sous les photos. Écrivez simplement ce que le client voit. Vous pouvez modifier ce texte quand vous le souhaitez." : "The name and short description appear below the photos. Simply describe what the client sees. You can change this text at any time."}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{fields[kind].map(field => {
        const label = kind === "comparisons"
          ? ({ name: fr ? "Nom en anglais" : "Name in English", nameFr: fr ? "Nom en français" : "Name in French", description: fr ? "Description en anglais (facultative)" : "Description in English (optional)", descriptionFr: fr ? "Description en français (facultative)" : "Description in French (optional)" } as Record<string, string>)[field.key]
          : fr ? field.fr : field.en;
        const placeholder = kind === "comparisons" ? ({
          name: "Example: Nape",
          nameFr: "Ex. : Nuque",
          description: "Example: A view of the nape before and after.",
          descriptionFr: "Ex. : Vue de la nuque avant et après.",
        } as Record<string, string>)[field.key] : undefined;
        const productCategory = kind === "products" && field.key === "category";
        const serviceCategory = kind === "services" && field.key === "category";
        const serviceCategoryNames = [...new Set(rows.map(row => row.category?.trim()).filter((value): value is string => Boolean(value)))];
        return <label key={field.key} className={`block text-sm ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>{label}{!field.optional ? " *" : ""}{field.type === "textarea" ? <textarea id={`${kind === "products" ? "product" : kind}-${field.key}`} placeholder={placeholder} aria-invalid={Boolean(errors[field.key])} rows={field.key.startsWith("description") ? 12 : 3} value={String(draft[field.key] ?? "")} onChange={e => update(field.key, e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3" /> : productCategory ? <select id="product-category" aria-invalid={Boolean(errors[field.key])} value={String(draft[field.key] ?? "")} onChange={e => update(field.key, e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3"><option value="" disabled>{fr ? "Choisir une catégorie" : "Choose a category"}</option>{String(draft[field.key] ?? "") && !storeCategories.some(category => category.name === draft[field.key]) && <option value={String(draft[field.key])}>{String(draft[field.key])}</option>}{storeCategories.map(category => <option key={category.id} value={category.name}>{category.name}{category.nameFr ? ` · ${category.nameFr}` : ""}</option>)}</select> : serviceCategory ? <><input id="service-category" list="service-category-options" aria-invalid={Boolean(errors[field.key])} type="text" value={String(draft[field.key] ?? "")} onChange={e => update(field.key, e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3" /><datalist id="service-category-options">{serviceCategoryNames.map(category => <option key={category} value={category} />)}</datalist></> : <input id={`${kind === "products" ? "product" : kind}-${field.key}`} placeholder={placeholder} aria-invalid={Boolean(errors[field.key])} type={field.type ?? "text"} min={field.type === "number" ? 0 : undefined} step={field.money ? "0.01" : field.type === "number" ? "1" : undefined} value={String(draft[field.key] ?? "")} onChange={e => update(field.key, e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3" />}{errors[field.key] && <span role="alert" className="mt-1 block text-xs text-destructive">{errors[field.key]}</span>}</label>;
      })}<label className="text-sm">{fr ? "Ordre d’affichage" : "Display order"}<input type="number" min="0" value={String(draft.order)} onChange={e => update("order", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3" /></label></div>
      {kind === "products" && <fieldset className="rounded-xl border border-border p-4"><legend>{fr ? "Promotion" : "Product discount"}</legend>
        <label className="block text-sm">{fr ? "Réduction (%)" : "Discount (%)"}<input id="product-discount" type="number" min="0" max="99" step="1" disabled={Number(draft.price) <= 0} value={Number(draft.salePrice) > 0 && Number(draft.salePrice) < Number(draft.price) ? Math.round((1 - Number(draft.salePrice) / Number(draft.price)) * 100) : 0} onChange={e => { const percent = Number(e.target.value); if (Number.isFinite(percent) && percent >= 0 && percent <= 99) update("salePrice", percent === 0 ? "" : (Math.round(Number(draft.price) * 100 * (1 - percent / 100)) / 100).toFixed(2)); }} className="mt-1 w-full rounded-lg border border-border bg-background p-3" /></label>
        <p className="mt-2 text-sm text-muted-foreground">{fr ? "Choisissez un pourcentage ou modifiez le prix promotionnel ci-dessus. 0 % retire la promotion." : "Choose a percentage or edit the sale price above. Set 0% to remove the discount."}</p>
        {Number(draft.salePrice) > 0 && <button type="button" onClick={() => update("salePrice", "")} className="mt-3 min-h-11 rounded-full border border-border px-4 py-2 text-sm">{fr ? "Retirer la promotion" : "Remove discount"}</button>}
      </fieldset>}
      {kind === "packages" && <fieldset className="rounded-xl border border-border p-4"><legend>{fr ? "Services inclus" : "Included services"}</legend><div className="grid gap-2 sm:grid-cols-2">{services.map(service => <label key={service.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={(draft.serviceIds as string[]).includes(service.id)} onChange={e => update("serviceIds", e.target.checked ? [...draft.serviceIds as string[], service.id] : (draft.serviceIds as string[]).filter(id => id !== service.id))} />{fr ? service.nameFr : service.name}</label>)}</div>{errors.serviceIds && <p role="alert" className="text-sm text-destructive">{errors.serviceIds}</p>}</fieldset>}
      {kind === "comparisons" ? <ComparisonEditor disabled={busy || uploads > 0} onActivity={uploadActivity} draft={draft} update={update} fr={fr} /> : <MediaEditor disabled={busy || uploads > 0} onActivity={uploadActivity} primary={String(draft.imageUrl)} images={kind === "gallery" ? [] : draft.images as ImageDraft[]} allowGallery={kind !== "gallery"} onPrimary={value => update("imageUrl", value)} onImages={value => update("images", value)} />}
      {(errors.imageUrl || errors.images) && <p role="alert" className="text-sm text-destructive">{errors.imageUrl ?? errors.images}</p>}
      <div className="flex gap-6"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(draft.active)} onChange={e => update("active", e.target.checked)} />{fr ? "Actif" : "Active"}</label>{kind === "products" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(draft.featured)} onChange={e => update("featured", e.target.checked)} />{fr ? "En vedette" : "Featured"}</label>}</div>
      <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-border bg-card py-3">{kind === "gallery" && <button type="button" onClick={() => setPreview(draft as Row)} className="rounded-full border border-border px-5 py-3 text-sm">{fr ? "Aperçu des modifications" : "Preview changes"}</button>}<button type="button" disabled={busy || uploads > 0} onClick={close} className="rounded-full border border-border px-5 py-3 text-sm">{fr ? "Annuler" : "Cancel"}</button><button type="submit" disabled={busy || uploads > 0} className="rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground disabled:opacity-50">{busy ? (fr ? "Enregistrement…" : "Saving…") : (fr ? "Enregistrer" : "Save")}</button></div>
    </form></dialog>}
  </div>;
}

function ContentPreview({ row, kind, fr, close }: { row: Row; kind: Kind; fr: boolean; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const name = String(kind === "gallery" ? (fr ? row.captionFr || row.altFr || "Aperçu" : row.captionEn || row.altEn || "Preview") : (fr ? row.nameFr || row.altFr || row.captionFr || "Aperçu" : row.name || row.altEn || row.captionEn || "Preview"));
  const imageAlt = String(kind === "gallery" ? (fr ? row.altFr ?? "" : row.altEn ?? "") : name);
  const previewLabel = kind === "gallery" ? (fr ? "Aperçu de la légende" : "Caption preview") : fr ? "Aperçu du contenu enregistré" : "Saved content preview";
  const serviceCopy = kind === "services" ? resolveServiceDescription(String(row.slug ?? ""), fr ? String(row.descriptionFr ?? row.description ?? "") : String(row.description ?? ""), fr ? "fr" : "en") : undefined;
  if (row.afterImageUrl) return <dialog ref={ref} onCancel={close} className="m-auto max-h-[90dvh] w-[min(44rem,calc(100%_-_2rem))] overflow-y-auto rounded-2xl border border-border bg-card p-6" aria-label={name}><h2 className="text-2xl">{name}</h2><ComparisonPreview data={row} fr={fr} /><p>{String(fr ? row.descriptionFr : row.description)}</p><button type="button" onClick={close} className="mt-4 rounded-full border border-border px-5 py-3">{fr ? "Fermer" : "Close"}</button></dialog>;

  return <dialog ref={ref} onCancel={close} className="m-auto max-h-[90dvh] w-[min(44rem,calc(100%_-_2rem))] overflow-y-auto rounded-2xl border border-border bg-card p-6 text-foreground" aria-labelledby="content-preview-title">
    <p className="eyebrow">{previewLabel}</p>
    <h2 id="content-preview-title" className="mt-3 font-serif text-4xl">{name}</h2>
    {row.imageUrl && <img src={row.imageUrl} alt={imageAlt} className="my-6 aspect-[4/3] w-full object-contain" />}
    {kind === "gallery" ? <p className="my-5 whitespace-pre-wrap text-muted-foreground">{String(fr ? row.altFr ?? "" : row.altEn ?? "")}</p> : serviceCopy ? <div className="my-6 space-y-6 text-sm leading-relaxed">
      <section><p className="eyebrow">{fr ? "Aperçu" : "Preview"}</p><p className="mt-2 text-base text-foreground">{serviceCopy.summary}</p></section>
      {serviceCopy.detail?.paragraphs.length ? <section><h3 className="font-serif text-2xl">{fr ? "Description du service" : "Service Description"}</h3><div className="mt-3 space-y-3 text-muted-foreground">{serviceCopy.detail.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></section> : null}
      {serviceCopy.detail?.highlights?.length ? <section><h3 className="font-serif text-2xl">{serviceCopy.detail.highlightsTitle ?? (fr ? "Points forts du soin" : "Treatment Highlights")}</h3><ul className="mt-3 list-disc space-y-2 pl-5">{serviceCopy.detail.highlights.map(item => <li key={item}>{item}</li>)}</ul></section> : null}
      {serviceCopy.detail?.personalApproachTitle || serviceCopy.detail?.personalApproach?.length ? <section><h3 className="font-serif text-2xl">{fr ? "Une approche personnalisée" : "A Personal Approach"}</h3>{serviceCopy.detail.personalApproachTitle && <p className="mt-2 font-medium">{serviceCopy.detail.personalApproachTitle}</p>}{serviceCopy.detail.personalApproach?.map((paragraph, index) => <p key={index} className="mt-2 text-muted-foreground">{paragraph}</p>)}</section> : null}
      {serviceCopy.detail?.durationText && <section><h3 className="font-serif text-2xl">{fr ? "Durée" : "Duration"}</h3><p className="mt-2 text-muted-foreground">{serviceCopy.detail.durationText}</p></section>}
      {serviceCopy.detail?.faqs?.map(faq => <details key={faq.question} className="luxury-faq"><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
      {serviceCopy.detail?.bookingPrompt && <p className="text-muted-foreground">{serviceCopy.detail.bookingPrompt}</p>}
    </div> : <p className="my-5 whitespace-pre-wrap text-muted-foreground">{String(fr ? row.descriptionFr ?? row.captionFr ?? "" : row.description ?? row.captionEn ?? "")}</p>}
    <dl className="space-y-2">{["price", "duration", "sessions", "validityDays", "stock", "category", "order"].filter(key => row[key] != null).map(key => <div key={key} className="flex justify-between gap-6"><dt>{fr ? ({ price: "Prix CAD", duration: "Durée (min)", sessions: "Séances", validityDays: "Validité (jours)", stock: "Stock", category: "Catégorie", order: "Ordre" } as Record<string, string>)[key] : key}</dt><dd>{key === "price" ? (Number(row.price) / 100).toFixed(2) : String(row[key])}</dd></div>)}</dl>
    {row.images?.map((image, index) => <figure key={index} className="mt-6"><img src={image.url} alt={fr ? image.altFr : image.altEn} className="aspect-[4/3] w-full object-contain" /><figcaption className="mt-2 text-sm text-muted-foreground">{fr ? image.altFr : image.altEn}</figcaption></figure>)}
    <button type="button" onClick={close} className="mt-8 rounded-full bg-primary px-5 py-3 text-primary-foreground">{fr ? "Fermer" : "Close"}</button>
  </dialog>;
}
