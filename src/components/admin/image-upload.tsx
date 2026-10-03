"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { getCsrfToken } from "@/lib/admin-client";

export function ImageUpload({ onUploaded, label, onActivity }: { onUploaded: (url: string) => void; label: string; onActivity?: (active: boolean) => void }) {
  const fr = useLocale() === "fr";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<AbortController | null>(null);
  const activity = useRef(onActivity);
  useEffect(() => { activity.current = onActivity; }, [onActivity]);
  useEffect(() => () => { if (pending.current) { pending.current.abort(); pending.current = null; activity.current?.(false); } }, []);
  async function upload(file: File) {
    if (file.size > 10 * 1024 * 1024) { setMessage(fr ? "La photo doit faire moins de 10 Mo." : "The photo must be under 10 MB."); return; }
    const controller = new AbortController();
    pending.current = controller;
    activity.current?.(true);
    setBusy(true); setMessage("");
    try {
      const csrf = await getCsrfToken(true);
      if (!csrf) throw new Error();
      const response = await fetch("/api/admin/media/upload", { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "x-admin-csrf": csrf }, body: file, signal: controller.signal });
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        if (["INVALID_IMAGE", "TOO_LARGE"].includes(result.error)) setMessage(fr ? "Choisissez une photo JPEG, PNG ou WebP de moins de 10 Mo (24 mégapixels max). Pour HEIC, exportez en JPEG." : "Choose a JPEG, PNG or WebP photo under 10 MB (24 megapixels max). Export HEIC as JPEG.");
        else if (result.error === "STORAGE_FULL") setMessage(fr ? "Le stockage des photos est plein. Contactez la personne responsable du site." : "Photo storage is full. Contact the site administrator.");
        else setMessage(fr ? "Téléversement impossible. Réessayez dans une minute." : "Upload failed. Try again in a minute.");
        return;
      }
      onUploaded(result.url);
    } catch { if (!controller.signal.aborted) setMessage(fr ? "Téléversement impossible. Vérifiez votre connexion et réessayez." : "Upload failed. Check your connection and try again."); }
    finally { if (pending.current === controller) { pending.current = null; activity.current?.(false); setBusy(false); if (input.current) input.current.value = ""; } }
  }
  return <div className="mt-2 space-y-2">
    <label className="block text-sm">{fr ? `Téléverser : ${label}` : `Upload: ${label}`}<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); }} className="mt-1 block w-full max-w-full text-sm file:mr-3 file:rounded-full file:border file:border-border file:bg-background file:px-4 file:py-2" /></label>
    <p role="status" className="text-xs text-muted-foreground">{busy ? (fr ? "Téléversement…" : "Uploading…") : (fr ? "JPEG, PNG ou WebP, 10 Mo max. Enregistrez le contenu actif pour afficher la photo aux visiteurs." : "JPEG, PNG or WebP, up to 10 MB. Save active content to show the photo to visitors.")}</p>
    {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
  </div>;
}
