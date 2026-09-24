"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { formatPrice } from "@/lib/datetime";

/**
 * Dashboard: a read-only summary of the salon's day. Numbers and series come from
 * /api/admin/stats, which computes everything server-side; this component only renders.
 */

interface DayCount {
  dayKey: string;
  confirmed: number;
  pending: number;
}
interface PopularService {
  serviceId: string;
  name: string;
  bookings: number;
  revenue: number;
}
interface StaffLoad {
  staffId: string;
  name: string;
  bookings: number;
}
interface Stats {
  ok: true;
  generatedAt: string;
  todayKey: string;
  counts: {
    pending: number;
    confirmedToday: number;
    confirmedThisWeek: number;
    customers: number;
    revenueAllTime: number;
    revenueThisWeek: number;
  };
  days: DayCount[];
  popularServices: PopularService[];
  staffLoad: StaffLoad[];
}

function weekdayShort(dayKey: string, locale: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    weekday: "short",
    day: "numeric",
  });
}

export function DashboardView({ locale }: { locale: string }) {
  const t = useTranslations("Admin");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) throw new Error("stats failed");
      setStats((await res.json()) as Stats);
    } catch {
      setError(t("errorHint"));
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div aria-busy="true" aria-label={t("loadingStats")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-[#1a1512]"
          >
            <div className="h-3 w-1/2 rounded bg-stone-200 dark:bg-stone-800" />
            <div className="mt-3 h-6 w-1/3 rounded bg-stone-200 dark:bg-stone-800" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-3 py-3 text-sm dark:border-red-800 dark:bg-red-950/40">
        <p className="font-medium text-red-700 dark:text-red-300">{t("errorTitle")}</p>
        <p className="mt-0.5 text-red-600 dark:text-red-400">{error ?? t("errorHint")}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/60"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  const { counts } = stats;
  const maxDay = Math.max(1, ...stats.days.map((d) => d.confirmed + d.pending));
  const maxLoad = Math.max(1, ...stats.staffLoad.map((s) => s.bookings));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label={t("statusPending")} value={String(counts.pending)} to={`/${locale}/admin/requests`}>
          {counts.pending > 0 ? t("pendingHint") : t("noPending")}
        </KpiCard>
        <KpiCard label={t("confirmedToday")} value={String(counts.confirmedToday)}>
          {counts.confirmedToday > 0 ? t("confirmedTodayHint") : t("noBookingsToday")}
        </KpiCard>
        <KpiCard label={t("confirmedThisWeek")} value={String(counts.confirmedThisWeek)}>
          {formatPrice(counts.revenueThisWeek, locale)} {t("revenueSuffix")}
        </KpiCard>
        <KpiCard label={t("customers")} value={String(counts.customers)}>
          {t("customersHint")}
        </KpiCard>
        <KpiCard
          label={t("revenueAllTime")}
          value={formatPrice(counts.revenueAllTime, locale)}
        >
          {t("revenueAllTimeHint")}
        </KpiCard>
        <KpiCard label={t("popularServices")} value={stats.popularServices[0]?.name ?? "-"}>
          {stats.popularServices[0]
            ? `${stats.popularServices[0].bookings} ${t("bookingsWord")}`
            : t("noPopular")}
        </KpiCard>
      </div>

      <section
        aria-labelledby="chart-title"
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-[#1a1512]"
      >
        <h2 id="chart-title" className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-50">
          {t("chartTitle")}
        </h2>
        <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">{t("chartHint")}</p>
        {maxDay <= 1 && stats.days.every((d) => d.confirmed === 0 && d.pending === 0) ? (
          <p className="mt-6 text-sm text-stone-600 dark:text-stone-400">{t("noBookings")}</p>
        ) : (
          <ul className="mt-6 flex h-40 items-end gap-1.5 sm:gap-2" role="img" aria-label={t("chartAriaLabel")}>
            {stats.days.map((d) => {
              const total = d.confirmed + d.pending;
              const heightPct = Math.max((total / maxDay) * 100, total > 0 ? 6 : 2);
              return (
                <li
                  key={d.dayKey}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                  title={`${weekdayShort(d.dayKey, locale)}: ${d.confirmed} ${t("confirmedWord")} / ${d.pending} ${t(
                    "pendingWord",
                  )}`}
                >
                  <span
                    className="flex w-full flex-col justify-end rounded-t-md bg-brand-600/90"
                    style={{ height: `${heightPct}%` }}
                  >
                    {d.pending > 0 && (
                      <span className="block w-full rounded-t-md bg-amber-400/90" style={{ height: "30%" }} />
                    )}
                  </span>
                  <span className="sr-only">
                    {weekdayShort(d.dayKey, locale)}: {d.confirmed} {t("confirmedWord")}, {d.pending}{" "}
                    {t("pendingWord")}
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 sm:text-xs">
                    {weekdayShort(d.dayKey, locale)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3 flex gap-4 text-xs text-stone-500 dark:text-stone-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-600" /> {t("confirmedWord")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> {t("pendingWord")}
          </span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          aria-labelledby="popular-title"
          className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-[#1a1512]"
        >
          <h2 id="popular-title" className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-50">
            {t("popularServices")}
          </h2>
          {stats.popularServices.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">{t("noPopular")}</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {stats.popularServices.map((s, i) => (
                <li key={s.serviceId} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-stone-900 dark:text-stone-100">
                    <span className="font-mono text-xs text-stone-400">{i + 1}.</span>
                    <span className="truncate">{s.name}</span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2 text-sm">
                    <span className="font-medium text-stone-900 dark:text-stone-100">{s.bookings}</span>
                    <span className="text-stone-500 dark:text-stone-400">
                      {formatPrice(s.revenue, locale)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section
          aria-labelledby="staffload-title"
          className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-[#1a1512]"
        >
          <h2 id="staffload-title" className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-50">
            {t("staffLoadTitle")}
          </h2>
          {stats.staffLoad.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">{t("noStaffLoad")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.staffLoad.map((s) => (
                <li key={s.staffId} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-sm text-stone-900 dark:text-stone-100">
                    {s.name}
                  </span>
                  <span
                    className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
                    role="img"
                    aria-label={`${s.name}: ${s.bookings} ${t("bookingsWord")}`}
                  >
                    <span
                      className="block h-full rounded-full bg-brand-600"
                      style={{ width: `${(s.bookings / maxLoad) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-right text-sm font-medium text-stone-900 dark:text-stone-100">
                    {s.bookings}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  children,
  to,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
  to?: string;
}) {
  const inner = (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:border-stone-300 dark:border-stone-800 dark:bg-[#1a1512] dark:hover:border-stone-700">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</p>
      <p className="mt-2 font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">{value}</p>
      {children && (
        <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">{children}</p>
      )}
    </div>
  );
  if (to) {
    return (
      <Link href={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-2xl">
        {inner}
      </Link>
    );
  }
  return inner;
}