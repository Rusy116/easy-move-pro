// Shared XML rendering + static entry list for the sitemap index and its parts.
export interface SitemapEntry {
  path: string;
  changefreq?: string;
  priority?: string;
}

export const SITEMAP_BASE_URL = "https://easymove.pro";

/**
 * Part sizing is computed from GENERATED URL COUNT, not slug count.
 * Google allows 50,000 URLs per sitemap file; we keep a safety margin.
 */
export const MAX_URLS_PER_SITEMAP = 45_000;
/** Each eligible city yields up to 2 URLs (/moving-calculator-<slug> and /movers/<slug>). */
export const URLS_PER_CITY = 2;
/** Slugs per city sitemap part, derived from the URL cap. */
export const CITY_SLUGS_PER_PART = Math.floor(MAX_URLS_PER_SITEMAP / URLS_PER_CITY);

export function renderUrlset(entries: SitemapEntry[]): Response {
  const seen = new Set<string>();
  const urls = entries
    .filter((e) => (seen.has(e.path) ? false : (seen.add(e.path), true)))
    .map(
      (e) =>
        `  <url>\n    <loc>${SITEMAP_BASE_URL}${e.path}</loc>\n${e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>\n` : ""}${e.priority ? `    <priority>${e.priority}</priority>\n` : ""}  </url>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
  });
}

export function renderSitemapIndex(paths: string[]): Response {
  const body = paths
    .map((p) => `  <sitemap>\n    <loc>${SITEMAP_BASE_URL}${p}</loc>\n  </sitemap>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
  });
}
