import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { renderSitemapIndex, CITY_SLUGS_PER_PART } from "@/lib/seo/sitemap-xml";

/**
 * Sitemap index. City URLs come from the database only, and only for records
 * that pass the SEO quality gate, split across parts so no single file
 * exceeds the 50,000-URL limit.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let total = 0;
        try {
          const { countIndexableCities } = await import(
            "@/lib/city-landing/public-read.server"
          );
          total = await countIndexableCities();
        } catch {
          total = 0;
        }
        const parts = Math.max(1, Math.ceil(total / CITY_SLUGS_PER_PART));
        const paths = ["/sitemap-pages.xml"];
        for (let i = 1; i <= parts; i++) paths.push(`/sitemap-cities-${i}.xml`);
        return renderSitemapIndex(paths);
      },
    },
  },
});
