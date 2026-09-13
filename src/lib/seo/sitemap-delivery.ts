// ---------------------------------------------------------------------------
// SR-2 — Fail-safe sitemap delivery: pure per-file validation.
//
// Live generation stays PRIMARY. This module only decides whether a freshly
// generated sitemap file is trustworthy enough to serve. The Last-Known-Good
// snapshot (SR-1) is used only when it is not. No promotion logic lives here —
// SR-1 promotion is untouched.
// ---------------------------------------------------------------------------
import {
  CANONICAL_ORIGIN,
  FORBIDDEN_HOST_PATTERNS,
  MAX_BYTES_PER_FILE,
  MAX_URLS_PER_FILE,
  MAX_SHRINK_RATIO,
  analyzePart,
  isWellFormedSitemapXml,
  type PartKind,
} from "./sitemap-snapshot";

export interface LiveCheckInput {
  partKey: string;
  kind: PartKind;
  xml: string;
  /** URL count of the active Last-Known-Good snapshot for this same file. */
  lastGoodUrlCount?: number | null;
  lastGoodCityUrlCount?: number | null;
}

export interface LiveCheckResult {
  ok: boolean;
  /** Machine-readable reason when ok === false. */
  code:
    | null
    | "invalid_xml"
    | "empty"
    | "too_many_urls"
    | "too_large"
    | "non_canonical_url"
    | "forbidden_host"
    | "malformed_url"
    | "duplicate_url"
    | "catastrophic_shrink";
  reason: string | null;
  urlCount: number;
  cityUrlCount: number;
  byteSize: number;
}

/**
 * Validate ONE freshly rendered sitemap file.
 *
 * `empty` is reported but it is the caller that decides what it means: an
 * empty city part beyond the current partition range is legitimate, an empty
 * part that previously had URLs is an infrastructure failure.
 */
export function checkLiveSitemap(input: LiveCheckInput): LiveCheckResult {
  const a = analyzePart({ partKey: input.partKey, kind: input.kind, xml: input.xml ?? "" });
  const base = { urlCount: a.urlCount, cityUrlCount: a.cityUrlCount, byteSize: a.byteSize };
  const fail = (code: LiveCheckResult["code"], reason: string): LiveCheckResult => ({
    ok: false,
    code,
    reason,
    ...base,
  });

  if (!isWellFormedSitemapXml(a.xml, input.kind)) {
    return fail("invalid_xml", "Rendered XML is malformed or truncated");
  }
  if (a.urlCount === 0) {
    return fail("empty", "Rendered sitemap contains zero URLs");
  }
  if (a.urlCount > MAX_URLS_PER_FILE) {
    return fail("too_many_urls", `Rendered sitemap exceeds ${MAX_URLS_PER_FILE} URLs`);
  }
  if (a.byteSize > MAX_BYTES_PER_FILE) {
    return fail("too_large", "Rendered sitemap exceeds the 50 MB file limit");
  }

  const seen = new Set<string>();
  for (const url of a.urls) {
    if (!url.startsWith(`${CANONICAL_ORIGIN}/`)) {
      return fail("non_canonical_url", `URL is not on ${CANONICAL_ORIGIN}`);
    }
    const lower = url.toLowerCase();
    if (FORBIDDEN_HOST_PATTERNS.some((p) => lower.includes(p))) {
      return fail("forbidden_host", "Non-production host present in rendered sitemap");
    }
    if (/\s/.test(url) || url.includes("undefined") || url.includes("//", 8)) {
      return fail("malformed_url", "Malformed URL in rendered sitemap");
    }
    if (seen.has(url)) return fail("duplicate_url", "Duplicate URL within rendered sitemap");
    seen.add(url);
  }

  // Catastrophic shrink, file-scoped, against the Last-Known-Good for this file.
  const lastGoodCity = input.lastGoodCityUrlCount ?? 0;
  const lastGoodUrls = input.lastGoodUrlCount ?? 0;
  const shrink = (good: number, now: number) => (good > 0 ? (good - now) / good : 0);
  const cityRatio = shrink(lastGoodCity, a.cityUrlCount);
  const urlRatio = shrink(lastGoodUrls, a.urlCount);
  const worst = Math.max(cityRatio, urlRatio);
  if (worst > MAX_SHRINK_RATIO) {
    return fail(
      "catastrophic_shrink",
      `Rendered sitemap lost ${(worst * 100).toFixed(2)}% of URLs versus last-known-good (limit ${MAX_SHRINK_RATIO * 100}%)`,
    );
  }

  return { ok: true, code: null, reason: null, ...base };
}

export const SITEMAP_CONTENT_TYPE = "application/xml";
