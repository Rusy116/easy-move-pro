// ---------------------------------------------------------------------------
// AG-2 — Internal Linking Engine, governed ANALYSIS-ONLY engine (server only).
//
// Inspects published city pages and their stored internal-link graph, then
// produces a PROPOSAL. It performs ZERO writes of any kind:
//   * no city_landing_pages update
//   * no internal_links write
//   * no seo_status / publish status change
//   * no republish, no City Factory job
//   * no sitemap or Search Console action
//
// Production mutations stay behind a server-only kill switch that defaults to
// OFF and is NOT consulted here — enabling writes is a separate stage.
// ---------------------------------------------------------------------------

/** ai_settings key holding the internal-linking write kill switch. */
export const INTERNAL_LINKING_SETTINGS_KEY = "internal_linking";
/** Hard default: production writes are DISABLED. */
export const INTERNAL_LINKING_WRITE_ENABLED_DEFAULT = false;

/**
 * Server-only read of the write kill switch. Absent or malformed settings mean
 * DISABLED — the switch must be explicitly and deliberately turned on.
 */
export async function internalLinkingWritesEnabled(db: any): Promise<boolean> {
  try {
    const { data } = await db
      .from("ai_settings")
      .select("value")
      .eq("key", INTERNAL_LINKING_SETTINGS_KEY)
      .maybeSingle();
    return (data?.value as { write_enabled?: unknown } | null)?.write_enabled === true;
  } catch {
    return INTERNAL_LINKING_WRITE_ENABLED_DEFAULT;
  }
}

export type LinkProposal = {
  slug: string;
  linkCount: number;
  issues: string[];
  suggestedAdditions: number;
};

export type InternalLinkingAnalysis = {
  mode: "analysis_only";
  writesEnabled: boolean;
  pagesInspected: number;
  linksInspected: number;
  proposalCount: number;
  proposals: LinkProposal[];
  orphanRiskCount: number;
  brokenLinkCount: number;
  healthy: number;
  warnings: string[];
  tablesRead: string[];
};

const MAX_PAGES = 200;
/** Minimum internal links a published city page should carry. */
const MIN_LINKS = 8;

/** Accepts string[] or [{href}] shapes and normalises to hrefs. */
function hrefsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => {
      if (typeof v === "string") return v;
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        return String(o["href"] ?? o["url"] ?? o["to"] ?? "");
      }
      return "";
    })
    .map((h) => h.trim())
    .filter(Boolean);
}

const citySlugOf = (href: string): string | null => {
  const m = /^\/movers\/([a-z0-9-]+)\/?$/i.exec(href);
  return m?.[1] ? `movers-${m[1]}` : null;
};

/**
 * `supabase` is the requesting admin's RLS-scoped client. Read-only.
 */
export async function analyzeInternalLinking(
  supabase: any,
  opts: { limit?: number } = {},
): Promise<InternalLinkingAnalysis> {
  const limit = Math.min(Math.max(Number(opts.limit ?? 50), 1), MAX_PAGES);
  const warnings: string[] = [];

  const { data, error } = await supabase
    .from("city_landing_pages")
    .select("slug, status, seo_status, internal_links, audit_score")
    .eq("status", "published")
    .limit(limit);

  if (error) throw new Error(`city_landing_pages: ${error.message}`);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const known = new Set(rows.map((r) => String(r["slug"])));
  const inbound = new Set<string>();
  const proposals: LinkProposal[] = [];
  let linksInspected = 0;
  let brokenLinkCount = 0;
  let healthy = 0;

  for (const r of rows) {
    const slug = String(r["slug"]);
    const hrefs = hrefsOf(r["internal_links"]);
    linksInspected += hrefs.length;

    const broken: string[] = [];
    for (const href of hrefs) {
      const target = citySlugOf(href);
      if (!target) continue;
      if (known.has(target)) inbound.add(target);
      else if (target !== slug) broken.push(href);
    }
    brokenLinkCount += broken.length;

    const issues: string[] = [];
    if (hrefs.length < MIN_LINKS) {
      issues.push(`only ${hrefs.length} internal link(s), target is ${MIN_LINKS}`);
    }
    if (broken.length) {
      issues.push(`${broken.length} link(s) point outside the published set: ${broken.slice(0, 3).join(", ")}`);
    }

    if (issues.length === 0) {
      healthy += 1;
      continue;
    }
    proposals.push({
      slug,
      linkCount: hrefs.length,
      issues,
      suggestedAdditions: Math.max(MIN_LINKS - hrefs.length, 0),
    });
  }

  const orphanRisk = rows.filter((r) => !inbound.has(String(r["slug"])));
  for (const r of orphanRisk.slice(0, 25)) {
    const slug = String(r["slug"]);
    const existing = proposals.find((p) => p.slug === slug);
    const note = "orphan risk — no inbound link found within the inspected set";
    if (existing) existing.issues.push(note);
    else
      proposals.push({
        slug,
        linkCount: hrefsOf(r["internal_links"]).length,
        issues: [note],
        suggestedAdditions: 0,
      });
  }

  if (rows.length === 0) warnings.push("No published city pages were returned for inspection.");
  if (orphanRisk.length > 25) {
    warnings.push(
      `${orphanRisk.length} pages show orphan risk in this sample; only the first 25 are listed.`,
    );
  }

  return {
    mode: "analysis_only",
    writesEnabled: false,
    pagesInspected: rows.length,
    linksInspected,
    proposalCount: proposals.length,
    proposals,
    orphanRiskCount: orphanRisk.length,
    brokenLinkCount,
    healthy,
    warnings,
    tablesRead: ["city_landing_pages"],
  };
}

export function summarizeInternalLinking(a: InternalLinkingAnalysis): string {
  return `Analysis only — production writes disabled. Inspected ${a.pagesInspected} published page(s) and ${a.linksInspected} internal link(s); ${a.proposalCount} page(s) need attention (${a.orphanRiskCount} orphan risk, ${a.brokenLinkCount} broken link(s)), ${a.healthy} healthy. No link, status or page was changed.`;
}
