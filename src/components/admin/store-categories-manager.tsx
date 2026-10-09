"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfToken } from "@/lib/admin-client";

type StoreCategory = { id: string; name: string; nameFr: string | null; order: number };

export function StoreCategoriesManager({ locale, onChange }: { locale: string; onChange: (categories: StoreCategory[]) => void }) {
  const fr = locale === "fr";
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [name, setName] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNameFr, setEditNameFr] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/store-categories", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as { categories?: StoreCategory[] };
      const items = data.categories ?? [];
      setCategories(items);
      onChange(items);
      setError("");
    } catch {
      setError(fr ? "Impossible de charger les catégories. Réessayez." : "Could not load categories. Please try again.");
    } finally { setLoading(false); }
  }, [fr, onChange]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => { if (active) void load(); }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [load]);

  async function save(id?: string) {
    const english = (id ? editName : name).trim();
    const french = (id ? editNameFr : nameFr).trim();
    if (english.length < 2 || english.length > 40 || french.length > 40) {
      setError(fr ? "Le nom anglais doit comporter de 2 à 40 caractères; le nom français peut en comporter jusqu’à 40." : "The English name must be 2–40 characters; the French name can be up to 40 characters.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const csrf = await getCsrfToken();
      if (!csrf) throw new Error();
      const response = await fetch(id ? `/api/admin/store-categories/${encodeURIComponent(id)}` : "/api/admin/store-categories", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "x-admin-csrf": csrf },
        body: JSON.stringify({ name: english, nameFr: french }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (response.status === 409 || result.error === "CONFLICT") {
        setError(fr ? "Cette catégorie existe déjà. Choisissez un autre nom." : "That category already exists. Choose a different name.");
        return;
      }
      if (!response.ok) throw new Error();
      setEditing(null); setName(""); setNameFr("");
      setNotice(fr ? "Catégorie enregistrée." : "Category saved.");
      await load();
    } catch {
      setError(fr ? "Impossible d’enregistrer la catégorie. Vérifiez votre connexion et réessayez." : "Could not save the category. Check your connection and try again.");
    } finally { setBusy(false); }
  }

  function beginEdit(category: StoreCategory) {
    setEditing(category.id); setEditName(category.name); setEditNameFr(category.nameFr ?? ""); setError(""); setNotice("");
  }

  return <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="store-categories-title">
    <div className="mb-5">
      <p className="eyebrow">{fr ? "Boutique" : "Store"}</p>
      <h2 id="store-categories-title" className="mt-2 font-serif text-2xl">{fr ? "Catégories de produits" : "Product categories"}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{fr ? "Ajoutez ou renommez les catégories ici. Les changements seront appliqués aux produits concernés et visibles dans les filtres de la boutique." : "Add or rename categories here. Changes will apply to the products in that category and appear in the store filters."}</p>
    </div>
    <form onSubmit={event => { event.preventDefault(); void save(); }} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="block text-sm">{fr ? "Nom anglais" : "English name"}<input required minLength={2} maxLength={40} value={name} onChange={event => setName(event.target.value)} placeholder={fr ? "Ex. : Hair" : "Example: Hair"} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3" /></label>
      <label className="block text-sm">{fr ? "Nom français (facultatif)" : "French name (optional)"}<input maxLength={40} value={nameFr} onChange={event => setNameFr(event.target.value)} placeholder={fr ? "Ex. : Cheveux" : "Example: Cheveux"} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3" /></label>
      <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-primary px-5 text-sm text-primary-foreground disabled:opacity-50">{busy ? (fr ? "Enregistrement…" : "Saving…") : (fr ? "Ajouter" : "Add category")}</button>
    </form>
    {error && <p className="mt-4 rounded-lg border border-destructive/30 p-3 text-sm text-destructive" role="alert">{error}</p>}
    {notice && <p className="mt-4 rounded-lg border border-border p-3 text-sm" role="status">{notice}</p>}
    {loading ? <p className="mt-5 text-sm text-muted-foreground" role="status">{fr ? "Chargement…" : "Loading categories…"}</p> : categories.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">{fr ? "Aucune catégorie pour le moment." : "No categories yet."}</p> : <ul className="mt-5 divide-y divide-border border-y border-border">
      {categories.map(category => <li key={category.id} className="py-3">
        {editing === category.id ? <form onSubmit={event => { event.preventDefault(); void save(category.id); }} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <label className="block text-sm">{fr ? "Nom anglais" : "English name"}<input required minLength={2} maxLength={40} autoFocus value={editName} onChange={event => setEditName(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3" /></label>
          <label className="block text-sm">{fr ? "Nom français" : "French name"}<input maxLength={40} value={editNameFr} onChange={event => setEditNameFr(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3" /></label>
          <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50">{fr ? "Enregistrer" : "Save"}</button>
          <button type="button" disabled={busy} onClick={() => setEditing(null)} className="min-h-11 rounded-full border border-border px-4 text-sm">{fr ? "Annuler" : "Cancel"}</button>
        </form> : <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{category.name}</p><p className="mt-1 text-sm text-muted-foreground">{category.nameFr || (fr ? "Nom français non défini" : "French name not set")}</p></div><button type="button" onClick={() => beginEdit(category)} className="min-h-10 rounded-full border border-border px-4 text-sm hover:border-brand">{fr ? "Renommer" : "Rename"}</button></div>}
      </li>)}
    </ul>}
  </section>;
}
