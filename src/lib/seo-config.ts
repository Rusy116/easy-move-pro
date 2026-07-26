// ---------------------------------------------------------------------------
// Single switch that controls search-engine indexing for the whole site.
//
//   false → every page emits <meta name="robots" content="noindex, nofollow">
//           and /robots.txt returns "Disallow: /"
//   true  → normal indexing (per-page canonical/OG metadata unchanged)
//
// Flip this to `true` at launch. Nothing else needs to change.
// ---------------------------------------------------------------------------
export const ENABLE_INDEXING = false;

/** Robots meta entries to spread into a route's `head().meta` array. */
export const ROBOTS_META = ENABLE_INDEXING
  ? []
  : [{ name: "robots", content: "noindex, nofollow" }];
