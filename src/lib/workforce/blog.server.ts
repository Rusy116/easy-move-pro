// ---------------------------------------------------------------------------
// AG-4 — Blog Agent, governed DRAFT-ONLY executor core (server only).
//
// Reuses the EXISTING blog generation logic (writeArticles in
// ai-ecosystem.functions.ts) and the existing AI provider path
// (ai-ecosystem.server.ts → Lovable AI Gateway). No second blog
// implementation, no second gateway.
//
// The only write it can make is a DRAFT row in ai_content_items. It cannot
// publish: it never sets published/published_at, never calls a blog publish
// function, and touches no city page, sitemap, product, Search Console,
// City Factory queue, email or SMS surface.
// ---------------------------------------------------------------------------
import { writeArticles } from "@/lib/ai-ecosystem.functions";
import { MODEL as BLOG_MODEL } from "@/lib/ai-ecosystem.server";

export const BLOG_AGENT_KEY = "blog_agent";
export const BLOG_PROVIDER = "lovable_ai_gateway";
export { BLOG_MODEL };

export const BLOG_COUNT_DEFAULT = 1;
export const BLOG_COUNT_MIN = 1;
export const BLOG_COUNT_MAX = 10;

/** Server-side clamp. Absent/invalid input means exactly one article. */
export function clampBlogCount(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return BLOG_COUNT_DEFAULT;
  return Math.min(Math.max(n, BLOG_COUNT_MIN), BLOG_COUNT_MAX);
}

export type BlogDraft = {
  id: string;
  title: string;
  slug: string;
  status: string;
  qualityScore: number | null;
};

export type BlogRunReport = {
  mode: "draft_only";
  provider: string;
  model: string;
  requestedCount: number;
  generatedCount: number;
  failedCount: number;
  aiGenerated: number;
  drafts: BlogDraft[];
  titles: string[];
  slugs: string[];
  writesPerformed: number;
  publicationActionsPerformed: 0;
  warnings: string[];
  tablesRead: string[];
  tablesWritten: string[];
};

/**
 * `supabase` is the requesting admin's RLS-scoped client.
 * Draft-only: publishing stays a separate, human-initiated admin action.
 */
export async function runBlogDraftGeneration(
  supabase: any,
  opts: { count?: unknown } = {},
): Promise<BlogRunReport> {
  const requestedCount = clampBlogCount(opts.count);
  const warnings: string[] = [];
  const startedAt = new Date().toISOString();

  const result = await writeArticles({ supabase } as never, "customer", requestedCount);

  const { data: rows, error } = await supabase
    .from("ai_content_items")
    .select("id,title,slug,status,quality_score,created_at")
    .eq("agent_key", BLOG_AGENT_KEY)
    .gte("created_at", startedAt)
    .order("created_at", { ascending: true });
  if (error) warnings.push(`Draft read-back unavailable: ${error.message}`);

  const drafts: BlogDraft[] = ((rows ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r["id"]),
    title: String(r["title"] ?? ""),
    slug: String(r["slug"] ?? ""),
    status: String(r["status"] ?? "draft"),
    qualityScore: r["quality_score"] == null ? null : Number(r["quality_score"]),
  }));

  const published = drafts.filter((d) => d.status !== "draft");
  if (published.length) {
    warnings.push(
      `${published.length} generated item(s) are not in draft status — investigate before publishing.`,
    );
  }
  if (result.created < requestedCount) {
    warnings.push(
      `Requested ${requestedCount} article(s) but ${result.created} were created — the unused topic pool may be exhausted.`,
    );
  }

  return {
    mode: "draft_only",
    provider: BLOG_PROVIDER,
    model: BLOG_MODEL,
    requestedCount,
    generatedCount: result.created,
    failedCount: Math.max(requestedCount - result.created, 0),
    aiGenerated: result.aiGenerated,
    drafts,
    titles: result.titles,
    slugs: drafts.map((d) => d.slug),
    writesPerformed: result.created,
    publicationActionsPerformed: 0,
    warnings,
    tablesRead: ["ai_content_items"],
    tablesWritten: ["ai_content_items"],
  };
}

export function summarizeBlogRun(r: BlogRunReport): string {
  return `Draft only — human publishing required. Requested ${r.requestedCount}, created ${r.generatedCount} draft article(s) (${r.aiGenerated} AI-written, ${r.failedCount} not produced) via ${r.model}. 0 article(s) published.`;
}
