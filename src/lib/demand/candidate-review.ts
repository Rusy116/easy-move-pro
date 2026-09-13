// ---------------------------------------------------------------------------
// PF-3 — Pure validation rules for the admin candidate review queue.
// No I/O, no AI. Safe to import from the browser and from tests.
// ---------------------------------------------------------------------------
import { slugify } from "@/lib/pdf-store/catalog";

export interface ReviewCandidate {
  id: string;
  keyword: string;
  title: string;
  category_slug: string;
  status: string;
  verification: string;
  approval: string;
  confidence: number | null;
  priority: number | null;
  gap_reason: string | null;
  snooze_until: string | null;
  created_at: string;
  evidence: Record<string, any> | null;
}

export function proposedSlug(title: string): string {
  return slugify(title);
}

export interface ApprovalContext {
  categories: string[];
  /** Slugs already taken by a job or a product. */
  takenSlugs: string[];
  /** Other opportunities that already carry approval='approved'. */
  approvedSlugs: string[];
}

export interface ApprovalVerdict {
  ok: boolean;
  slug: string;
  reason?: string;
  code?:
    | "wrong_status"
    | "not_verified"
    | "not_pending"
    | "no_evidence"
    | "invalid_category"
    | "slug_conflict"
    | "duplicate_approved";
}

/** Server-side revalidation, expressed as a pure function so it is testable. */
export function validateApproval(
  candidate: ReviewCandidate,
  categorySlug: string,
  ctx: ApprovalContext,
): ApprovalVerdict {
  const slug = proposedSlug(candidate.title);

  if (candidate.status !== "candidate") {
    return { ok: false, slug, code: "wrong_status", reason: `Status is "${candidate.status}", expected "candidate"` };
  }
  if (candidate.verification !== "real_verified") {
    return { ok: false, slug, code: "not_verified", reason: `Verification is "${candidate.verification}"` };
  }
  if (candidate.approval !== "pending") {
    return { ok: false, slug, code: "not_pending", reason: `Approval is already "${candidate.approval}"` };
  }
  const signalId = candidate.evidence?.["demand_signal_id"];
  if (!signalId || candidate.evidence?.["verification_source"] !== "gsc") {
    return { ok: false, slug, code: "no_evidence", reason: "No linked real Search Console evidence" };
  }
  if (!categorySlug || !ctx.categories.includes(categorySlug)) {
    return { ok: false, slug, code: "invalid_category", reason: `Category "${categorySlug}" does not exist in the catalog` };
  }
  if (ctx.takenSlugs.includes(slug)) {
    return { ok: false, slug, code: "slug_conflict", reason: `A job or product already uses "${slug}"` };
  }
  if (ctx.approvedSlugs.includes(slug)) {
    return { ok: false, slug, code: "duplicate_approved", reason: `Another approved candidate already claims "${slug}"` };
  }
  return { ok: true, slug };
}

export interface CandidateGroup {
  slug: string;
  candidates: ReviewCandidate[];
  /** Highest-priority candidate — the one the admin should normally approve. */
  primaryId: string;
  combinedImpressions: number;
}

/** Group candidates that resolve to the same final product slug. */
export function groupCandidates(candidates: ReviewCandidate[]): CandidateGroup[] {
  const map = new Map<string, ReviewCandidate[]>();
  for (const c of candidates) {
    const slug = proposedSlug(c.title);
    map.set(slug, [...(map.get(slug) ?? []), c]);
  }
  return Array.from(map.entries()).map(([slug, list]) => {
    const sorted = [...list].sort(
      (a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0) || a.created_at.localeCompare(b.created_at),
    );
    return {
      slug,
      candidates: sorted,
      primaryId: sorted[0]!.id,
      // Observed GSC impressions across the evidence rows in this group.
      // NOT search volume, and never estimated.
      combinedImpressions: sorted.reduce((n, c) => n + Number(c.evidence?.["impressions"] ?? 0), 0),
    };
  });
}
