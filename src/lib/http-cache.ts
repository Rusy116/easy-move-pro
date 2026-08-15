import { createIsomorphicFn } from "@tanstack/react-start";

/**
 * CDN caching for anonymous, database-driven SEO pages (city landing pages,
 * store pages). These documents contain no per-user data, so the edge may
 * serve a cached copy while it revalidates in the background.
 *
 * Isomorphic: a no-op in the browser, sets the header during SSR.
 */
export const cachePublicPage = createIsomorphicFn()
  .client((_sMaxAge?: number, _swr?: number) => {})
  .server((sMaxAge = 3600, swr = 86400) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { setResponseHeader } = require("@tanstack/react-start/server");
      setResponseHeader(
        "Cache-Control",
        `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
      );
    } catch {
      /* header sink unavailable (prerender/tests) — caching is best-effort */
    }
  });
