import { createFileRoute, notFound } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { renderUrlset, CITY_SLUGS_PER_PART, type SitemapEntry } from "@/lib/seo/sitemap-xml";

/**
 * City sitemap part N. Database-driven and quality-gated: only city records
 * that clear the SEO quality gate are listed, and the slice is paged in the
 * database so building one file never loads the whole city table.
 */
export const Route = createFileRoute("/sitemap-cities-{$part}.xml")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const part = Number((params as { part: string }).part);
        if (!Number.isInteger(part) || part < 1) throw notFound();

        let rows: Array<{ slug: string; seoPublished: boolean }> = [];
        try {
          const { readIndexableSlugs } = await import("@/lib/city-landing/public-read.server");
          rows = await readIndexableSlugs(CITY_SLUGS_PER_PART, (part - 1) * CITY_SLUGS_PER_PART);
        } catch {
          rows = [];
        }

        const entries: SitemapEntry[] = [];
        for (const r of rows) {
          entries.push({
            path: `/moving-calculator-${r.slug}`,
            changefreq: "weekly",
            priority: "0.8",
          });
          if (r.seoPublished) {
            entries.push({ path: `/movers/${r.slug}`, changefreq: "weekly", priority: "0.7" });
          }
        }
        return renderUrlset(entries);
      },
    },
  },
});
