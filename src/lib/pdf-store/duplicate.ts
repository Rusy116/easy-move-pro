// ---------------------------------------------------------------------------
// PF-1 — Catalog duplicate similarity (pure, deterministic, no I/O, no AI).
//
// Runs immediately before publication, in addition to the existing exact
// slug/title dedupe at queue time. Generic category words ("moving",
// "checklist", "planner", …) are ignored so genuinely different products are
// never blocked for sharing vocabulary.
// ---------------------------------------------------------------------------

/** Words every product in this catalog shares — they carry no signal. */
const GENERIC = new Set([
  "moving", "move", "movers", "moves", "relocation", "relocating",
  "checklist", "checklists", "planner", "planners", "guide", "guides",
  "template", "templates", "worksheet", "sheet", "list", "pdf", "printable",
  "print", "free", "download", "downloadable", "complete", "ultimate",
  "the", "a", "an", "and", "or", "for", "with", "your", "you", "to", "of",
  "in", "on", "by", "from", "my", "our", "easy", "step",
]);

export const DUPLICATE_BLOCK_THRESHOLD = 0.82;
/** Below the block threshold but too close to trust — treated as uncertain. */
export const DUPLICATE_REVIEW_THRESHOLD = 0.7;

export function normalizeTitle(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleTokens(value: string): { distinctive: string[]; all: string[] } {
  const all = normalizeTitle(value).split(" ").filter(Boolean);
  const distinctive = all.filter((t) => !GENERIC.has(t) && t.length > 2);
  return { distinctive, all };
}

function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter += 1;
  return inter / (sa.size + sb.size - inter);
}

function trigrams(value: string): string[] {
  const s = ` ${normalizeTitle(value).replace(/\s+/g, " ")} `;
  const out: string[] = [];
  for (let i = 0; i + 3 <= s.length; i++) out.push(s.slice(i, i + 3));
  return out;
}

/** 0..1 similarity between two product identities. Deterministic. */
export function similarity(
  a: { title: string; slug?: string; keywords?: string[] },
  b: { title: string; slug?: string; keywords?: string[] },
): number {
  const ta = titleTokens(a.title);
  const tb = titleTokens(b.title);

  // Distinctive-token overlap is the primary signal. When one of the titles is
  // entirely generic, fall back to the full token set so it is still compared.
  const tokenScore =
    ta.distinctive.length && tb.distinctive.length
      ? jaccard(ta.distinctive, tb.distinctive)
      : jaccard(ta.all, tb.all);

  const slugScore = jaccard(
    trigrams(a.slug ?? a.title),
    trigrams(b.slug ?? b.title),
  );

  const kwA = (a.keywords ?? []).flatMap((k) => titleTokens(k).distinctive);
  const kwB = (b.keywords ?? []).flatMap((k) => titleTokens(k).distinctive);
  const kwScore = kwA.length && kwB.length ? jaccard(kwA, kwB) : 0;

  // Titles that normalise to the same string are always an exact duplicate.
  if (normalizeTitle(a.title) && normalizeTitle(a.title) === normalizeTitle(b.title)) return 1;
  if (a.slug && b.slug && a.slug === b.slug) return 1;

  return Math.max(tokenScore * 0.75 + slugScore * 0.25, tokenScore, kwScore * 0.9);
}

export interface DuplicateCheck {
  passed: boolean;
  closestProductId: string | null;
  closestProductTitle: string | null;
  similarityScore: number;
  reason: string;
}

export interface CatalogEntry {
  id?: string | null;
  slug: string;
  title: string;
  target_keywords?: string[] | null;
  status?: string | null;
}

/**
 * Compare a candidate against the live catalog. Conservative: an uncertain
 * match blocks rather than auto-publishes.
 */
export function checkDuplicate(
  candidate: { slug: string; title: string; target_keywords?: string[] | null },
  catalog: CatalogEntry[],
): DuplicateCheck {
  let best: { entry: CatalogEntry; score: number } | null = null;

  for (const entry of catalog) {
    if (entry.slug === candidate.slug) continue; // the candidate itself
    const score = similarity(
      { title: candidate.title, slug: candidate.slug, keywords: candidate.target_keywords ?? [] },
      { title: entry.title, slug: entry.slug, keywords: entry.target_keywords ?? [] },
    );
    if (!best || score > best.score) best = { entry, score };
  }

  if (!best) {
    return {
      passed: true,
      closestProductId: null,
      closestProductTitle: null,
      similarityScore: 0,
      reason: "No comparable products in the catalog",
    };
  }

  const score = Number(best.score.toFixed(3));
  const base = {
    closestProductId: best.entry.id ?? null,
    closestProductTitle: best.entry.title,
    similarityScore: score,
  };

  if (score >= DUPLICATE_BLOCK_THRESHOLD) {
    return { ...base, passed: false, reason: `Near-duplicate of "${best.entry.title}" (${score})` };
  }
  if (score >= DUPLICATE_REVIEW_THRESHOLD) {
    return { ...base, passed: false, reason: `Uncertain duplicate of "${best.entry.title}" (${score}) — review required` };
  }
  return { ...base, passed: true, reason: `Closest catalog match ${score} — below review threshold` };
}
