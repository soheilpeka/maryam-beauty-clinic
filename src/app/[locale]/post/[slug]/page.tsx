import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getPostBySlug, BLOG_POSTS, AUTHOR } from "@/lib/content/blog";
import { BUSINESS } from "@/lib/content/business";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/${locale}/post/${slug}` },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const t = await getTranslations({ locale, namespace: "Blog" });

  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <article className="bg-background">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:py-28">
        <nav className="mb-8 flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/blog" className="transition-colors hover:text-brand">
            {t("title")}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{post.category}</span>
        </nav>

        <p className="text-xs font-semibold uppercase tracking-widest text-brand">
          {post.category}
        </p>
        <h1 className="display-heading mt-4 text-3xl sm:text-4xl lg:text-5xl">
          {post.title}
        </h1>
        <p className="mt-6 text-sm text-muted-foreground">
          {t("by")} {AUTHOR} &middot; {post.date} &middot; {post.readTime}
          {post.updated ? ` &middot; ${t("updated")} ${post.updated}` : ""}
        </p>

        <div className="mt-12 space-y-6 text-base leading-relaxed text-foreground/90">
          {post.body.map((block, i) => {
            if (block.type === "h2") {
              return (
                <h2 key={i} className="display-heading pt-6 text-2xl sm:text-3xl">
                  {block.text}
                </h2>
              );
            }
            if (block.type === "ul") {
              return (
                <ul key={i} className="space-y-3 pl-1">
                  {block.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <span
                        className="mt-2 h-1 w-4 shrink-0 rounded-full bg-gold"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={i} className="text-muted-foreground">
                {block.text}
              </p>
            );
          })}
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="font-serif text-xl">{BUSINESS.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {BUSINESS.neighborhood} &middot; {BUSINESS.address}
          </p>
          <Link
            href="/booking"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.03]"
          >
            {t("readMore").replace("Read more", "Book an appointment")}
          </Link>
        </div>
      </div>

      {related.length > 0 && (
        <section className="border-t border-border bg-card py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="display-heading text-3xl sm:text-4xl">{t("relatedPosts")}</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/post/${p.slug}`}
                  className="group rounded-2xl border border-border bg-background p-7 transition-colors hover:border-brand"
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                    {p.category}
                  </p>
                  <h3 className="mt-3 font-serif text-lg transition-colors group-hover:text-brand sm:text-xl">
                    {p.title}
                  </h3>
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {p.excerpt}
                  </p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    {p.date} &middot; {p.readTime}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}