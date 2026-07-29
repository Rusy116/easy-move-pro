import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Breadcrumbs, InternalLinks, Cta } from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema } from "@/lib/seo/schema";
import { BLOG_CATEGORIES, categorizePost, type BlogCategory } from "@/lib/seo/public-content";

const postsQueryOptions = queryOptions({
  queryKey: ["blog_posts"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug,title,excerpt,published_at,cover_url")
      .eq("published", true)
      .order("published_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

const TITLE = "Moving Guides & Tips — Easy Moving Blog";
const DESC =
  "Expert moving guides for local, long-distance and interstate moves: packing, storage, office moves, family moves, checklists and cost breakdowns.";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: seoMeta({ title: TITLE, description: DESC, path: "/blog" }),
    links: [{ rel: "canonical", href: "/blog" }],
    scripts: [
      jsonLd(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
        ]),
      ),
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(postsQueryOptions);
  },
  component: BlogIndex,
});

function BlogIndex() {
  const { data: posts } = useSuspenseQuery(postsQueryOptions);
  const [cat, setCat] = useState<BlogCategory | "all">("all");

  const tagged = useMemo(() => posts.map((p) => ({ ...p, category: categorizePost(p) })), [posts]);
  const counts = useMemo(() => {
    const m: Partial<Record<BlogCategory, number>> = {};
    tagged.forEach((p) => {
      m[p.category] = (m[p.category] ?? 0) + 1;
    });
    return m;
  }, [tagged]);
  const visible = cat === "all" ? tagged : tagged.filter((p) => p.category === cat);

  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Blog" }]} />
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24">
        <span className="text-xs font-semibold uppercase tracking-widest text-ochre">Guides</span>
        <h1 className="mt-3 font-serif text-5xl font-medium">Move smarter.</h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Field-tested advice from movers who've packed thousands of homes.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>
            All ({tagged.length})
          </Chip>
          {BLOG_CATEGORIES.map((c) => (
            <Chip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>
              {c.label} ({counts[c.key] ?? 0})
            </Chip>
          ))}
        </div>

        <div className="mt-8 divide-y divide-border">
          {visible.map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="block py-8 group"
            >
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="rounded-full border border-border px-2.5 py-1">
                  {BLOG_CATEGORIES.find((c) => c.key === p.category)?.label}
                </span>
                <span>
                  {p.published_at
                    ? new Date(p.published_at).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : ""}
                </span>
              </div>
              <h2 className="mt-2 font-serif text-3xl font-medium group-hover:text-primary transition-colors">
                {p.title}
              </h2>
              <p className="mt-2 text-muted-foreground">{p.excerpt}</p>
              <div className="mt-3 text-sm font-medium text-primary">Read →</div>
            </Link>
          ))}
        </div>

        {visible.length === 0 && (
          <p className="mt-10 text-muted-foreground">No posts in this category yet.</p>
        )}
      </section>

      <InternalLinks
        title="Keep exploring"
        links={[
          { label: "Free resources", to: "/resources" },
          { label: "Digital products", to: "/store" },
          { label: "Movers by state", to: "/states" },
          { label: "Popular routes", to: "/routes" },
          { label: "AI moving tools", to: "/ai-tools" },
        ]}
      />
      <Cta
        title="Ready for a real number?"
        subhead="Instant itemized estimate — no phone call required."
        primaryHref="/calculator"
        primaryLabel="Get my exact quote"
      />
    </SiteLayout>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
