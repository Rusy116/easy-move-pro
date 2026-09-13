import { createFileRoute, notFound } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { buildUrlsetXml, CITY_SLUGS_PER_PART, type SitemapEntry } from "@/lib/seo/sitemap-xml";

/**
 * City sitemap part N. Database-driven and quality-gated: only city records
 * that clear the SEO quality gate are listed, and the slice is paged in the
 * database so building one file never loads the whole city table.
 *
 * SR-2: a failed/empty/invalid live read falls back to the Last-Known-Good
 * snapshot for this exact file. An unused partition (no snapshot, empty live
 * result) keeps returning a valid empty file as before.
 */
export const Route = createFileRoute("/sitemap-cities-{$part}.xml")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const part = Number((params as { part: string }).part);
        if (!Number.isInteger(part) || part < 1) throw notFound();

        const { deliverSitemap } = await import("@/lib/seo/sitemap-delivery.server");
        return deliverSitemap({
          partKey: `cities-${part}`,
          kind: "cities",
          emptyAllowedWhenNoSnapshot: true,
          buildLive: async () => {
            const { readIndexableSlugs } = await import("@/lib/city-landing/public-read.server");
            const rows = await readIndexableSlugs(
              CITY_SLUGS_PER_PART,
              (part - 1) * CITY_SLUGS_PER_PART,
            );
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
            return buildUrlsetXml(entries);
          },
        });
      },
    },
  },
});
