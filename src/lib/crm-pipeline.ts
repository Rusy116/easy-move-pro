/**
 * Easy Move Pro — Master CRM pipeline (Admin + Broker).
 *
 * One canonical pipeline is shared by the Broker workspace and the Admin CRM so
 * that every role reads the same state out of `quotes`. The pipeline is derived,
 * never stored twice: `job_status` (company execution) is the source of truth,
 * with `lead_status` used before a company claims the lead.
 *
 * IMPORTANT: the Broker can never set "Completed". Completion is written only by
 * the moving company (fn_company_complete_job), and the broker record follows.
 */

export type PipelineStage =
  | "new_lead"
  | "claimed"
  | "contacted"
  | "survey_scheduled"
  | "survey_completed"
  | "estimate_sent"
  | "estimate_accepted"
  | "move_scheduled"
  | "move_in_progress"
  | "completed";

export const PIPELINE_STAGES: Array<{ stage: PipelineStage; label: string }> = [
  { stage: "new_lead", label: "New Lead" },
  { stage: "claimed", label: "Claimed" },
  { stage: "contacted", label: "Customer Contacted" },
  { stage: "survey_scheduled", label: "Survey Scheduled" },
  { stage: "survey_completed", label: "Survey Completed" },
  { stage: "estimate_sent", label: "Estimate Sent" },
  { stage: "estimate_accepted", label: "Estimate Accepted" },
  { stage: "move_scheduled", label: "Move Scheduled" },
  { stage: "move_in_progress", label: "Move In Progress" },
  { stage: "completed", label: "Completed" },
];

/** Additional outcomes only the Admin pipeline displays. */
export const ADMIN_EXTRA_STAGES = ["cancelled", "lost", "won"] as const;
export type AdminStage = PipelineStage | (typeof ADMIN_EXTRA_STAGES)[number] | "submitted";

/** Every stage the Admin lead pipeline can show, in spec order. */
export const ADMIN_PIPELINE: Array<{ stage: AdminStage; label: string }> = [
  { stage: "submitted", label: "Submitted" },
  ...PIPELINE_STAGES.filter((s) => s.stage !== "new_lead"),
  { stage: "cancelled", label: "Cancelled" },
  { stage: "lost", label: "Lost" },
  { stage: "won", label: "Won" },
];

const JOB_STATUS_TO_STAGE: Record<string, PipelineStage> = {
  claimed: "claimed",
  contacted: "contacted",
  survey_scheduled: "survey_scheduled",
  survey_completed: "survey_completed",
  final_quote_sent: "estimate_sent",
  estimate_sent: "estimate_sent",
  estimate_accepted: "estimate_accepted",
  accepted: "estimate_accepted",
  price_confirmed: "estimate_accepted",
  customer_confirmed: "estimate_accepted",
  scheduled: "move_scheduled",
  booked: "move_scheduled",
  in_progress: "move_in_progress",
  completed: "completed",
};

export type PipelineQuote = {
  job_status?: string | null;
  lead_status?: string | null;
  status?: string | null;
  completed_at?: string | null;
  claimed_at?: string | null;
};

export function stageOf(q: PipelineQuote): PipelineStage {
  if (q.completed_at || q.job_status === "completed") return "completed";
  const fromJob = JOB_STATUS_TO_STAGE[q.job_status ?? ""];
  if (fromJob) return fromJob;
  const fromLead = JOB_STATUS_TO_STAGE[q.lead_status ?? ""];
  if (fromLead) return fromLead;
  if (q.claimed_at) return "claimed";
  return "new_lead";
}

export function stageIndex(stage: PipelineStage): number {
  return PIPELINE_STAGES.findIndex((s) => s.stage === stage);
}

export function stageLabel(stage: PipelineStage): string {
  return PIPELINE_STAGES.find((s) => s.stage === stage)?.label ?? "New Lead";
}

/** Terminal outcomes that override the linear pipeline for display. */
export function outcomeOf(q: { job_status?: string | null; lead_status?: string | null }) {
  const s = q.job_status ?? q.lead_status ?? "";
  if (s === "cancelled") return "cancelled" as const;
  if (s === "declined" || s === "rejected" || s === "lost") return "lost" as const;
  if (s === "completed") return "won" as const;
  return null;
}

export const STAGE_TONE: Record<string, string> = {
  new_lead: "bg-neutral-100 text-neutral-700 border-neutral-300",
  submitted: "bg-blue-100 text-blue-800 border-blue-300",
  claimed: "bg-purple-100 text-purple-800 border-purple-300",
  contacted: "bg-sky-100 text-sky-800 border-sky-300",
  survey_scheduled: "bg-amber-100 text-amber-800 border-amber-300",
  survey_completed: "bg-amber-100 text-amber-900 border-amber-300",
  estimate_sent: "bg-indigo-100 text-indigo-800 border-indigo-300",
  estimate_accepted: "bg-teal-100 text-teal-800 border-teal-300",
  move_scheduled: "bg-cyan-100 text-cyan-800 border-cyan-300",
  move_in_progress: "bg-lime-100 text-lime-800 border-lime-300",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
  cancelled: "bg-neutral-200 text-neutral-700 border-neutral-300",
  lost: "bg-rose-100 text-rose-800 border-rose-300",
  won: "bg-emerald-100 text-emerald-800 border-emerald-300",
};
