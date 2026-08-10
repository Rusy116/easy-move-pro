import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { STATES, CITIES } from "@/lib/seo/locations";
import { PRODUCT_PAGES, EDUCATION_PAGES, COMPARISON_PAGES } from "@/lib/seo/content";
import { GEO_STATES, GEO_ROUTES, statePath, routePath } from "@/lib/seo/geo";
import { renderUrlset, type SitemapEntry } from "@/lib/seo/sitemap-xml";

/** Non-city public pages. */
export const Route = createFileRoute("/sitemap-pages.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/calculator", changefreq: "weekly", priority: "0.9" },
          { path: "/services", changefreq: "monthly", priority: "0.8" },
          { path: "/cities", changefreq: "monthly", priority: "0.8" },
          { path: "/products", changefreq: "weekly", priority: "0.7" },
          { path: "/blog", changefreq: "weekly", priority: "0.7" },
          { path: "/about", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
          { path: "/partners", changefreq: "weekly", priority: "0.9" },
          { path: "/join", changefreq: "monthly", priority: "0.8" },
          { path: "/for-movers", changefreq: "weekly", priority: "0.9" },
          { path: "/resources", changefreq: "weekly", priority: "0.7" },
          { path: "/ai-tools", changefreq: "monthly", priority: "0.7" },
          { path: "/states", changefreq: "monthly", priority: "0.8" },
          { path: "/routes", changefreq: "monthly", priority: "0.8" },
          { path: "/sitemap", changefreq: "weekly", priority: "0.5" },
        ];

        GEO_STATES.forEach((s) =>
          entries.push({ path: statePath(s), changefreq: "monthly", priority: "0.7" }),
        );
        GEO_ROUTES.forEach((r) =>
          entries.push({ path: routePath(r), changefreq: "monthly", priority: "0.6" }),
        );

        PRODUCT_PAGES.forEach((p) =>
          entries.push({ path: p.route, changefreq: "weekly", priority: "0.8" }),
        );
        EDUCATION_PAGES.forEach((p) =>
          entries.push({ path: `/learn/${p.slug}`, changefreq: "monthly", priority: "0.6" }),
        );
        COMPARISON_PAGES.forEach((p) =>
          entries.push({ path: `/compare/${p.slug}`, changefreq: "monthly", priority: "0.7" }),
        );

        try {
          const { createClient } = await import("@supabase/supabase-js");
          const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
          const url = process.env["SUPABASE_URL"] ?? "";
          if (key && url) {
            const db = createClient(url, key, { auth: { persistSession: false } });
            const { data } = await db
              .from("pdf_products")
              .select("slug")
              .eq("status", "published")
              .limit(5000);
            (data ?? []).forEach((p: { slug: string }) =>
              entries.push({ path: `/products/${p.slug}`, changefreq: "weekly", priority: "0.7" }),
            );
          }
        } catch {
          /* stay valid if the store is unreachable */
        }

        STATES.forEach((s) =>
          entries.push({ path: `/partners/${s.slug}`, changefreq: "monthly", priority: "0.7" }),
        );
        CITIES.forEach((c) =>
          entries.push({ path: `/partners/${c.slug}`, changefreq: "monthly", priority: "0.6" }),
        );

        return renderUrlset(entries);
      },
    },
  },
});
