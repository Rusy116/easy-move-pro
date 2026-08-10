import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { STATES, CITIES } from "@/lib/seo/locations";
import { PRODUCT_PAGES, EDUCATION_PAGES, COMPARISON_PAGES } from "@/lib/seo/content";
import { GEO_STATES, GEO_ROUTES, statePath, routePath } from "@/lib/seo/geo";

// Canonical production origin (matches SITE_ORIGIN used for city canonicals).
const BASE_URL = "https://mycity-move.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: string;
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
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

        // Geo platform pages (states + long-distance routes)
        GEO_STATES.forEach((s) =>
          entries.push({ path: statePath(s), changefreq: "monthly", priority: "0.7" }),
        );
        GEO_ROUTES.forEach((r) =>
          entries.push({ path: routePath(r), changefreq: "monthly", priority: "0.6" }),
        );

        // ── City network: DATABASE ONLY ────────────────────────────────────
        // Canonical calculator page for every published city record, plus the
        // /movers page only when its SEO content is published. No bundled or
        // static city list is used, so no unpublished/404 URL can leak in.
        try {
          const { readAllPublishedSlugs } = await import(
            "@/lib/city-landing/public-read.server"
          );
          const rows = await readAllPublishedSlugs();
          for (const r of rows) {
            entries.push({
              path: `/moving-calculator-${r.slug}`,
              changefreq: "weekly",
              priority: "0.8",
            });
            if (r.seoPublished) {
              entries.push({ path: `/movers/${r.slug}`, changefreq: "weekly", priority: "0.8" });
            }
          }
        } catch {
          /* sitemap stays valid even if the city database is unreachable */
        }

        // Product landing pages
        PRODUCT_PAGES.forEach((p) =>
          entries.push({ path: p.route, changefreq: "weekly", priority: "0.8" }),
        );
        EDUCATION_PAGES.forEach((p) =>
          entries.push({ path: `/learn/${p.slug}`, changefreq: "monthly", priority: "0.6" }),
        );
        COMPARISON_PAGES.forEach((p) =>
          entries.push({ path: `/compare/${p.slug}`, changefreq: "monthly", priority: "0.7" }),
        );

        // Digital products (published only)
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
          /* sitemap stays valid even if the store is unreachable */
        }

        // Partner locations
        STATES.forEach((s) =>
          entries.push({ path: `/partners/${s.slug}`, changefreq: "monthly", priority: "0.7" }),
        );
        CITIES.forEach((c) =>
          entries.push({ path: `/partners/${c.slug}`, changefreq: "monthly", priority: "0.6" }),
        );

        const seen = new Set<string>();
        const urls = entries
          .filter((e) => (seen.has(e.path) ? false : (seen.add(e.path), true)))
          .map(
            (e) =>
              `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n${e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>\n` : ""}${e.priority ? `    <priority>${e.priority}</priority>\n` : ""}  </url>`,
          )
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
