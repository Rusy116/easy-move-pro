// ---------------------------------------------------------------------------
// PF-3 — Admin candidate review + approval gate (server-authorized).
//
// Approval means only: "this candidate may enter the EXISTING automatic
// pipeline". Nothing here enqueues a job, creates a product, renders a PDF or
// publishes anything — the existing autopilot picks approved rows up on its
// own tick. The DD-2B eligibility gate and PF-1 publish gate are untouched.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  groupCandidates,
  proposedSlug,
  validateApproval,
  type ReviewCandidate,
} from "./candidate-review";

const SELECT =
  "id,keyword,title,category_slug,status,verification,approval,confidence,priority,gap_reason,snooze_until,created_at,evidence";

async function adminContext(context: unknown) {
  const ctx = context as { supabase: any; userId: string; claims?: Record<string, unknown> };
  const { data: isAdmin, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Authorization check failed");
  if (!isAdmin) throw new Error("Forbidden");
  return ctx;
}

async function audit(
  supabase: any,
  userId: string,
  action: string,
  id: string,
  before: unknown,
  after: unknown,
  reason: string | null,
) {
  await supabase.from("audit_log").insert({
    actor_id: userId,
    action,
    entity_type: "pdf_opportunity",
    entity_id: id,
    reason,
    before,
    after,
  });
}

/** Read-only queue: pending real-verified candidates, plus snoozed/decided tabs. */
export const listCandidateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { view?: string }) => ({
    view: ["pending", "snoozed", "decided"].includes(String(d?.view)) ? String(d.view) : "pending",
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = await adminContext(context);

    const base = supabase.from("pdf_opportunities").select(SELECT).eq("verification", "real_verified");
    const query =
      data.view === "pending"
        ? base.eq("status", "candidate").eq("approval", "pending")
        : data.view === "snoozed"
          ? base.eq("approval", "snoozed")
          : base.in("approval", ["approved", "rejected"]);

    const { data: rows, error } = await query.order("priority", { ascending: false });
    if (error) throw new Error(`Reading candidates failed: ${error.message}`);
    const candidates = (rows ?? []) as ReviewCandidate[];

    const [{ data: cats }, { data: jobs }, { data: products }, { data: approved }] = await Promise.all([
      supabase.from("pdf_categories").select("slug,name").order("sort_order"),
      supabase.from("pdf_jobs").select("product_slug"),
      supabase.from("pdf_products").select("slug,title,status"),
      supabase.from("pdf_opportunities").select("title").eq("approval", "approved"),
    ]);

    const takenSlugs = new Set<string>([
      ...((jobs ?? []) as any[]).map((r) => r.product_slug),
      ...((products ?? []) as any[]).map((r) => r.slug),
    ]);
    const approvedSlugs = new Set<string>(((approved ?? []) as any[]).map((r) => proposedSlug(r.title)));
    const categories = ((cats ?? []) as any[]).map((c) => ({ slug: c.slug, name: c.name }));
    const categorySlugs = categories.map((c) => c.slug);

    const groups = groupCandidates(candidates).map((g) => ({
      ...g,
      slugTaken: takenSlugs.has(g.slug),
      slugAlreadyApproved: approvedSlugs.has(g.slug),
      candidates: g.candidates.map((c) => ({
        ...c,
        proposedSlug: proposedSlug(c.title),
        categoryValid: categorySlugs.includes(c.category_slug),
      })),
    }));

    return {
      view: data.view,
      groups,
      categories,
      counts: { candidates: candidates.length, groups: groups.length },
      note: "Impression totals are observed Search Console impressions for the evidence window, not search volume.",
    };
  });

/** APPROVE — revalidates server-side, then writes the approval fields only. */
export const approveCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; categorySlug?: string }) => ({
    id: String(d?.id ?? "").slice(0, 64),
    categorySlug: d?.categorySlug ? String(d.categorySlug).slice(0, 64) : "",
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = await adminContext(context);

    const { data: row, error } = await supabase
      .from("pdf_opportunities")
      .select(SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(`Reading candidate failed: ${error.message}`);
    if (!row) throw new Error("Candidate not found");
    const candidate = row as ReviewCandidate;

    // Evidence must still resolve to a real Search Console signal.
    const signalId = candidate.evidence?.["demand_signal_id"];
    if (signalId) {
      const { data: signal } = await supabase
        .from("demand_signals")
        .select("id,source")
        .eq("id", signalId)
        .maybeSingle();
      if (!signal || signal.source !== "gsc") throw new Error("Linked demand evidence is missing or not real GSC data");
    }

    const [{ data: cats }, { data: jobs }, { data: products }, { data: approvedRows }] = await Promise.all([
      supabase.from("pdf_categories").select("slug"),
      supabase.from("pdf_jobs").select("product_slug"),
      supabase.from("pdf_products").select("slug"),
      supabase.from("pdf_opportunities").select("id,title").eq("approval", "approved"),
    ]);

    const categorySlug = data.categorySlug || candidate.category_slug;
    const verdict = validateApproval(candidate, categorySlug, {
      categories: ((cats ?? []) as any[]).map((c) => c.slug),
      takenSlugs: [
        ...((jobs ?? []) as any[]).map((r) => r.product_slug),
        ...((products ?? []) as any[]).map((r) => r.slug),
      ],
      approvedSlugs: ((approvedRows ?? []) as any[]).map((r) => proposedSlug(r.title)),
    });
    if (!verdict.ok) return { ok: false as const, code: verdict.code, reason: verdict.reason };

    const patch: Record<string, unknown> = {
      approval: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (categorySlug !== candidate.category_slug) patch["category_slug"] = categorySlug;

    const { error: updateError } = await supabase.from("pdf_opportunities").update(patch).eq("id", candidate.id);
    if (updateError) throw new Error(`Approval failed: ${updateError.message}`);
    await audit(supabase, userId, "pdf_candidate.approve", candidate.id, candidate, patch, null);

    // Same-slug siblings can never become a second product — close them with
    // the existing 'rejected' state and a precise reason, so nothing is left
    // pending forever and nothing can queue later.
    const { data: siblings } = await supabase
      .from("pdf_opportunities")
      .select(SELECT)
      .eq("status", "candidate")
      .eq("approval", "pending")
      .neq("id", candidate.id);

    const closed: string[] = [];
    for (const sib of ((siblings ?? []) as ReviewCandidate[]).filter(
      (s) => proposedSlug(s.title) === verdict.slug,
    )) {
      const reason = `duplicate of opportunity ${candidate.id}`;
      await supabase
        .from("pdf_opportunities")
        .update({
          approval: "rejected",
          gap_reason: `${sib.gap_reason ?? ""} [${reason}]`.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sib.id);
      await audit(supabase, userId, "pdf_candidate.reject_duplicate", sib.id, sib, { approval: "rejected" }, reason);
      closed.push(sib.id);
    }

    return {
      ok: true as const,
      id: candidate.id,
      slug: verdict.slug,
      categorySlug,
      duplicatesClosed: closed,
      note: "Approved only. The existing autopilot will enqueue it on a later tick; no job, product or PDF was created here.",
    };
  });

/** REJECT — keeps the row and its evidence, blocks production permanently. */
export const rejectCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; reason?: string }) => ({
    id: String(d?.id ?? "").slice(0, 64),
    reason: String(d?.reason ?? "").slice(0, 300),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = await adminContext(context);
    const { data: row } = await supabase.from("pdf_opportunities").select(SELECT).eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Candidate not found");

    const patch = {
      approval: "rejected",
      gap_reason: `${row.gap_reason ?? ""}${data.reason ? ` [rejected: ${data.reason}]` : " [rejected]"}`.trim(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("pdf_opportunities").update(patch).eq("id", data.id);
    if (error) throw new Error(`Reject failed: ${error.message}`);
    await audit(supabase, userId, "pdf_candidate.reject", data.id, row, patch, data.reason || null);
    return { ok: true as const, id: data.id };
  });

/** SNOOZE — reuses the existing snooze_until field; keeps evidence intact. */
export const snoozeCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; days?: number }) => ({
    id: String(d?.id ?? "").slice(0, 64),
    days: Math.min(Math.max(Math.round(Number(d?.days ?? 30)) || 30, 1), 180),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = await adminContext(context);
    const { data: row } = await supabase.from("pdf_opportunities").select(SELECT).eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Candidate not found");

    const patch = {
      approval: "snoozed",
      snooze_until: new Date(Date.now() + data.days * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("pdf_opportunities").update(patch).eq("id", data.id);
    if (error) throw new Error(`Snooze failed: ${error.message}`);
    await audit(supabase, userId, "pdf_candidate.snooze", data.id, row, patch, `${data.days} days`);
    return { ok: true as const, id: data.id, until: patch.snooze_until };
  });

/** Return a snoozed candidate to the pending review queue. */
export const unsnoozeCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "").slice(0, 64) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = await adminContext(context);
    const { data: row } = await supabase.from("pdf_opportunities").select(SELECT).eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Candidate not found");
    if (row.approval !== "snoozed") return { ok: false as const, reason: "Candidate is not snoozed" };

    const patch = { approval: "pending", snooze_until: null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("pdf_opportunities").update(patch).eq("id", data.id);
    if (error) throw new Error(`Returning to review failed: ${error.message}`);
    await audit(supabase, userId, "pdf_candidate.unsnooze", data.id, row, patch, null);
    return { ok: true as const, id: data.id };
  });
