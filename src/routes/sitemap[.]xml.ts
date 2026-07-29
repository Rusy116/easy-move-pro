import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { STATES, CITIES } from "@/lib/seo/locations";
import { PRODUCT_PAGES, EDUCATION_PAGES, COMPARISON_PAGES } from "@/lib/seo/content";
import { GEO_STATES, GEO_CITIES, GEO_ROUTES, cityPath, statePath, routePath } from "@/lib/seo/geo";

const BASE_URL = "";

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
          { path: "/store", changefreq: "weekly", priority: "0.7" },
          { path: "/blog", changefreq: "weekly", priority: "0.7" },
          { path: "/about", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
          // SEO Partner Acquisition
          { path: "/partners", changefreq: "weekly", priority: "0.9" },
          { path: "/join", changefreq: "monthly", priority: "0.8" },
          { path: "/for-movers", changefreq: "weekly", priority: "0.9" },
          { path: "/resources", changefreq: "weekly", priority: "0.7" },
          { path: "/ai-tools", changefreq: "monthly", priority: "0.7" },
          { path: "/states", changefreq: "monthly", priority: "0.8" },
          { path: "/routes", changefreq: "monthly", priority: "0.8" },
        ];

        // Geo platform pages
        GEO_STATES.forEach((s) =>
          entries.push({ path: statePath(s), changefreq: "monthly", priority: "0.7" }),
        );
        GEO_CITIES.forEach((c) =>
          entries.push({ path: cityPath(c), changefreq: "monthly", priority: "0.7" }),
        );
        GEO_ROUTES.forEach((r) =>
          entries.push({ path: routePath(r), changefreq: "monthly", priority: "0.6" }),
        );

        const citySlugs = [
          "new-york",
          "los-angeles",
          "chicago",
          "austin",
          "san-francisco",
          "miami",
          "seattle",
          "denver",
          "boston",
          "atlanta",
          "phoenix",
          "portland",
          "washington",
          "dallas",
        ];
        citySlugs.forEach((s) =>
          entries.push({ path: `/cities/${s}`, changefreq: "monthly", priority: "0.6" }),
        );

        // Product landing pages
        PRODUCT_PAGES.forEach((p) =>
          entries.push({ path: p.route, changefreq: "weekly", priority: "0.8" }),
        );
        // Education
        EDUCATION_PAGES.forEach((p) =>
          entries.push({ path: `/learn/${p.slug}`, changefreq: "monthly", priority: "0.6" }),
        );
        // Comparisons
        COMPARISON_PAGES.forEach((p) =>
          entries.push({ path: `/compare/${p.slug}`, changefreq: "monthly", priority: "0.7" }),
        );
        // Partner locations
        STATES.forEach((s) =>
          entries.push({ path: `/partners/${s.slug}`, changefreq: "monthly", priority: "0.7" }),
        );
        CITIES.forEach((c) =>
          entries.push({ path: `/partners/${c.slug}`, changefreq: "monthly", priority: "0.6" }),
        );

        const urls = entries
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
