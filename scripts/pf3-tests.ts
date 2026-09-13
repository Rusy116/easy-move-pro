/* eslint-disable @typescript-eslint/no-explicit-any */
// PF-3 verification suite. Pure/static checks only — no production writes,
// no approvals, no factory tick, no AI calls.
import { groupCandidates, proposedSlug, validateApproval, type ReviewCandidate } from "../src/lib/demand/candidate-review";

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};

const base: ReviewCandidate = {
  id: "a", keyword: "apartment movers", title: "Apartment Move Planner", category_slug: "planners",
  status: "candidate", verification: "real_verified", approval: "pending", confidence: 0.86,
  priority: 87, gap_reason: null, snooze_until: null, created_at: "2026-09-03T04:18:54Z",
  evidence: { demand_signal_id: "sig-1", verification_source: "gsc", query: "apartment movers", impressions: 21, avg_position: 33.4 },
};
const ctx = { categories: ["planners", "budget", "checklists"], takenSlugs: [], approvedSlugs: [] };

async function main() {
  console.log("PF-3 tests\n");

  // A/B — queue filtering is expressed in the server query; verify statically.
  const fns = await Bun.file("src/lib/demand/candidate-review.functions.ts").text();
  check("A pending queue filters candidate+real_verified+pending",
    /eq\("verification", "real_verified"\)/.test(fns) && /eq\("status", "candidate"\)\.eq\("approval", "pending"\)/.test(fns));
  check("B synthetic rows excluded (verification filter on every view)",
    (fns.match(/eq\("verification", "real_verified"\)/g) ?? []).length >= 1 && !/legacy_unverified/.test(fns));

  // C/D — server-side admin authorization on every mutation
  check("C admin check is server-side via has_role", /rpc\("has_role"/.test(fns) && /throw new Error\("Forbidden"\)/.test(fns));
  const mutations = ["approveCandidate", "rejectCandidate", "snoozeCandidate", "unsnoozeCandidate", "listCandidateReview"];
  check("D every action requires auth middleware + admin gate",
    mutations.every((m) => new RegExp(`export const ${m}[\\s\\S]{0,400}requireSupabaseAuth`).test(fns)) &&
    (fns.match(/await adminContext\(context\)/g) ?? []).length === mutations.length);
  check("D no public/unauthenticated server fn in this module", !/createServerFn\(\{[^)]*\}\)\s*\n\s*\.inputValidator/.test(fns));

  // E — evidence revalidated at approval time
  const noEvidence = validateApproval({ ...base, evidence: {} }, "planners", ctx);
  check("E missing evidence blocks approval", !noEvidence.ok && noEvidence.code === "no_evidence");
  check("E evidence re-read from demand_signals server-side", /from\("demand_signals"\)/.test(fns) && /source !== "gsc"/.test(fns));

  // F/G — category validation
  check("F valid category approves", validateApproval(base, "planners", ctx).ok);
  const badCat = validateApproval({ ...base, category_slug: "budgets" }, "budgets", ctx);
  check("G nonexistent category blocks", !badCat.ok && badCat.code === "invalid_category");
  check("G corrected category unblocks", validateApproval({ ...base, category_slug: "budgets" }, "budget", ctx).ok);

  // H/I — same-slug duplicate handling
  const twin: ReviewCandidate = { ...base, id: "b", keyword: "apartment mover", priority: 78, evidence: { ...base.evidence, demand_signal_id: "sig-2", query: "apartment mover", impressions: 9 } };
  const groups = groupCandidates([base, twin]);
  check("H same-slug candidates grouped", groups.length === 1 && groups[0]!.candidates.length === 2 && groups[0]!.slug === "apartment-move-planner");
  check("H primary is the highest-scoring candidate", groups[0]!.primaryId === "a");
  check("H combined impressions are observed sums only", groups[0]!.combinedImpressions === 30);
  const second = validateApproval(twin, "planners", { ...ctx, approvedSlugs: [proposedSlug(base.title)] });
  check("I second duplicate cannot become eligible", !second.ok && second.code === "duplicate_approved");
  check("I approval closes same-slug siblings as rejected", /duplicate of opportunity/.test(fns) && /approval: "rejected"/.test(fns));
  const taken = validateApproval(base, "planners", { ...ctx, takenSlugs: ["apartment-move-planner"] });
  check("H existing job/product conflict blocks", !taken.ok && taken.code === "slug_conflict");

  // J — approve writes exactly the three approval fields
  check("J approve writes approval/approved_by/approved_at",
    /approval: "approved"/.test(fns) && /approved_by: userId/.test(fns) && /approved_at: new Date\(\)/.test(fns));

  // K/L/M — approve does not enqueue, create or publish
  check("K approve never writes pdf_jobs", !/from\("pdf_jobs"\)[\s\S]{0,120}insert/.test(fns));
  check("L approve never inserts pdf_products", !/from\("pdf_products"\)[\s\S]{0,120}(insert|upsert)/.test(fns));
  check("M approve never publishes", !/published/.test(fns) && !/runPdfWorkerTick|advanceJobs|enqueueFromBacklog/.test(fns));

  // N/O — autopilot + eligibility untouched
  const worker = await Bun.file("src/lib/pdf-store/worker.server.ts").text();
  check("O eligibility gate unchanged",
    /eq\("status", "candidate"\)/.test(worker) && /eq\("verification", "real_verified"\)/.test(worker) && /eq\("approval", "approved"\)/.test(worker));
  check("N autopilot defaults unchanged",
    /daily_target \?\? 10/.test(worker) && /batch_size \?\? 2/.test(worker) && /min_seo_score \?\? 95/.test(worker));

  // P — PF-1 protections intact
  const factory = await Bun.file("src/lib/pdf-factory.server.ts").text();
  const artifact = await Bun.file("src/lib/pdf-store/artifact.server.ts").text();
  check("P PF-1 duplicate + artifact gate intact",
    /checkDuplicate/.test(factory) && /generateAndVerifyArtifact/.test(factory) && /deliverability_failed/.test(factory));
  check("P artifact verification intact", /isPdfPayload/.test(artifact) && /MIN_ARTIFACT_BYTES/.test(artifact) && /download\(path\)/.test(artifact));

  // Q/R — reject and snooze semantics
  check("Q reject keeps the row and blocks production", /approval: "rejected"/.test(fns) && !/\.delete\(\)/.test(fns));
  check("R snooze reuses snooze_until and blocks production", /approval: "snoozed"/.test(fns) && /snooze_until: new Date\(Date\.now\(\)/.test(fns));
  check("R snoozed candidate can return to review", /approval: "pending", snooze_until: null/.test(fns));
  const rejected = validateApproval({ ...base, approval: "rejected" }, "planners", ctx);
  const snoozed = validateApproval({ ...base, approval: "snoozed" }, "planners", ctx);
  check("Q/R decided candidates cannot be approved through the helper", !rejected.ok && !snoozed.ok && rejected.code === "not_pending");

  // Auditability
  check("audit uses the existing audit_log", /from\("audit_log"\)/.test(fns) && /entity_type: "pdf_opportunity"/.test(fns));

  // S/T/U/V — no payment, city, sitemap or Search Console mutation
  const ui = await Bun.file("src/routes/_authenticated/ai.candidate-review.tsx").text();
  const all = fns + ui;
  check("S no Stripe/checkout surface", !/stripe|checkout/i.test(all));
  check("T no city mutation", !/city_landing_pages/.test(all));
  check("U no sitemap mutation", !/sitemap/i.test(all));
  check("V no Search Console call", !/searchconsole|googleapis/i.test(all));
  check("no manual production button", !/Publish now|Create product now|Run PDF now/i.test(ui));

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

void main();
