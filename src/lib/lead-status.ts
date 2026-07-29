import { supabase } from "@/integrations/supabase/client";

/** Canonical lead lifecycle (Phase 2 — Lead Management). */
export const LEAD_STATUS_FLOW = [
  "draft",
  "submitted",
  "under_review",
  "qualified",
  "published",
  "claimed",
  "contacted",
  "price_confirmed",
  "customer_confirmed",
  "completed",
] as const;

export const LEAD_STATUS_TERMINAL = ["rejected", "cancelled"] as const;

export type LeadStatus = (typeof LEAD_STATUS_FLOW)[number] | (typeof LEAD_STATUS_TERMINAL)[number];

export const ALL_LEAD_STATUSES: LeadStatus[] = [...LEAD_STATUS_FLOW, ...LEAD_STATUS_TERMINAL];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  qualified: "Qualified",
  published: "Published",
  claimed: "Claimed",
  contacted: "Contacted",
  price_confirmed: "Price Confirmed",
  customer_confirmed: "Customer Confirmed",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const LEAD_STATUS_STYLE: Record<LeadStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700 border-neutral-300",
  submitted: "bg-blue-100 text-blue-800 border-blue-300",
  under_review: "bg-amber-100 text-amber-800 border-amber-300",
  qualified: "bg-teal-100 text-teal-800 border-teal-300",
  published: "bg-indigo-100 text-indigo-800 border-indigo-300",
  claimed: "bg-purple-100 text-purple-800 border-purple-300",
  contacted: "bg-sky-100 text-sky-800 border-sky-300",
  price_confirmed: "bg-cyan-100 text-cyan-800 border-cyan-300",
  customer_confirmed: "bg-lime-100 text-lime-800 border-lime-300",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
  rejected: "bg-rose-100 text-rose-800 border-rose-300",
  cancelled: "bg-neutral-200 text-neutral-700 border-neutral-300",
};

/** Mirrors the transition table enforced by fn_set_lead_status. */
export const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["under_review", "qualified", "rejected", "cancelled"],
  under_review: ["qualified", "rejected", "submitted", "cancelled"],
  qualified: ["published", "under_review", "rejected", "cancelled"],
  published: ["claimed", "qualified", "cancelled"],
  claimed: ["contacted", "published", "cancelled"],
  contacted: ["price_confirmed", "cancelled"],
  price_confirmed: ["customer_confirmed", "contacted", "cancelled"],
  customer_confirmed: ["completed", "cancelled"],
  completed: [],
  rejected: ["under_review", "submitted"],
  cancelled: ["under_review", "submitted"],
};

export function nextStatuses(current: LeadStatus | null | undefined): LeadStatus[] {
  return LEAD_TRANSITIONS[(current ?? "submitted") as LeadStatus] ?? [];
}

/** Broker queue buckets. */
export const BROKER_QUEUES = {
  new: ["submitted", "draft"] as LeadStatus[],
  under_review: ["under_review"] as LeadStatus[],
  qualified: ["qualified", "published"] as LeadStatus[],
  rejected: ["rejected", "cancelled"] as LeadStatus[],
};

export type BrokerQueue = keyof typeof BROKER_QUEUES | "all";

export const BROKER_QUEUE_LABEL: Record<string, string> = {
  all: "All leads",
  new: "New leads",
  under_review: "Under review",
  qualified: "Qualified",
  rejected: "Rejected",
};

export async function setLeadStatus(quoteId: string, status: LeadStatus, note?: string) {
  const { error } = await supabase.rpc("fn_set_lead_status", {
    _quote_id: quoteId,
    _status: status,
    _note: note ?? null,
  } as never);
  if (error) throw new Error(error.message);
}

export async function requestLeadInfo(quoteId: string, message: string) {
  const { error } = await supabase.rpc("fn_request_lead_info", {
    _quote_id: quoteId,
    _message: message,
  } as never);
  if (error) throw new Error(error.message);
}
