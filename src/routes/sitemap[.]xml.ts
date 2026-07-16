import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

interface SitemapEntry {
  path: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/calculator", changefreq: "weekly", priority: "0.9" },
          { path: "/services", changefreq: "monthly", priority: "0.8" },
          { path: "/cities", changefreq: "monthly", priority: "0.8" },
          { path: "/store", changefreq: "weekly", priority: "0.7" },
          { path: "/blog", changefreq: "weekly", priority: "0.7" },
          { path: "/about", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
        ];

        const citySlugs = [
          "new-york", "los-angeles", "chicago", "austin", "san-francisco", "miami",
          "seattle", "denver", "boston", "atlanta", "phoenix", "portland",
          "washington", "dallas",
        ];
        const cityEntries: SitemapEntry[] = citySlugs.map((s) => ({
          path: `/cities/${s}`,
          changefreq: "monthly",
          priority: "0.6",
        }));

        const entries = [...staticEntries, ...cityEntries];
        const urls = entries
          .map((e) =>
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
