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
  "final_quote_sent",
  "accepted",
  "rejected",
  "booked",
  "completed",
  "cancelled",
  "expired",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  new: "New lead",
  qualified: "Qualified",
  open_market: "Open market",
  claimed: "Claimed",
  contacted: "Customer contacted",
  final_quote_sent: "Final quote sent",
  accepted: "Customer accepted",
  rejected: "Rejected",
  booked: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

export const JOB_STATUS_TONE: Record<JobStatus, string> = {
  new: "border-border bg-muted text-muted-foreground",
  qualified: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  open_market: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  claimed: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700",
  contacted: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  final_quote_sent: "border-violet-500/30 bg-violet-500/10 text-violet-700",
  accepted: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  rejected: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  booked: "border-emerald-600/30 bg-emerald-600/10 text-emerald-800",
  completed: "border-emerald-700/30 bg-emerald-700/10 text-emerald-900",
  cancelled: "border-rose-500/30 bg-rose-500/10 text-rose-700",
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
/*                          Data access hook                           */
/* ------------------------------------------------------------------ */

/** Resolves the moving company the signed-in user belongs to. */
export function useMyCompany() {
  const [company, setCompany] = useState<JobCompany | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("moving_companies")
        .select("id, name, status, suspended")
        .limit(1);
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

  const reload = useCallback(async () => {
    if (!companyId || busy.current) return;
    busy.current = true;
    const [av, mine] = await Promise.all([
      supabase.rpc("fn_company_available_jobs", { _company_id: companyId }),
      supabase.rpc("fn_company_my_jobs", { _company_id: companyId }),
    ]);
    setAvailable((av.data ?? []) as AvailableJob[]);
    setMyJobs((mine.data ?? []) as MyJob[]);
    setLoading(false);
    busy.current = false;
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
        { event: "INSERT", schema: "public", table: "company_activity", filter: `quote_id=eq.${quoteId}` },
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
