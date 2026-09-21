import type { Staff } from "@prisma/client";

export function StaffList({ staff, locale }: { staff: Staff[]; locale: string }) {
  if (staff.length === 0) {
    return (
      <p className="mt-10 text-center text-stone-500 dark:text-stone-400">
        {locale === "fr" ? "Aucun membre de l'equipe pour le moment." : "No team members yet."}
      </p>
    );
  }

  return (
    <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {staff.map((m) => (
        <li
          key={m.id}
          className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-stone-800 dark:bg-[#211b16]"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-200 to-brand-400 font-serif text-2xl font-semibold text-white">
            {m.name.charAt(0)}
          </div>
          <h3 className="mt-4 font-serif text-lg font-semibold text-stone-900 dark:text-stone-50">
            {m.name}
          </h3>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">
            {m.role}
          </p>
          {m.bio && (
            <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">{m.bio}</p>
          )}
        </li>
      ))}
    </ul>
  );
}