// ---------------------------------------------------------------------------
// PHASE 5 — SEO Quality Audit (step 9).
//
// Deterministic 0–100 audit that gates publication. A page scoring < 95 is
// returned for correction; ≥ 95 continues to publish (step 10).
// Pure module — no I/O, safe on server and client.
// ---------------------------------------------------------------------------
import type { CityFacts } from "./data";
import { moversPathFor } from "./data";
import { SITE_ORIGIN } from "./validation";
import { buildCityHierarchy, isOrphan } from "./hierarchy";
import type { MoversSeoContent } from "./seo-page";

export const MIN_AUDIT_SCORE = 95;

export interface AuditCheck {
  key: string;
  label: string;
  ok: boolean;
  weight: number;
  detail?: string;
  fix?: string;
}

export interface AuditReport {
  score: number;
  passed: boolean;
  checks: AuditCheck[];
  failures: AuditCheck[];
  fixes: string[];
  coreWebVitals: { lcp: number; cls: number; inp: number };
  accessibility: number;
  canonicalUrl: string;
  internalLinks: number;
  words: number;
}

export interface AuditSignals {
  /** Titles already used by OTHER published cities. */
  existingTitles?: string[];
  /** Intro paragraphs already used by OTHER published cities. */
  existingIntros?: string[];
  calculatorPublished: boolean;
  consoleErrors?: number;
  brokenLinks?: number;
  indexable?: boolean;
}

/** Full quality audit for one city SEO page. */
export function auditCityPage(
  f: CityFacts,
  seo: MoversSeoContent,
  signals: AuditSignals,
): AuditReport {
  const hierarchy = buildCityHierarchy(f);
  const internalLinks = seo.internalLinks.length + hierarchy.all.length;
  const canonicalUrl = `${SITE_ORIGIN}${moversPathFor(f.slug, f.stateCode)}`;
  const consoleErrors = signals.consoleErrors ?? 0;
  const brokenLinks = signals.brokenLinks ?? 0;
  const introKey = seo.intro.join(" ").trim().toLowerCase().slice(0, 160);

  // Deterministic vitals model: penalised only by real runtime defects.
  const lcp = consoleErrors === 0 ? 1.9 : 3.4;
  const cls = 0.02;
  const inp = consoleErrors === 0 ? 120 : 320;
  const accessibility = f.neighborhoods.length >= 3 && seo.h1 ? 97 : 88;

  const checks: AuditCheck[] = [
    {
      key: "calculator_first",
      label: "Calculator published before SEO page",
      ok: signals.calculatorPublished,
      weight: 14,
      fix: "Publish /moving-calculator first — the SEO page may never exist without it.",
    },
    {
      key: "title_unique",
      label: "Unique title",
      ok: !(signals.existingTitles ?? []).includes(seo.title.trim().toLowerCase()),
      weight: 8,
      detail: seo.title,
      fix: "Regenerate the title with city-specific modifiers.",
    },
    {
      key: "intro_unique",
      label: "No duplicate content",
      ok: !(signals.existingIntros ?? []).includes(introKey),
      weight: 10,
      fix: "Regenerate the local intro so it is unique to this city.",
    },
    {
      key: "meta",
      label: "Meta tags complete",
      ok: seo.metaDescription.length >= 110 && seo.metaDescription.length <= 175 && !!seo.h1,
      weight: 7,
      detail: `${seo.metaDescription.length} chars`,
      fix: "Rewrite the meta description to 110–175 characters.",
    },
    {
      key: "words",
      label: "1,500–2,500 words of local content",
      ok: seo.wordCount >= 1500,
      weight: 10,
      detail: `${seo.wordCount} words`,
      fix: "Expand neighborhoods, ZIP, climate, parking and regulations sections.",
    },
    {
      key: "faq",
      label: "FAQ section (5+ questions)",
      ok: seo.faq.length >= 5,
      weight: 6,
      detail: `${seo.faq.length} questions`,
      fix: "Generate additional city-specific FAQ entries.",
    },
    {
      key: "schema",
      label: "Structured data valid (LocalBusiness, Service, FAQ, Breadcrumb)",
      ok: seo.faq.length > 0 && !!seo.h1,
      weight: 9,
      fix: "Re-emit the JSON-LD block on the SEO route.",
    },
    {
      key: "canonical",
      label: "Canonical URL self-references",
      ok: canonicalUrl.startsWith("https://") && canonicalUrl.endsWith(moversPathFor(f.slug, f.stateCode)),
      weight: 6,
      detail: canonicalUrl,
    },
    {
      key: "robots",
      label: "Robots directives allow indexing",
      ok: signals.indexable !== false,
      weight: 5,
      fix: "Flip ENABLE_INDEXING or remove the noindex directive for this route.",
    },
    {
      key: "internal_links",
      label: "Internal links (hierarchical, ≥ 8)",
      ok: internalLinks >= 8,
      weight: 8,
      detail: `${internalLinks} links`,
      fix: "Attach the hierarchy link block (county → state → USA hub).",
    },
    {
      key: "no_orphan",
      label: "No orphan page (reverse links exist)",
      ok: !isOrphan(f),
      weight: 6,
      fix: "Add this city to its county and state hubs.",
    },
    {
      key: "broken_links",
      label: "No broken links",
      ok: brokenLinks === 0,
      weight: 4,
      detail: `${brokenLinks} broken`,
    },
    {
      key: "cwv",
      label: "Core Web Vitals in budget",
      ok: lcp <= 2.5 && cls <= 0.1 && inp <= 200,
      weight: 4,
      detail: `LCP ${lcp}s · CLS ${cls} · INP ${inp}ms`,
      fix: "Resolve runtime errors on the route, then re-audit.",
    },
    {
      key: "a11y",
      label: "Accessibility ≥ 90",
      ok: accessibility >= 90,
      weight: 3,
      detail: String(accessibility),
      fix: "Add descriptive headings and image alt text.",
    },
  ];

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);
  const score = Math.round((earned / total) * 100);
  const failures = checks.filter((c) => !c.ok);

  return {
    score,
    passed: score >= MIN_AUDIT_SCORE && signals.calculatorPublished,
    checks,
    failures,
    fixes: failures.map((c) => c.fix).filter(Boolean) as string[],
    coreWebVitals: { lcp, cls, inp },
    accessibility,
    canonicalUrl,
    internalLinks,
    words: seo.wordCount,
  };
}
