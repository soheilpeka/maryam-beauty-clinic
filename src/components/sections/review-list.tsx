import type { Review } from "@prisma/client";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;

  return (
    <ul className="mt-12 grid gap-6 md:grid-cols-3">
      {reviews.map((r) => (
        <li
          key={r.id}
          className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-[#211b16]"
        >
          <div className="flex gap-1 text-amber-500" aria-label={`${r.rating} / 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} aria-hidden="true">{i < r.rating ? "★" : "☆"}</span>
            ))}
          </div>
          <p className="mt-4 flex-1 text-sm text-stone-700 dark:text-stone-300">“{r.text}”</p>
          <p className="mt-4 text-sm font-semibold text-stone-900 dark:text-stone-50">{r.author}</p>
        </li>
      ))}
    </ul>
  );
}