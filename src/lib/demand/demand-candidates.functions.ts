// ---------------------------------------------------------------------------
// DD-4 — Turn REAL GSC demand signals into REVIEW-ONLY pdf_opportunities.
//
// Created rows are always: status='candidate', verification='real_verified',
// approval='pending'. The DD-2B worker gate requires approval='approved',
// so nothing created here can enter production without an admin action.
//
// No AI, no external providers, no synthetic metrics.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  categoryFor,
  evaluateSignal,
  normalizeQuery,
  titleFor,
  type Evaluation,
  type GscSignal,
} from "./candidate-rules";

const HARD_MAX_CANDIDATES = 10;

function validate(data: unknown) {
  const d = (data ?? {}) as Record<string, unknown>;
  const raw = Number(d.maxCandidates ?? HARD_MAX_CANDIDATES) || HARD_MAX_CANDIDATES;
  return { maxCandidates: Math.min(Math.max(raw, 1), HARD_MAX_CANDIDATES) };
}

export const buildGscReviewCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    const supabase = (context as any).supabase;
    const userId = (context as any).userId as string;

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) throw new Error("Authorization check failed");
    if (!isAdmin) throw new Error("Forbidden");

    // 1. Real GSC signals only.
    const { data: signals, error: signalError } = await supabase
      .from("demand_signals")
      .select("id,query,query_norm,impressions,clicks,ctr,avg_position,window_start,window_end")
      .eq("source", "gsc");
    if (signalError) throw new Error(`Reading demand signals failed: ${signalError.message}`);
    const rows = (signals ?? []) as GscSignal[];

    // Place-name reference used by the deterministic local-intent filter.
    const { data: cities, error: cityError } = await supabase
      .from("usa_cities")
      .select("city_name")
      .gte("population", 5000)
      .limit(10000);
    if (cityError) throw new Error(`Reading city reference failed: ${cityError.message}`);
    const cityNames = new Set<string>(
      (cities ?? []).map((c: { city_name: string }) => normalizeQuery(c.city_name)),
    );

    // 2/3/4. Deterministic filtering, product-fit classification and scoring.
    const evaluations: Evaluation[] = rows.map((s) => evaluateSignal(s, cityNames));
    const accepted = evaluations.filter((e): e is Extract<Evaluation, { accepted: true }> => e.accepted);
    const rejected = evaluations.length - accepted.length;

    // 6. Dedupe: existing opportunities by keyword, and already-used signal ids.
    const { data: existing, error: existingError } = await supabase
      .from("pdf_opportunities")
      .select("keyword,evidence");
    if (existingError) throw new Error(`Reading opportunities failed: ${existingError.message}`);
    const existingKeywords = new Set<string>(
      (existing ?? []).map((r: { keyword: string }) => normalizeQuery(r.keyword)),
    );
    const usedSignalIds = new Set<string>(
      (existing ?? [])
        .map((r: { evidence: any }) => r?.evidence?.demand_signal_id)
        .filter((v: unknown): v is string => typeof v === "string"),
    );

    const seen = new Set<string>();
    const eligible = accepted
      .sort((a, b) => b.score - a.score || b.impressions - a.impressions)
      .filter((e) => {
        if (existingKeywords.has(e.queryNorm) || usedSignalIds.has(e.signalId) || seen.has(e.queryNorm)) return false;
        seen.add(e.queryNorm);
        return true;
      });

    // 7. Hard limit.
    const selected = eligible.slice(0, data.maxCandidates);

    const payload = selected.map((e) => ({
      keyword: e.queryNorm,
      title: titleFor(e.productFit),
      category_slug: categoryFor(e.productFit),
      priority: e.score,
      gap_reason: `Real GSC visibility for "${e.queryNorm}" with reusable ${e.productFit} intent`,
      source: "gsc",
      status: "candidate",
      verification: "real_verified",
      approval: "pending",
      confidence: e.confidence,
      evidence: {
        verification_source: "gsc",
        demand_signal_id: e.signalId,
        query: e.query,
        query_norm: e.queryNorm,
        impressions: e.impressions,
        clicks: e.clicks,
        ctr: e.ctr,
        avg_position: e.avgPosition,
        window_start: rows.find((r) => r.id === e.signalId)?.window_start ?? null,
        window_end: rows.find((r) => r.id === e.signalId)?.window_end ?? null,
        product_fit: e.productFit,
        gsc_opportunity_score: e.score,
        score_components: e.components,
        note: "GSC impressions are site visibility, not search volume",
      },
    }));

    let created: any[] = [];
    if (payload.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from("pdf_opportunities")
        .insert(payload)
        .select("id,keyword,title,priority,confidence,status,verification,approval,evidence");
      if (insertError) throw new Error(`Creating candidates failed: ${insertError.message}`);
      created = inserted ?? [];
    }

    return {
      evaluated: rows.length,
      rejected,
      qualifying: accepted.length,
      created: created.length,
      rejection_reasons: evaluations.reduce<Record<string, number>>((acc, e) => {
        if (!e.accepted) acc[e.reason] = (acc[e.reason] ?? 0) + 1;
        return acc;
      }, {}),
      candidates: created.map((c) => ({
        id: c.id,
        query: c.evidence?.query,
        product_fit: c.evidence?.product_fit,
        impressions: c.evidence?.impressions,
        avg_position: c.evidence?.avg_position,
        gsc_opportunity_score: c.priority,
        confidence: c.confidence,
        status: c.status,
        verification: c.verification,
        approval: c.approval,
      })),
      note: "Candidates are review-only; the production worker requires approval='approved'.",
    };
  });
