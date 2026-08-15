/**
 * CDN caching for anonymous, database-driven SEO pages (city landing pages,
 * store pages). These documents contain no per-user data, so the edge may
 * serve a cached copy while it revalidates in the background.
 *
 * Safe to call from an isomorphic route loader — it no-ops in the browser.
 */
export async function cachePublicPage(sMaxAge = 3600, staleWhileRevalidate = 86400) {
  if (typeof window !== "undefined") return;
  try {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader(
      "Cache-Control",
      `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    );
  } catch {
    /* header sink unavailable (prerender/tests) — caching is best-effort */
  }
}
