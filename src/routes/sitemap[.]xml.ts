import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { buildSitemapIndexXml, CITY_SLUGS_PER_PART } from "@/lib/seo/sitemap-xml";

/**
 * Sitemap index. City URLs come from the database only, and only for records
 * that pass the SEO quality gate, split across parts so no single file
 * exceeds the 50,000-URL limit.
 *
 * SR-2: live generation is primary; if the live read fails or the result does
 * not validate, the active Last-Known-Good snapshot is served instead.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { deliverSitemap } = await import("@/lib/seo/sitemap-delivery.server");
        return deliverSitemap({
          partKey: "index",
          kind: "index",
          buildLive: async () => {
            const { countIndexableCities } = await import(
              "@/lib/city-landing/public-read.server"
            );
            const total = await countIndexableCities();
            if (!Number.isFinite(total) || total <= 0) {
              throw new Error("city inventory read returned zero rows");
            }
            const parts = Math.max(1, Math.ceil(total / CITY_SLUGS_PER_PART));
            const paths = ["/sitemap-pages.xml"];
            for (let i = 1; i <= parts; i++) paths.push(`/sitemap-cities-${i}.xml`);
            return buildSitemapIndexXml(paths);
          },
        });
      },
    },
  },
});
