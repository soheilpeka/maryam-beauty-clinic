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
    <div className="admin-shell mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow mb-4">Maryam C Beauté · {locale === "fr" ? "Espace de gestion" : "Studio management"}</p>
          <h1 className="display-heading text-4xl sm:text-5xl">
            {title}
          </h1>
          {hint && (
            <p className="mt-1 text-sm text-muted-foreground dark:text-neutral-400">{hint}</p>
          )}
        </div>
        <AdminAccount locale={locale} name={adminName} email={adminEmail} />
      </div>
      <div className="admin-workspace"><AdminNav locale={locale} /><div className="admin-content">{children}</div></div>
    </div>
  );
}
