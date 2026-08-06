// ---------------------------------------------------------------------------
// PHASE 5 — Indexing (11), Monitoring (12) and Self-Improvement (13) agents.
//
// Pure decision logic. Server functions in city-factory.functions.ts persist
// the results; nothing here performs I/O so it stays testable and SSR-safe.
// ---------------------------------------------------------------------------
import { SITE_ORIGIN } from "./validation";

// ── Step 11: Indexing Agent ────────────────────────────────────────────────
export interface IndexingSubmission {
  urls: string[];
  sitemapUrl: string;
  /** Ping endpoints for the search engines that still accept sitemap pings. */
  pings: string[];
  submittedAt: string;
}

export function buildIndexingSubmission(paths: string[]): IndexingSubmission {
  const sitemapUrl = `${SITE_ORIGIN}/sitemap.xml`;
  const urls = Array.from(new Set(paths)).map((p) =>
    p.startsWith("http") ? p : `${SITE_ORIGIN}${p}`,
  );
  return {
    urls,
    sitemapUrl,
    pings: [
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    ],
    submittedAt: new Date().toISOString(),
  };
}

// ── Step 12: Monitoring Agent ──────────────────────────────────────────────
export interface PageMetrics {
  slug: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  prevAvgPosition: number | null;
  indexStatus: string | null;
  auditScore: number | null;
}

export type MonitorHealth = "healthy" | "watch" | "degraded" | "not_indexed";

export interface MonitorVerdict {
  slug: string;
  health: MonitorHealth;
  positionDelta: number;
  reasons: string[];
  needsImprovement: boolean;
}

export function monitorPage(m: PageMetrics): MonitorVerdict {
  const reasons: string[] = [];
  const delta =
    m.prevAvgPosition != null && m.avgPosition > 0 ? m.avgPosition - m.prevAvgPosition : 0;

  let health: MonitorHealth = "healthy";
  if (!m.indexStatus || m.indexStatus === "not_indexed" || m.indexStatus === "excluded") {
    health = "not_indexed";
    reasons.push("Not indexed by search engines");
  }
  if (delta > 3) {
    health = "degraded";
    reasons.push(`Average position dropped ${delta.toFixed(1)} places`);
  } else if (delta > 1) {
    health = health === "healthy" ? "watch" : health;
    reasons.push(`Average position slipped ${delta.toFixed(1)} places`);
  }
  if (m.impressions >= 200 && m.ctr < 0.01) {
    health = health === "healthy" ? "watch" : health;
    reasons.push("CTR below 1% with meaningful impressions");
  }
  if ((m.auditScore ?? 100) < 95) {
    health = "degraded";
    reasons.push(`Audit score ${m.auditScore} below the 95 threshold`);
  }

  return {
    slug: m.slug,
    health,
    positionDelta: delta,
    reasons,
    needsImprovement: health === "degraded" || (health === "watch" && reasons.length > 1),
  };
}

// ── Step 13: Self-Improvement Agent ────────────────────────────────────────
export type ImprovementTarget =
  | "title"
  | "meta"
  | "faq"
  | "internal_links"
  | "content"
  | "schema";

export interface ImprovementPlan {
  slug: string;
  targets: ImprovementTarget[];
  notes: string[];
  republish: boolean;
}

export function planImprovement(m: PageMetrics, v: MonitorVerdict): ImprovementPlan {
  const targets: ImprovementTarget[] = [];
  const notes: string[] = [];

  if (v.positionDelta > 1) {
    targets.push("content", "internal_links");
    notes.push("Rankings slipping — expand local content and strengthen hierarchy links.");
  }
  if (m.impressions >= 200 && m.ctr < 0.01) {
    targets.push("title", "meta");
    notes.push("Impressions without clicks — rewrite title and meta description.");
  }
  if (v.health === "not_indexed") {
    targets.push("schema", "internal_links");
    notes.push("Resubmit for indexing and increase inbound internal links.");
  }
  if ((m.auditScore ?? 100) < 95) {
    targets.push("faq", "content", "schema");
    notes.push("Audit below threshold — regenerate the failing sections.");
  }

  const unique = Array.from(new Set(targets));
  return {
    slug: m.slug,
    targets: unique,
    notes,
    republish: unique.length > 0,
  };
}
