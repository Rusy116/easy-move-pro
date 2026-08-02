import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/* ------------------------------------------------------------------ */
/*                          Status vocabulary                          */
/* ------------------------------------------------------------------ */

export const JOB_STATUSES = [
  "new",
  "qualified",
  "open_market",
  "claimed",
  "contacted",
  "survey_scheduled",
  "survey_completed",
  "final_quote_sent",
  "accepted",
  "estimate_accepted",
  "scheduled",
  "in_progress",
  "rejected",
  "booked",
  "completed",
  "cancelled",
  "declined",
  "expired",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  new: "New lead",
  qualified: "Qualified",
  open_market: "Open market",
  claimed: "Claimed",
  contacted: "Customer contacted",
  survey_scheduled: "Survey scheduled",
  survey_completed: "Survey completed",
  final_quote_sent: "Estimate sent",
  accepted: "Customer accepted",
  estimate_accepted: "Estimate accepted",
  scheduled: "Move scheduled",
  in_progress: "Move in progress",
  rejected: "Rejected",
  booked: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
  expired: "Expired",
};

export const JOB_STATUS_TONE: Record<JobStatus, string> = {
  new: "border-border bg-muted text-muted-foreground",
  qualified: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  open_market: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  claimed: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700",
  contacted: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  survey_scheduled: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  survey_completed: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700",
  final_quote_sent: "border-violet-500/30 bg-violet-500/10 text-violet-700",
  accepted: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  estimate_accepted: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  scheduled: "border-emerald-600/30 bg-emerald-600/10 text-emerald-800",
  in_progress: "border-amber-600/30 bg-amber-600/10 text-amber-800",
  rejected: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  booked: "border-emerald-600/30 bg-emerald-600/10 text-emerald-800",
  completed: "border-emerald-700/30 bg-emerald-700/10 text-emerald-900",
  cancelled: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  declined: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  expired: "border-border bg-muted text-muted-foreground",
};


/* ------------------------------------------------------------------ */
/*                                Types                                */
/* ------------------------------------------------------------------ */

export type AvailableJob = {
  id: string;
  quote_number: string | null;
  customer_name: string | null;
  origin_city: string | null;
  origin_state: string | null;
  destination_city: string | null;
  destination_state: string | null;
  move_date: string | null;
  distance_miles: number | null;
  estimated_cubic_feet: number | null;
  estimated_low: number | null;
  estimated_high: number | null;
  move_type: string | null;
  property_type: string | null;
  services: string[] | null;
  published_at: string | null;
};

export type MyJob = Tables<"quotes">;
export type JobActivity = Tables<"company_activity">;

export type JobCompany = {
  id: string;
  name: string;
  status: string | null;
  suspended: boolean | null;
};

/* ------------------------------------------------------------------ */
/*                              Formatting                             */
/* ------------------------------------------------------------------ */

export function money(n: number | null | undefined) {
  return typeof n === "number" ? `$${Math.round(n).toLocaleString("en-US")}` : "—";
}

export function place(city?: string | null, state?: string | null) {
  return [city, state].filter(Boolean).join(", ") || "—";
}

export function formatDate(v?: string | null) {
  if (!v) return "Flexible";
  const d = new Date(v.length <= 10 ? `${v}T00:00:00` : v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function countdown(iso?: string | null) {
  if (!iso) return { label: "—", expired: false, urgent: false };
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { label: "Expired", expired: true, urgent: true };
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return {
    label: h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`,
    expired: false,
    urgent: ms < 2 * 3_600_000,
  };
}

/* ------------------------------------------------------------------ */
/*                 Marketplace card value + priority                   */
/* ------------------------------------------------------------------ */

/** Platform commission taken from the job value. */
export const COMMISSION_RATE = 0.25;

/** Company payout range after platform commission. */
export function payoutRange(low?: number | null, high?: number | null) {
  const k = 1 - COMMISSION_RATE;
  const lo = typeof low === "number" ? low * k : null;
  const hi = typeof high === "number" ? high * k : null;
  if (lo == null && hi == null) return "—";
  if (lo != null && hi != null && Math.round(lo) !== Math.round(hi))
    return `${money(lo)}–${money(hi)}`;
  return money(hi ?? lo);
}

export function revenueRange(low?: number | null, high?: number | null) {
  if (low == null && high == null) return "—";
  if (low != null && high != null && Math.round(low) !== Math.round(high))
    return `${money(low)}–${money(high)}`;
  return money(high ?? low);
}

export function distanceLabel(miles?: number | null) {
  if (typeof miles !== "number" || Number.isNaN(miles)) return "—";
  return `${Math.round(miles).toLocaleString("en-US")} miles`;
}

/** Human "Posted 19 minutes ago". */
export function postedAgo(iso?: string | null) {
  if (!iso) return "Just posted";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Posted just now";
  if (mins < 60) return `Posted ${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Posted ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Posted ${days} day${days === 1 ? "" : "s"} ago`;
}

/** 12-hour exclusive window measured from publish time. */
export const EXCLUSIVE_WINDOW_HOURS = 12;

export function exclusiveWindow(publishedAt?: string | null) {
  if (!publishedAt) return { active: false, label: "Open to all partners" };
  const end = new Date(publishedAt).getTime() + EXCLUSIVE_WINDOW_HOURS * 3_600_000;
  const ms = end - Date.now();
  if (ms <= 0) return { active: false, label: "Open to all partners" };
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60000);
  return {
    active: true,
    urgent: ms < 2 * 3_600_000,
    label: `Exclusive expires in ${h > 0 ? `${h}h ${m}m` : `${m}m`}`,
  };
}

export type LeadPriority = "standard" | "exclusive" | "priority" | "hot";

export const LEAD_PRIORITY_LABEL: Record<LeadPriority, string> = {
  standard: "Standard",
  exclusive: "Exclusive",
  priority: "Priority",
  hot: "Hot Lead",
};

export const LEAD_PRIORITY_TONE: Record<LeadPriority, string> = {
  standard: "border-border bg-muted text-muted-foreground",
  exclusive: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700",
  priority: "border-amber-500/30 bg-amber-500/10 text-amber-800",
  hot: "border-rose-500/30 bg-rose-500/10 text-rose-700",
};

/** Derives a marketplace priority badge from value, urgency and freshness. */
export function leadPriority(job: {
  estimated_high?: number | null;
  estimated_low?: number | null;
  move_date?: string | null;
  published_at?: string | null;
}): LeadPriority {
  const value = job.estimated_high ?? job.estimated_low ?? 0;
  const soon = job.move_date
    ? (new Date(`${job.move_date}T00:00:00`).getTime() - Date.now()) / 86_400_000
    : Infinity;
  const fresh = job.published_at
    ? Date.now() - new Date(job.published_at).getTime() < 2 * 3_600_000
    : false;
  if (value >= 6000 && (fresh || soon <= 14)) return "hot";
  if (value >= 3500 || soon <= 7) return "priority";
  if (exclusiveWindow(job.published_at).active) return "exclusive";
  return "standard";
}

/* ------------------------------------------------------------------ */
/*                          Data access hook                           */
/* ------------------------------------------------------------------ */

/** Resolves the company id the signed-in user (or impersonated user) belongs to. */
export async function resolveMyCompanyId(): Promise<string | null> {
  const { data } = await supabase.rpc("fn_current_mover_company");
  return (data as string | null) ?? null;
}

/** Resolves the moving company the signed-in user belongs to. */
export function useMyCompany() {
  const [company, setCompany] = useState<JobCompany | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await resolveMyCompanyId();
      const query = supabase.from("moving_companies").select("id, name, status, suspended");
      const { data } = id ? await query.eq("id", id).limit(1) : await query.limit(1);
      if (cancelled) return;
      setCompany((data?.[0] as JobCompany | undefined) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { company, loading };
}


/**
 * Loads the open marketplace + owned jobs for a company and keeps both lists
 * live through Supabase realtime (claims, activity and quote changes).
 */
export function useCompanyJobs(companyId: string | null) {
  const [available, setAvailable] = useState<AvailableJob[]>([]);
  const [myJobs, setMyJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const busy = useRef(false);
  const queued = useRef(false);

  const reload = useCallback(async () => {
    if (!companyId) return;
    if (busy.current) {
      queued.current = true;
      return;
    }
    busy.current = true;
    const [av, mine] = await Promise.all([
      supabase.rpc("fn_company_available_jobs", { _company_id: companyId }),
      supabase.rpc("fn_company_my_jobs", { _company_id: companyId }),
    ]);
    setAvailable((av.data ?? []) as AvailableJob[]);
    setMyJobs((mine.data ?? []) as MyJob[]);
    setLoading(false);
    busy.current = false;
    if (queued.current) {
      queued.current = false;
      void reload();
    }
  }, [companyId]);


  useEffect(() => {
    if (!companyId) return;
    void reload();
  }, [companyId, reload]);

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`company-jobs-${companyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "company_claims" }, () => {
        void reload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "company_activity" }, () => {
        void reload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () => {
        void reload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "quote_assignments" }, () => {
        void reload();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, reload]);

  /** Optimistically drop a job from the marketplace list. */
  const dropAvailable = useCallback((quoteId: string) => {
    setAvailable((prev) => prev.filter((j) => j.id !== quoteId));
  }, []);

  const patchJob = useCallback((quoteId: string, patch: Partial<MyJob>) => {
    setMyJobs((prev) => prev.map((j) => (j.id === quoteId ? { ...j, ...patch } : j)));
  }, []);

  return { available, myJobs, loading, reload, dropAvailable, patchJob };
}

/** Job audit trail (activity + status history) for one quote. */
export function useJobActivity(quoteId: string | null) {
  const [rows, setRows] = useState<JobActivity[]>([]);

  const reload = useCallback(async () => {
    if (!quoteId) return;
    const { data } = await supabase
      .from("company_activity")
      .select("*")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data ?? []) as JobActivity[]);
  }, [quoteId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!quoteId) return;
    const channel = supabase
      .channel(`job-activity-${quoteId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "company_activity",
          filter: `quote_id=eq.${quoteId}`,
        },
        () => void reload(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [quoteId, reload]);

  return { activity: rows, reloadActivity: reload };
}

export const ACTIVITY_LABEL: Record<string, string> = {
  lead_qualified: "Broker qualified the lead",
  job_claimed: "Job claimed",
  contacted: "Customer contacted",
  save_details: "Job details updated",
  send_final_quote: "Final quote sent to customer",
  schedule: "Move scheduled",
  complete: "Job completed",
  cancel: "Job cancelled",
  claim_expired: "Claim expired — returned to marketplace",
  customer_accepted_final: "Customer accepted the final quote",
  customer_rejected_final: "Customer rejected the final quote",
};

/* ------------------------------------------------------------------ */
/*                     Marketplace engine (Phase 3)                    */
/* ------------------------------------------------------------------ */

export type ExpiredClaim = {
  quote_id: string;
  quote_number: string | null;
  origin_city: string | null;
  origin_state: string | null;
  destination_city: string | null;
  destination_state: string | null;
  move_date: string | null;
  claimed_at: string | null;
  expires_at: string | null;
  job_status: string | null;
};

/** Claims that ran past the 12-hour exclusive window and returned to the marketplace. */
export function useExpiredClaims(companyId: string | null) {
  const [rows, setRows] = useState<ExpiredClaim[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase.rpc("fn_company_expired_claims", {
      _company_id: companyId,
    } as never);
    setRows((data ?? []) as ExpiredClaim[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`company-expired-${companyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_claims" },
        () => void reload(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, reload]);

  return { rows, loading, reload };
}

/** Audit trail: record that a company opened a marketplace lead. */
export async function logJobView(quoteId: string, companyId: string) {
  await supabase.rpc("fn_company_log_view", {
    _quote_id: quoteId,
    _company_id: companyId,
  } as never);
}
