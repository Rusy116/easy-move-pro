import { supabase } from "@/integrations/supabase/client";

export type EstimateStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected" | "superseded";

export type EstimateRevision = {
  id: string;
  quote_id: string;
  assignment_id: string;
  company_id: string;
  revision: number;
  amount: number;
  currency: string;
  breakdown: Record<string, number> | null;
  notes: string | null;
  valid_until: string | null;
  is_current: boolean;
  status: EstimateStatus;
  submitted_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  sent_to_email: string | null;
  broker_estimate_low: number | null;
  broker_estimate_high: number | null;
  company_estimate: number | null;
  final_accepted_price: number | null;
  commission_rate: number | null;
  broker_commission: number | null;
  gross_profit: number | null;
};

export const ESTIMATE_STATUS_LABEL: Record<EstimateStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  rejected: "Rejected",
  superseded: "Superseded",
};

export const ESTIMATE_STATUS_STYLE: Record<EstimateStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700 border-neutral-300",
  sent: "bg-blue-100 text-blue-800 border-blue-300",
  viewed: "bg-amber-100 text-amber-800 border-amber-300",
  accepted: "bg-emerald-100 text-emerald-800 border-emerald-300",
  rejected: "bg-rose-100 text-rose-800 border-rose-300",
  superseded: "bg-neutral-100 text-neutral-500 border-neutral-300",
};

function rpc<T>(name: string, args: Record<string, unknown>) {
  return supabase.rpc(name as never, args as never) as unknown as Promise<{
    data: T | null;
    error: { message: string } | null;
  }>;
}

export async function listEstimateRevisions(assignmentId: string): Promise<EstimateRevision[]> {
  const { data, error } = await supabase
    .from("estimate_revisions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("revision", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EstimateRevision[];
}

export async function saveEstimateDraft(params: {
  assignmentId: string;
  amount: number;
  breakdown: Record<string, number>;
  notes?: string | null;
  validUntil?: string | null;
  revisionId?: string | null;
}): Promise<EstimateRevision> {
  const { data, error } = await rpc<EstimateRevision>("fn_estimate_save_draft", {
    _assignment_id: params.assignmentId,
    _amount: params.amount,
    _breakdown: params.breakdown,
    _notes: params.notes ?? null,
    _valid_until: params.validUntil ? new Date(params.validUntil).toISOString() : null,
    _revision_id: params.revisionId ?? null,
  });
  if (error) throw new Error(error.message);
  return data as EstimateRevision;
}

export async function sendEstimate(revisionId: string, email?: string | null) {
  const { data, error } = await rpc<{ ok: boolean; revision: number; amount: number }>(
    "fn_estimate_send",
    { _revision_id: revisionId, _email: email ?? null },
  );
  if (error) throw new Error(error.message);
  return data;
}

export async function markEstimateViewed(revisionId: string) {
  await rpc("fn_estimate_mark_viewed", { _revision_id: revisionId });
}

export type PortalEstimate = {
  id: string;
  revision: number;
  amount: number;
  status: EstimateStatus;
  breakdown: Record<string, number> | null;
  notes: string | null;
  valid_until: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  company_name: string | null;
};

export async function fetchPortalEstimate(quoteNumber: string, token: string) {
  const { data, error } = await rpc<{ ok: boolean; estimate: PortalEstimate | null }>(
    "fn_portal_current_estimate",
    { _quote_number: quoteNumber, _token: token },
  );
  if (error) throw new Error(error.message);
  return data?.estimate ?? null;
}

export type EstimateAcceptResult = {
  ok: boolean;
  status: string;
  job_number?: string;
  invoice_number?: string;
  bill_of_lading?: string;
  commission?: number;
  gross_profit?: number;
};

export async function respondToPortalEstimate(
  quoteNumber: string,
  token: string,
  accept: boolean,
  reason?: string | null,
) {
  const { data, error } = await rpc<EstimateAcceptResult>("fn_portal_respond_estimate", {
    _quote_number: quoteNumber,
    _token: token,
    _accept: accept,
    _reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
  return data as EstimateAcceptResult;
}
