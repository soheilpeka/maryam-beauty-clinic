"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { getCsrfToken } from "@/lib/admin-client";

type Settings = { enabled: boolean; shippingFeeCents: number; freeShippingThresholdCents: number; reservationMinutes: number };

export function StoreSettingsView() {
  const t = useTranslations("Admin");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [shipping, setShipping] = useState("");
  const [threshold, setThreshold] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/store-settings", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      const data = (await response.json()).settings as Settings;
      if (controller.signal.aborted) return;
      setSettings(data);
      setShipping((data.shippingFeeCents / 100).toFixed(2));
      setThreshold((data.freeShippingThresholdCents / 100).toFixed(2));
      setMinutes(String(data.reservationMinutes));
      setError("");
    }).catch(() => { if (!controller.signal.aborted) setError(t("storeSettingsLoadError")); });
    return () => controller.abort();
  }, [reload, t]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const csrf = await getCsrfToken();
      if (!csrf) throw new Error();
      const response = await fetch("/api/admin/store-settings", {
        method: "PATCH", headers: { "content-type": "application/json", "x-admin-csrf": csrf },
        body: JSON.stringify({ enabled: settings.enabled, shippingFeeCents: Math.round(Number(shipping) * 100), freeShippingThresholdCents: Math.round(Number(threshold) * 100), reservationMinutes: Number(minutes) }),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()).settings as Settings;
      setSettings(data); setShipping((data.shippingFeeCents / 100).toFixed(2)); setThreshold((data.freeShippingThresholdCents / 100).toFixed(2)); setMinutes(String(data.reservationMinutes)); setNotice(t("storeSettingsSaved"));
    } catch { setError(t("storeSettingsSaveError")); }
    finally { setBusy(false); }
  }

  if (!settings && error) return <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error} <button type="button" onClick={() => setReload(value => value + 1)} className="underline">{t("retry")}</button></p>;
  if (!settings) return <div role="status" aria-busy="true" className="rounded-xl border border-border p-5">{t("loadingOrders")}</div>;
  return <form onSubmit={save} className="max-w-2xl space-y-6">
    {notice && <p role="status" className="rounded-xl border border-border p-4 text-sm">{notice}</p>}
    {error && <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error}</p>}
    <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-border p-4"><span><span className="block font-medium">{t("storeOrdersEnabled")}</span><span className="mt-1 block text-sm text-muted-foreground">{t("storeOrdersEnabledHint")}</span></span><input type="checkbox" checked={settings.enabled} disabled={busy} onChange={event => setSettings({ ...settings, enabled: event.target.checked })} className="size-5 accent-primary" /></label>
    <MoneyField label={t("storeShippingFee")} value={shipping} disabled={busy} onChange={setShipping} max="5000" />
    <MoneyField label={t("storeFreeShippingThreshold")} value={threshold} disabled={busy} onChange={setThreshold} hint={t("storeFreeShippingThresholdHint")} max="50000" />
    <label className="block text-sm font-medium">{t("storeReservationMinutes")}<input type="number" min="30" max="60" step="1" required value={minutes} disabled={busy} onChange={event => setMinutes(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3" /></label>
    <p className="text-sm text-muted-foreground">{t("storeSettingsPaymentNote")}</p>
    <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-primary px-5 py-2 font-medium text-primary-foreground disabled:opacity-60">{busy ? t("saving") : t("save")}</button>
  </form>;
}

function MoneyField({ label, value, disabled, onChange, hint, max }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void; hint?: string; max: string }) {
  return <label className="block text-sm font-medium">{label}{hint && <span className="mt-1 block font-normal text-muted-foreground">{hint}</span>}<span className="mt-2 flex min-h-11 items-center rounded-lg border border-border bg-background px-3"><span aria-hidden="true" className="mr-2 text-muted-foreground">$</span><input type="number" min="0" max={max} step="0.01" required value={value} disabled={disabled} onChange={event => onChange(event.target.value)} className="w-full bg-transparent outline-none" /></span></label>;
}
