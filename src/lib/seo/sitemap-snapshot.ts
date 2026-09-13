// ---------------------------------------------------------------------------
// SR-1 — Last-Known-Good sitemap snapshots: pure validation + shrink guard.
//
// This module is intentionally free of any database, network or runtime
// dependency so it can be unit-tested in isolation. It never renders or serves
// anything: production sitemap delivery is untouched by SR-1.
// ---------------------------------------------------------------------------

export const CANONICAL_HOST = "www.easymove.pro";
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

/** Google hard limits, with the same safety margin used by the live renderer. */
export const MAX_URLS_PER_FILE = 45_000;
export const MAX_BYTES_PER_FILE = 50 * 1024 * 1024;

/** A candidate sitemap must not lose more than this share of URLs silently. */
export const MAX_SHRINK_RATIO = 0.05;

export const FORBIDDEN_HOST_PATTERNS = [
  "lovable.app",
  "lovableproject.com",
  "localhost",
  "127.0.0.1",
  "staging",
  "preview",
  "vercel.app",
  "netlify.app",
];

export type PartKind = "index" | "pages" | "cities";

export interface SnapshotPart {
  /** "index" | "pages" | "cities-1" | "cities-2" ... */
  partKey: string;
  kind: PartKind;
  xml: string;
}

export interface PartAnalysis extends SnapshotPart {
  urls: string[];
  urlCount: number;
  cityUrlCount: number;
  byteSize: number;
  checksum: string;
}

export interface ValidationIssue {
  partKey: string;
  code: string;
  message: string;
}

export interface ValidationInput {
  parts: SnapshotPart[];
  /** Published + indexable city records currently in the database. */
  publishedCityCount: number;
  /** URLs generated per city by the live renderer. */
  urlsPerCity?: number;
  /** Allowed drift between DB inventory and sitemap city URLs, as a ratio. */
  reconcileTolerance?: number;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  analyses: PartAnalysis[];
  totals: { urlCount: number; cityUrlCount: number; byteSize: number; duplicates: number };
}

/** Stable, dependency-free content hash (FNV-1a 64-bit, hex). */
export function checksum(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c + i, 0x85ebca6b) >>> 0;
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

function extractLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>([\s\S]*?)<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1].trim());
  return out;
}

/** Structural XML check — no external parser, tolerant of large documents. */
export function isWellFormedSitemapXml(xml: string, kind: PartKind): boolean {
  const text = (xml ?? "").trim();
  if (!text.startsWith("<?xml")) return false;
  const root = kind === "index" ? "sitemapindex" : "urlset";
  const open = text.indexOf(`<${root}`);
  const close = text.lastIndexOf(`</${root}>`);
  if (open === -1 || close === -1 || close < open) return false;
  if (!text.endsWith(`</${root}>`)) return false;
  if (!text.includes("http://www.sitemaps.org/schemas/sitemap/0.9")) return false;
  const wrapper = kind === "index" ? "sitemap" : "url";
  const opens = (text.match(new RegExp(`<${wrapper}>`, "g")) ?? []).length;
  const closes = (text.match(new RegExp(`</${wrapper}>`, "g")) ?? []).length;
  if (opens !== closes) return false;
  const locOpens = (text.match(/<loc>/g) ?? []).length;
  const locCloses = (text.match(/<\/loc>/g) ?? []).length;
  if (locOpens !== locCloses || locOpens !== opens) return false;
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;)/.test(text)) return false;
  return true;
}

export function isCityUrl(url: string): boolean {
  return (
    url.startsWith(`${CANONICAL_ORIGIN}/movers/`) ||
    url.startsWith(`${CANONICAL_ORIGIN}/moving-calculator-`)
  );
}

export function analyzePart(part: SnapshotPart): PartAnalysis {
  const urls = extractLocs(part.xml);
  return {
    ...part,
    urls,
    urlCount: urls.length,
    cityUrlCount: urls.filter(isCityUrl).length,
    byteSize: new TextEncoder().encode(part.xml).length,
    checksum: checksum(part.xml),
  };
}

/**
 * Full candidate validation. Every rule that fails records an issue; a
 * candidate with any issue can never become Last-Known-Good.
 */
export function validateCandidate(input: ValidationInput): ValidationResult {
  const urlsPerCity = input.urlsPerCity ?? 2;
  const tolerance = input.reconcileTolerance ?? 0.02;
  const issues: ValidationIssue[] = [];
  const analyses = input.parts.map(analyzePart);
  const add = (partKey: string, code: string, message: string) =>
    issues.push({ partKey, code, message });

  if (analyses.length === 0) add("*", "no_parts", "Candidate contains no sitemap files");

  const seenGlobal = new Map<string, string>();
  let duplicates = 0;

  for (const a of analyses) {
    if (!isWellFormedSitemapXml(a.xml, a.kind)) {
      add(a.partKey, "invalid_xml", "Sitemap XML is malformed or truncated");
    }
    if (a.urlCount === 0) {
      add(a.partKey, "empty", "Sitemap contains zero URLs");
    }
    if (a.urlCount > MAX_URLS_PER_FILE) {
      add(a.partKey, "too_many_urls", `Sitemap exceeds ${MAX_URLS_PER_FILE} URLs`);
    }
    if (a.byteSize > MAX_BYTES_PER_FILE) {
      add(a.partKey, "too_large", "Sitemap exceeds the 50 MB file limit");
    }

    const seenLocal = new Set<string>();
    for (const url of a.urls) {
      if (!url.startsWith(`${CANONICAL_ORIGIN}/`)) {
        add(a.partKey, "non_canonical_url", `URL is not on ${CANONICAL_ORIGIN}: ${url}`);
      }
      const lower = url.toLowerCase();
      if (FORBIDDEN_HOST_PATTERNS.some((p) => lower.includes(p))) {
        add(a.partKey, "forbidden_host", `Non-production host in sitemap: ${url}`);
      }
      if (/\s/.test(url) || url.includes("undefined") || url.includes("//", 8)) {
        add(a.partKey, "malformed_url", `Malformed URL: ${url}`);
      }
      if (seenLocal.has(url)) {
        duplicates++;
        add(a.partKey, "duplicate_url", `Duplicate URL within file: ${url}`);
      }
      seenLocal.add(url);
      const other = seenGlobal.get(url);
      if (other && other !== a.partKey) {
        duplicates++;
        add(a.partKey, "duplicate_url_cross_file", `URL also present in ${other}: ${url}`);
      }
      seenGlobal.set(url, a.partKey);
    }
  }

  const cityUrlCount = analyses.reduce((n, a) => n + a.cityUrlCount, 0);
  const urlCount = analyses.reduce((n, a) => n + a.urlCount, 0);
  const byteSize = analyses.reduce((n, a) => n + a.byteSize, 0);

  if (input.publishedCityCount <= 0) {
    add("*", "no_city_inventory", "Database reports zero published city pages");
  } else {
    const expected = input.publishedCityCount * urlsPerCity;
    const drift = Math.abs(expected - cityUrlCount) / expected;
    if (cityUrlCount === 0) {
      add("*", "no_city_urls", "Candidate contains zero city URLs");
    } else if (drift > tolerance) {
      add(
        "*",
        "reconcile_failed",
        `City URLs (${cityUrlCount}) do not reconcile with inventory (${expected} expected, drift ${(drift * 100).toFixed(2)}%)`,
      );
    }
  }

  // Index must reference every city file present in the candidate.
  const index = analyses.find((a) => a.kind === "index");
  if (index) {
    const referenced = new Set(index.urls);
    for (const a of analyses) {
      if (a.kind === "index") continue;
      const expectedLoc = `${CANONICAL_ORIGIN}/sitemap-${a.partKey}.xml`;
      if (!referenced.has(expectedLoc)) {
        add("index", "unreferenced_part", `Index does not reference ${expectedLoc}`);
      }
    }
    for (const loc of index.urls) {
      const key = loc.replace(`${CANONICAL_ORIGIN}/sitemap-`, "").replace(/\.xml$/, "");
      if (!analyses.some((a) => a.partKey === key)) {
        add("index", "missing_child", `Index references a file not in the candidate: ${loc}`);
      }
    }
  } else {
    add("*", "no_index", "Candidate has no sitemap index");
  }

  return {
    ok: issues.length === 0,
    issues,
    analyses,
    totals: { urlCount, cityUrlCount, byteSize, duplicates },
  };
}

export interface ShrinkGuardInput {
  candidateCityUrlCount: number;
  candidateUrlCount: number;
  lastGoodCityUrlCount: number | null;
  lastGoodUrlCount: number | null;
  /** Explicit admin sign-off required for any large intentional deletion. */
  adminApprovedShrink?: boolean;
}

export interface ShrinkGuardResult {
  allowed: boolean;
  reason: string | null;
  shrinkRatio: number;
  requiresApproval: boolean;
}

/** Catastrophic shrink protection. Zero city URLs is a hard block, always. */
export function evaluateShrinkGuard(input: ShrinkGuardInput): ShrinkGuardResult {
  if (input.candidateCityUrlCount <= 0) {
    return {
      allowed: false,
      reason: "Candidate has zero city URLs — hard block",
      shrinkRatio: 1,
      requiresApproval: false,
    };
  }
  const lastGood = input.lastGoodCityUrlCount ?? 0;
  if (lastGood <= 0) {
    return { allowed: true, reason: null, shrinkRatio: 0, requiresApproval: false };
  }
  const ratio = Math.max(0, (lastGood - input.candidateCityUrlCount) / lastGood);
  if (ratio > MAX_SHRINK_RATIO) {
    if (input.adminApprovedShrink) {
      return { allowed: true, reason: null, shrinkRatio: ratio, requiresApproval: true };
    }
    return {
      allowed: false,
      reason: `City URLs dropped ${(ratio * 100).toFixed(2)}% below last-known-good (limit ${MAX_SHRINK_RATIO * 100}%) — admin approval required`,
      shrinkRatio: ratio,
      requiresApproval: true,
    };
  }
  return { allowed: true, reason: null, shrinkRatio: ratio, requiresApproval: false };
}

export function newReleaseId(now: Date = new Date()): string {
  return `sitemap-release-${now.toISOString().replace(/[:.]/g, "-")}`;
}
