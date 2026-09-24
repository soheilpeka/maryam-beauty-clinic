import { AdminNav } from "@/components/admin/admin-nav";
import { AdminAccount } from "@/components/admin/admin-account";

/**
 * Shared chrome for an admin page: title, hint, the account/sign-out control and the section
 * navigation. Server component - the interactive pieces inside are client components.
 */
export function AdminPageShell({
  locale,
  title,
  hint,
  adminName,
  adminEmail,
  children,
}: {
  locale: string;
  title: string;
  hint?: string;
  adminName: string | null;
  adminEmail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50 sm:text-3xl">
            {title}
          </h1>
          {hint && (
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{hint}</p>
          )}
        </div>
        <AdminAccount locale={locale} name={adminName} email={adminEmail} />
      </div>
      <AdminNav locale={locale} />
      {children}
    </div>
  );
}