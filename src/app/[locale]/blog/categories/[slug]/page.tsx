import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { BLOG_POSTS, BLOG_CATEGORIES, AUTHOR } from "@/lib/content/blog";
import type { Metadata } from "next";

/** Slug <-> category label mapping (matches the hrefs generated on the blog index). */
function categoryFromSlug(slug: string): string | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/ & /g, "-and-").replace(/ /g, "-");
  return BLOG_CATEGORIES.find((c) => norm(c) === slug);
}

export async function generateStaticParams() {
  const norm = (s: string) => encodeURIComponent(s.toLowerCase().replace(/ & /g, "-and-").replace(/ /g, "-"));
  return BLOG_CATEGORIES.map((c) => ({ slug: norm(c) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const cat = categoryFromSlug(decodeURIComponent(slug));
  if (!cat) return {};
  return {
    title: `${cat} | Maryam Beauty Clinic`,
    description: `Articles about ${cat.toLowerCase()} from Maryam Beauty Clinic.`,
    alternates: { canonical: `/${locale}/blog/categories/${slug}` },
  };
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const cat = categoryFromSlug(decodeURIComponent(slug));
  if (!cat) notFound();

  const t = await getTranslations({ locale, namespace: "Blog" });
  const posts = BLOG_POSTS.filter((p) => p.category === cat);

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <nav className="mb-8 flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/blog" className="transition-colors hover:text-brand">
            {t("title")}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-foreground">{cat}</span>
        </nav>

        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="display-heading mt-4 text-4xl sm:text-5xl">{cat}</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {posts.length} {posts.length === 1 ? "article" : "articles"}
        </p>

        <div className="mt-12 divide-y divide-border border-y border-border">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/post/${post.slug}`}
              className="group grid gap-3 py-8 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-8"
            >
              <div>
                <h2 className="font-serif text-xl transition-colors group-hover:text-brand sm:text-2xl">
                  {post.title}
                </h2>
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

        <div className="mt-12">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand transition-opacity hover:opacity-70"
          >
            &larr; {t("allPosts")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export { AUTHOR };