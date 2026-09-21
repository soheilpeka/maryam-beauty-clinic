import type { BusinessSetting } from "@prisma/client";

export function ContactSection({
  setting,
  locale,
}: {
  setting: BusinessSetting | null;
  locale: string;
}) {
  if (!setting) return null;

  return (
    <div className="mt-12 grid gap-8 lg:grid-cols-2">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-[#211b16]">
        <h3 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-50">
          {locale === "fr" ? "Informations" : "Information"}
        </h3>
        <dl className="mt-6 space-y-4 text-sm">
          {setting.phone && (
            <div>
              <dt className="font-medium text-stone-500 dark:text-stone-400">{locale === "fr" ? "Telephone" : "Phone"}</dt>
              <dd className="text-stone-900 dark:text-stone-100">{setting.phone}</dd>
            </div>
          )}
          {setting.email && (
            <div>
              <dt className="font-medium text-stone-500 dark:text-stone-400">{locale === "fr" ? "Courriel" : "Email"}</dt>
              <dd className="text-stone-900 dark:text-stone-100">{setting.email}</dd>
            </div>
          )}
          {(setting.address || setting.city) && (
            <div>
              <dt className="font-medium text-stone-500 dark:text-stone-400">{locale === "fr" ? "Adresse" : "Address"}</dt>
              <dd className="text-stone-900 dark:text-stone-100">
                {setting.address}
                {setting.address && setting.city ? <br /> : null}
                {setting.city}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 dark:border-stone-800 dark:bg-stone-900">
        {setting.mapEmbedUrl ? (
          <iframe
            title={locale === "fr" ? "Carte" : "Map"}
            src={setting.mapEmbedUrl}
            className="h-full min-h-[320px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-stone-500">
            {locale === "fr" ? "Placeholder de carte" : "Map placeholder"}
          </div>
        )}
      </div>
    </div>
  );
}