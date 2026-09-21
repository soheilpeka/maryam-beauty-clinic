import type { FaqItem } from "@prisma/client";

export function FaqList({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-10 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-[#211b16]">
      {items.map((item) => (
        <details key={item.id} className="group p-5">
          <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium text-stone-900 marker:content-none dark:text-stone-50">
            <span>{item.question}</span>
            <span aria-hidden="true" className="text-brand-600 transition-transform group-open:rotate-180 dark:text-brand-400">▾</span>
          </summary>
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}