import { createFileRoute, notFound } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { renderUrlset, CITY_SLUGS_PER_PART, type SitemapEntry } from "@/lib/seo/sitemap-xml";

/**
 * City sitemap part N. Database-driven: only published city records.
 * /moving-calculator-{slug} always; /movers/{slug} only when SEO-published.
 */
export const Route = createFileRoute("/sitemap-cities-{$part}.xml")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const part = Number((params as { part: string }).part);
        if (!Number.isInteger(part) || part < 1) throw notFound();

        let rows: Array<{ slug: string; seoPublished: boolean }> = [];
        try {
          const { readAllPublishedSlugs } = await import(
            "@/lib/city-landing/public-read.server"
          );
          rows = await readAllPublishedSlugs();
        } catch {
          rows = [];
        }

        const start = (part - 1) * CITY_SLUGS_PER_PART;
        const slice = rows.slice(start, start + CITY_SLUGS_PER_PART);

        const entries: SitemapEntry[] = [];
        for (const r of slice) {
          entries.push({
            path: `/moving-calculator-${r.slug}`,
            changefreq: "weekly",
            priority: "0.8",
          });
          if (r.seoPublished) {
            entries.push({ path: `/movers/${r.slug}`, changefreq: "weekly", priority: "0.8" });
          }
        }
        return renderUrlset(entries);
      },
    },
  },
});
