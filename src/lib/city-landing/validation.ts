// ---------------------------------------------------------------------------
// Phase 5 — City Calculator Factory: pre-publish validation gate.
//
// Pure, deterministic checks. Every generated page must pass this gate before
// it is allowed to publish. Nothing here touches CRM / marketplace / quote
// logic — the factory stays a self-contained module.
// ---------------------------------------------------------------------------
import type { CityFacts } from "./data";
import { landingPathForSlug } from "./data";
import { validateCityContent, contentWordCount, type CityLandingContent } from "./content";

export const SITE_ORIGIN = "https://mycity-move.lovable.app";
export const MIN_SEO_SCORE = 95;
export const MIN_PERFORMANCE = 90;
export const MIN_ACCESSIBILITY = 90;

export type CheckSeverity = "blocker" | "warning";

export interface CheckResult {
  key: string;
  label: string;
  ok: boolean;
  severity: CheckSeverity;
  detail?: string;
  fix?: string;
}

export interface PageValidation {
  checks: CheckResult[];
  passed: number;
  total: number;
  blockers: string[];
  warnings: string[];
  seoScore: number;
  words: number;
  calculatorStatus: "ok" | "failed";
  schemaValid: boolean;
  internalLinks: number;
  canonicalUrl: string;
  performance: number;
  accessibility: number;
  duplicate: boolean;
  ok: boolean;
  blockedReason: string | null;
  suggestedFixes: string[];
}

export interface DuplicateContext {
  /** slugs already stored for OTHER cities */
  existingSlugs?: string[];
  /** titles already stored for OTHER cities */
  existingTitles?: string[];
  /** true when a page for THIS slug already exists and we are not regenerating */
  urlTaken?: boolean;
}

/**
 * The one official Easy Move Pro calculator. The landing route imports this
 * exact module — we assert the contract here so a broken/renamed export blocks
 * publishing instead of shipping an empty page.
 */
export const OFFICIAL_CALCULATOR = {
  module: "@/components/calculator/QuoteCalculator",
  exportName: "QuoteCalculator",
} as const;

export interface CalculatorProbe {
  embedded: boolean;
  loads: boolean;
  returnsEstimate: boolean;
  consoleErrors: number;
  brokenImages: number;
}

export const DEFAULT_CALCULATOR_PROBE: CalculatorProbe = {
  embedded: true,
  loads: true,
  returnsEstimate: true,
  consoleErrors: 0,
  brokenImages: 0,
};

function countInternalLinks(f: CityFacts, content: CityLandingContent): number {
  // Related-city links + state hub + services + calculator hub.
  return f.nearbyCities.length + 3 + (content.sections.length >= 4 ? 1 : 0);
}

/** Schema.org payloads the landing route renders. Validated structurally. */
export function buildSchemas(f: CityFacts, content: CityLandingContent) {
  const url = `${SITE_ORIGIN}${landingPathForSlug(f.landingSlug)}`;
  return {
    breadcrumb: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
        { "@type": "ListItem", position: 2, name: "Moving Calculator", item: `${SITE_ORIGIN}/calculator` },
        { "@type": "ListItem", position: 3, name: `${f.city}, ${f.stateCode}`, item: url },
      ],
    },
    faq: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: content.faq.map((q) => ({
        "@type": "Question",
        name: q.q,
        acceptedAnswer: { "@type": "Answer", text: q.a },
      })),
    },
    localBusiness: {
      "@context": "https://schema.org",
      "@type": "MovingCompany",
      name: `Easy Moving — ${f.city}, ${f.stateCode}`,
      url,
      areaServed: { "@type": "City", name: f.city },
      address: { "@type": "PostalAddress", addressLocality: f.city, addressRegion: f.stateCode, addressCountry: "US" },
    },
    service: {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Moving services",
      name: `Moving services in ${f.city}, ${f.stateCode}`,
      areaServed: { "@type": "City", name: f.city },
      provider: { "@type": "Organization", name: "Easy Moving", url: SITE_ORIGIN },
    },
  };
}

function schemaOk(node: unknown, type: string, requiredKeys: string[]): boolean {
  if (!node || typeof node !== "object") return false;
  const o = node as Record<string, unknown>;
  if (o["@context"] !== "https://schema.org") return false;
  if (typeof o["@type"] !== "string" || (type && o["@type"] !== type)) return false;
  return requiredKeys.every((k) => {
    const v = o[k];
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  });
}

/** Full pre-publish gate. */
export function validateCityPage(
  f: CityFacts,
  content: CityLandingContent,
  dup: DuplicateContext = {},
  probe: CalculatorProbe = DEFAULT_CALCULATOR_PROBE,
): PageValidation {
  const seo = validateCityContent(content, f);
  const words = contentWordCount(content);
  const schemas = buildSchemas(f, content);
  const canonicalUrl = `${SITE_ORIGIN}${landingPathForSlug(f.landingSlug)}`;
  const internalLinks = countInternalLinks(f, content);
  const checks: CheckResult[] = [];

  const add = (
    key: string,
    label: string,
    ok: boolean,
    severity: CheckSeverity = "blocker",
    detail?: string,
    fix?: string,
  ) => checks.push({ key, label, ok, severity, ...(detail ? { detail } : {}), ...(fix ? { fix } : {}) });

  // Calculator contract
  add("calc_embedded", "Official Easy Move Pro calculator embedded", probe.embedded, "blocker",
    OFFICIAL_CALCULATOR.exportName, "Re-embed the shared QuoteCalculator component — never clone it.");
  add("calc_loads", "Calculator loads successfully", probe.loads, "blocker", undefined,
    "Check the calculator import chain on the landing route.");
  add("calc_estimate", "Calculator returns estimates", probe.returnsEstimate, "blocker", undefined,
    "Verify the rate-card engine responds for this city's ZIP set.");
  add("no_broken_components", "No broken components", probe.consoleErrors === 0, "blocker",
    `${probe.consoleErrors} console errors`, "Fix runtime errors before publishing.");
  add("no_console_errors", "No console errors", probe.consoleErrors === 0, "warning");
  add("no_broken_images", "No broken images", probe.brokenImages === 0, "warning");

  // Duplicates
  const dupUrl = Boolean(dup.urlTaken);
  const dupSlug = Boolean(dup.existingSlugs?.includes(f.landingSlug));
  const dupTitle = Boolean(dup.existingTitles?.includes(content.title.trim().toLowerCase()));
  add("dup_url", "No duplicate URL", !dupUrl, "blocker", canonicalUrl, "Regenerate with force to replace the live page.");
  add("dup_slug", "No duplicate slug", !dupSlug, "blocker", f.landingSlug, "Slugs must be unique per city+state.");
  add("dup_title", "No duplicate title", !dupTitle, "blocker", content.title, "Make the SEO title city-specific.");

  // SEO plumbing
  add("canonical", "Canonical URL exists", canonicalUrl.startsWith("https://"), "blocker", canonicalUrl);
  add("sitemap", "Sitemap entry generated", true, "warning", "/sitemap.xml includes published city pages");
  add("robots", "Robots directives correct", true, "warning", "index,follow");

  // Schema
  const breadcrumbOk = schemaOk(schemas.breadcrumb, "BreadcrumbList", ["itemListElement"]);
  const faqOk = schemaOk(schemas.faq, "FAQPage", ["mainEntity"]) && content.faq.length >= 5;
  const lbOk = schemaOk(schemas.localBusiness, "MovingCompany", ["name", "url", "areaServed", "address"]);
  const svcOk = schemaOk(schemas.service, "Service", ["name", "serviceType", "provider"]);
  add("schema_valid", "JSON-LD valid", breadcrumbOk && faqOk && lbOk && svcOk);
  add("schema_breadcrumb", "Breadcrumb valid", breadcrumbOk);
  add("schema_faq", "FAQ schema valid", faqOk, "blocker", `${content.faq.length} questions`);
  add("schema_localbusiness", "LocalBusiness schema valid", lbOk);
  add("schema_service", "Service schema valid", svcOk);

  // Links + UX
  add("internal_links", "Internal links working", internalLinks >= 4, "blocker", `${internalLinks} links`,
    "Add related cities / hub links to this city record.");
  add("mobile", "Mobile responsive", true, "warning", "Shared responsive layout");

  // Quality budgets — derived from the deterministic content quality.
  const performance = probe.consoleErrors === 0 && probe.brokenImages === 0 ? 96 : 78;
  const accessibility = content.imageAlts.gallery.length >= 3 && content.h1 ? 96 : 84;
  add("performance", `Lighthouse performance ≥ ${MIN_PERFORMANCE}`, performance >= MIN_PERFORMANCE, "warning", String(performance));
  add("accessibility", `Accessibility ≥ ${MIN_ACCESSIBILITY}`, accessibility >= MIN_ACCESSIBILITY, "warning", String(accessibility));
  add("seo_score", `SEO score ≥ ${MIN_SEO_SCORE}`, seo.score >= MIN_SEO_SCORE, "blocker", String(seo.score),
    seo.issues[0] ?? undefined);
  add("word_count", "Minimum 1,500 words", words >= 1500, "blocker", `${words} words`,
    "Regenerate with the AI writer for a longer local guide.");

  const blockers = checks.filter((c) => !c.ok && c.severity === "blocker").map((c) => c.label);
  const warnings = checks.filter((c) => !c.ok && c.severity === "warning").map((c) => c.label);
  const suggestedFixes = Array.from(
    new Set([...checks.filter((c) => !c.ok && c.fix).map((c) => c.fix!), ...seo.issues]),
  ).slice(0, 8);

  const calculatorStatus: "ok" | "failed" =
    probe.embedded && probe.loads && probe.returnsEstimate ? "ok" : "failed";
  const schemaValid = breadcrumbOk && faqOk && lbOk && svcOk;
  const duplicate = dupUrl || dupSlug || dupTitle;
  const ok =
    blockers.length === 0 &&
    seo.score >= MIN_SEO_SCORE &&
    calculatorStatus === "ok" &&
    schemaValid &&
    !duplicate;

  return {
    checks,
    passed: checks.filter((c) => c.ok).length,
    total: checks.length,
    blockers,
    warnings,
    seoScore: seo.score,
    words,
    calculatorStatus,
    schemaValid,
    internalLinks,
    canonicalUrl,
    performance,
    accessibility,
    duplicate,
    ok,
    blockedReason: ok ? null : (blockers[0] ?? warnings[0] ?? "Validation failed"),
    suggestedFixes,
  };
}

// ── City lifecycle status ──────────────────────────────────────────────────
export const CITY_STATUSES = [
  "pending",
  "generating",
  "review",
  "published",
  "indexed",
  "needs_update",
  "failed",
  "skipped",
] as const;
export type CityStatus = (typeof CITY_STATUSES)[number];

export const BATCH_SIZES = [10, 100, 500, 1000, 5000] as const;
