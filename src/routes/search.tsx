import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Breadcrumbs, InternalLinks } from "@/components/seo/blocks";
import { seoMeta } from "@/lib/seo/schema";
import { supabase } from "@/integrations/supabase/client";
import { GEO_CITIES, GEO_ROUTES, cityPath } from "@/lib/seo/geo";
import { RESOURCES } from "@/lib/seo/public-content";

const TITLE = "Search — Cities, Guides, Resources & Products | Easy Moving";
const DESC =
  "Search Easy Moving for city moving costs, routes, guides, free resources and digital planning products.";

type Hit = { group: string; label: string; sub?: string; to: string };

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      ...seoMeta({ title: TITLE, description: DESC, path: "/search" }),
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/search" }],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();

  const { data: posts = [] } = useQuery({
    queryKey: ["search", "blog_posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("slug,title,excerpt")
        .eq("published", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["search", "digital_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("digital_products")
        .select("slug,title,description")
        .eq("published", true);
      if (error) throw error;
      return data;
    },
  });

  const hits = useMemo<Hit[]>(() => {
    if (term.length < 2) return [];
    const match = (...parts: Array<string | null | undefined>) =>
      parts.filter(Boolean).join(" ").toLowerCase().includes(term);

    const out: Hit[] = [];
    GEO_CITIES.filter((c) => match(c.name, c.stateName, c.stateCode))
      .slice(0, 10)
      .forEach((c) =>
        out.push({ group: "Cities", label: `${c.name} Movers`, sub: c.stateName, to: cityPath(c) }),
      );
    GEO_ROUTES.filter((r) => match(r.from.name, r.to.name))
      .slice(0, 8)
      .forEach((r) =>
        out.push({
          group: "Routes",
          label: `${r.from.name} → ${r.to.name}`,
          sub: `${r.miles.toLocaleString()} mi`,
          to: `/routes/${r.slug}`,
        }),
      );
    posts
      .filter((p) => match(p.title, p.excerpt))
      .slice(0, 8)
      .forEach((p) =>
        out.push({
          group: "Blog",
          label: p.title,
          sub: p.excerpt ?? undefined,
          to: `/blog/${p.slug}`,
        }),
      );
    RESOURCES.filter((r) => match(r.title, r.description))
      .slice(0, 8)
      .forEach((r) =>
        out.push({ group: "Resources", label: r.title, sub: r.description, to: "/resources" }),
      );
    products
      .filter((p) => match(p.title, p.description))
      .slice(0, 8)
      .forEach((p) =>
        out.push({ group: "Store", label: p.title, sub: p.description ?? undefined, to: "/store" }),
      );
    return out;
  }, [term, posts, products]);

  const groups = ["Cities", "Routes", "Blog", "Resources", "Store"].filter((g) =>
    hits.some((h) => h.group === g),
  );

  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Search" }]} />
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24">
        <h1 className="font-serif text-5xl font-medium">Search.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Cities, routes, guides, free resources and digital products.
        </p>

        <div className="relative mt-8">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try “Los Angeles”, “packing”, “Seattle to Portland”…"
            className="h-14 rounded-full pl-11 text-base"
            aria-label="Search Easy Moving"
          />
        </div>

        {term.length >= 2 && hits.length === 0 && (
          <p className="mt-10 text-muted-foreground">No matches for “{q}”.</p>
        )}

        <div className="mt-10 space-y-10">
          {groups.map((g) => (
            <div key={g}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {g}
              </h2>
              <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
                {hits
                  .filter((h) => h.group === g)
                  .map((h) => (
                    <li key={`${h.group}-${h.to}-${h.label}`}>
                      <Link
                        to={h.to as "/"}
                        className="block px-5 py-4 hover:bg-muted/40 transition-colors"
                      >
                        <div className="font-medium">{h.label}</div>
                        {h.sub && (
                          <div className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                            {h.sub}
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <InternalLinks
        title="Popular destinations"
        links={[
          { label: "Movers by state", to: "/states" },
          { label: "Popular routes", to: "/routes" },
          { label: "Resources", to: "/resources" },
          { label: "AI tools", to: "/ai-tools" },
          { label: "Digital store", to: "/store" },
        ]}
      />
    </SiteLayout>
  );
}
