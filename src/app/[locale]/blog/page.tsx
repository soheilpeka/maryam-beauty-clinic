import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { BLOG_POSTS, BLOG_CATEGORIES, AUTHOR } from "@/lib/content/blog";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("blogTitle"),
    description: t("blogDescription"),
    alternates: { canonical: `/${locale}/blog` },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Blog" });

  const [featured, ...rest] = BLOG_POSTS;

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="display-heading mt-4 text-4xl sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        {/* Featured post */}
        <div className="mt-14 border-y border-border py-10">
          <Link href={`/post/${featured.slug}`} className="group grid gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                {featured.category}
              </p>
              <h2 className="display-heading mt-4 text-3xl transition-colors group-hover:text-brand sm:text-4xl">
                {featured.title}
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
                {featured.excerpt}
              </p>
              <p className="mt-6 text-xs text-muted-foreground">
                {t("by")} {AUTHOR} &middot; {featured.date} &middot; {featured.readTime}
              </p>
            </div>
            <div className="flex items-center">
              <span className="font-serif text-7xl italic text-border" aria-hidden="true">
                &ldquo;
              </span>
            </div>
          </Link>
        </div>

        {/* Post list */}
        <div className="mt-4 divide-y divide-border">
          {rest.map((post) => (
            <Link
              key={post.slug}
              href={`/post/${post.slug}`}
              className="group grid gap-3 py-8 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-8"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                  {post.category}
                </p>
                <h3 className="mt-2 font-serif text-xl transition-colors group-hover:text-brand sm:text-2xl">
                  {post.title}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                {post.date} &middot; {post.readTime}
              </p>
            </Link>
          ))}
        </div>

        {/* Categories */}
        <div className="mt-16 border-t border-border pt-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-brand">
            {t("categories")}
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {BLOG_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/blog/categories/${encodeURIComponent(cat.toLowerCase().replace(/ & /g, "-and-").replace(/ /g, "-"))}`}
                className="rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}