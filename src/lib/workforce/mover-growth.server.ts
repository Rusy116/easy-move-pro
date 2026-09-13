// ---------------------------------------------------------------------------
// AG-5 — Mover Growth Agent, governed DRAFT-ONLY executor core (server only).
//
// Reuses the EXISTING generation logic (writeArticles in
// ai-ecosystem.functions.ts, audience "mover") and the existing AI provider
// path (ai-ecosystem.server.ts → Lovable AI Gateway). No second growth-agent
// implementation, no second gateway.
//
// The only write it can make is a DRAFT row in ai_content_items. It cannot
// publish: it never sets published/published_at, never calls a publish
// function, and touches no city/partner page, CRM record, lead, sitemap,
// Search Console, City/PDF Factory queue, store product, email or SMS surface.
// ---------------------------------------------------------------------------
import { writeArticles } from "@/lib/ai-ecosystem.functions";
import { MODEL as MOVER_GROWTH_MODEL } from "@/lib/ai-ecosystem.server";

export const MOVER_GROWTH_AGENT_KEY = "mover_growth_agent";
export const MOVER_GROWTH_PROVIDER = "lovable_ai_gateway";
export { MOVER_GROWTH_MODEL };

export const MOVER_GROWTH_COUNT_DEFAULT = 1;
export const MOVER_GROWTH_COUNT_MIN = 1;
export const MOVER_GROWTH_COUNT_MAX = 10;

/** Server-side clamp. Absent/invalid input means exactly one draft. */
export function clampMoverGrowthCount(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return MOVER_GROWTH_COUNT_DEFAULT;
  return Math.min(Math.max(n, MOVER_GROWTH_COUNT_MIN), MOVER_GROWTH_COUNT_MAX);
}

export type MoverGrowthDraft = {
  id: string;
  title: string;
  slug: string;
  kind: string;
  status: string;
  qualityScore: number | null;
};

export type MoverGrowthRunReport = {
  mode: "draft_only";
  provider: string;
  model: string;
  requestedCount: number;
  generatedCount: number;
  failedCount: number;
  aiGenerated: number;
  drafts: MoverGrowthDraft[];
  titles: string[];
  slugs: string[];
  writesPerformed: number;
  publicationActionsPerformed: 0;
  productionPageMutations: 0;
  warnings: string[];
  tablesRead: string[];
  tablesWritten: string[];
};

/**
 * `supabase` is the requesting admin's RLS-scoped client.
 * Draft-only: publishing stays a separate, human-initiated admin action.
 */
export async function runMoverGrowthDraftGeneration(
  supabase: any,
  opts: { count?: unknown } = {},
): Promise<MoverGrowthRunReport> {
  const requestedCount = clampMoverGrowthCount(opts.count);
  const warnings: string[] = [];
  const startedAt = new Date().toISOString();

  const result = await writeArticles({ supabase } as never, "mover", requestedCount);

  const { data: rows, error } = await supabase
    .from("ai_content_items")
    .select("id,title,slug,kind,status,quality_score,created_at")
    .eq("agent_key", MOVER_GROWTH_AGENT_KEY)
    .gte("created_at", startedAt)
    .order("created_at", { ascending: true });
  if (error) warnings.push(`Draft read-back unavailable: ${error.message}`);

  const drafts: MoverGrowthDraft[] = ((rows ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r["id"]),
    title: String(r["title"] ?? ""),
    slug: String(r["slug"] ?? ""),
    kind: String(r["kind"] ?? ""),
    status: String(r["status"] ?? "draft"),
    qualityScore: r["quality_score"] == null ? null : Number(r["quality_score"]),
  }));

  const nonDraft = drafts.filter((d) => d.status !== "draft");
  if (nonDraft.length) {
    warnings.push(
      `${nonDraft.length} generated item(s) are not in draft status — investigate before publishing.`,
    );
  }
  if (result.created < requestedCount) {
    warnings.push(
      `Requested ${requestedCount} item(s) but ${result.created} were created — the unused topic pool may be exhausted.`,
    );
  }

  return {
    mode: "draft_only",
    provider: MOVER_GROWTH_PROVIDER,
    model: MOVER_GROWTH_MODEL,
    requestedCount,
    generatedCount: result.created,
    failedCount: Math.max(requestedCount - result.created, 0),
    aiGenerated: result.aiGenerated,
    drafts,
    titles: result.titles,
    slugs: drafts.map((d) => d.slug),
    writesPerformed: result.created,
    publicationActionsPerformed: 0,
    productionPageMutations: 0,
    warnings,
    tablesRead: ["ai_content_items"],
    tablesWritten: ["ai_content_items"],
  };
}

export function summarizeMoverGrowthRun(r: MoverGrowthRunReport): string {
  return `Draft only — no automatic publishing. Requested ${r.requestedCount}, created ${r.generatedCount} draft mover asset(s) (${r.aiGenerated} AI-written, ${r.failedCount} not produced) via ${r.model}. 0 publication action(s), 0 production page mutation(s).`;
}
