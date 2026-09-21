import { Link } from "@/i18n/routing";
import { formatPrice, formatDuration } from "@/lib/datetime";
import type { Service } from "@prisma/client";

export function ServiceList({ services, locale }: { services: Service[]; locale: string }) {
  if (services.length === 0) {
    return (
      <p className="mt-10 text-center text-stone-500 dark:text-stone-400">
        {locale === "fr" ? "Aucun service pour le moment." : "No services available yet."}
      </p>
    );
  }

  return (
    <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => (
        <li
          key={s.id}
          className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-stone-800 dark:bg-[#211b16]"
        >
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-50">
              {s.name}
            </h3>
            <span className="shrink-0 text-sm font-semibold text-brand-600 dark:text-brand-400">
              {formatPrice(s.price, locale)}
            </span>
          </div>
          <p className="mt-2 flex-1 text-sm text-stone-600 dark:text-stone-400">
            {s.description}
          </p>
          <div className="mt-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              <span aria-hidden="true">◷</span> {formatDuration(s.duration, locale)}
            </span>
            <Link
              href={`/booking?service=${s.slug}`}
              className="text-sm font-semibold text-stone-800 transition-colors group-hover:text-brand-600 dark:text-stone-200 dark:group-hover:text-brand-400"
            >
              {locale === "fr" ? "Reserver" : "Book"} →
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}