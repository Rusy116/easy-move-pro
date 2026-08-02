import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { JobStatus, MyJob } from "@/lib/company-jobs";

/* ------------------------------------------------------------------ */
/*                          Pipeline (Step 5)                          */
/* ------------------------------------------------------------------ */

/** The mandatory Easy Move Pro company pipeline, in order. */
export const JOB_PIPELINE: Array<{ status: JobStatus; label: string; action: string | null }> = [
  { status: "claimed", label: "Claimed", action: null },
  { status: "contacted", label: "Customer Contacted", action: "contacted" },
  { status: "survey_scheduled", label: "Survey Scheduled", action: "survey_scheduled" },
  { status: "survey_completed", label: "Survey Completed", action: "survey_completed" },
  { status: "final_quote_sent", label: "Estimate Sent", action: "send_final_quote" },
  { status: "estimate_accepted", label: "Estimate Accepted", action: "estimate_accepted" },
  { status: "scheduled", label: "Move Scheduled", action: "schedule" },
  { status: "in_progress", label: "Move In Progress", action: "start_move" },
  { status: "completed", label: "Completed", action: "complete" },
];

/** Legacy statuses mapped onto the canonical pipeline for progress display. */
const PIPELINE_ALIAS: Record<string, JobStatus> = {
  accepted: "estimate_accepted",
  booked: "scheduled",
};

export function pipelineIndex(status: string | null | undefined): number {
  const s = (PIPELINE_ALIAS[status ?? ""] ?? status) as JobStatus;
  const i = JOB_PIPELINE.findIndex((p) => p.status === s);
  return i;
}

/** Statuses that permanently leave Current Jobs. */
export const CLOSED_JOB_STATUSES = [
  "completed",
  "cancelled",
  "declined",
  "rejected",
  "expired",
  "open_market",
] as const;

export function isCurrentJob(job: MyJob) {
  return (
    Boolean(job.assigned_company_id) &&
    !CLOSED_JOB_STATUSES.includes((job.job_status ?? "") as (typeof CLOSED_JOB_STATUSES)[number])
  );
}

export function isCompletedJob(job: MyJob) {
  return job.job_status === "completed";
}

/* ------------------------------------------------------------------ */
/*                        Additional services                          */
/* ------------------------------------------------------------------ */

export const JOB_SERVICES = [
  "Packing",
  "Unpacking",
  "Storage",
  "Piano",
  "Safe",
  "Long Carry",
  "Stairs",
  "Elevator",
  "Shuttle",
  "Extra Labor",
  "Assembly",
  "Disassembly",
  "Junk Removal",
  "Other",
] as const;

export type JobService = (typeof JOB_SERVICES)[number];

export function readServices(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}

/* ------------------------------------------------------------------ */
/*                              Tasks                                  */
/* ------------------------------------------------------------------ */

export type JobTask = {
  id: string;
  quote_id: string;
  company_id: string;
  title: string;
  done: boolean;
  due_date: string | null;
  created_at: string;
};

export const TASK_TEMPLATES = [
  "Call Customer",
  "Schedule Survey",
  "Prepare Estimate",
  "Assign Crew",
  "Book Truck",
];

export function useJobTasks(quoteId: string | null, companyId: string | null) {
  const [tasks, setTasks] = useState<JobTask[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!quoteId) return;
    const { data } = await supabase
      .from("company_job_tasks")
      .select("*")
      .eq("quote_id", quoteId)
      .order("done", { ascending: true })
      .order("created_at", { ascending: true });
    setTasks((data ?? []) as unknown as JobTask[]);
    setLoading(false);
  }, [quoteId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addTask = useCallback(
    async (title: string, dueDate?: string | null) => {
      if (!quoteId || !companyId || !title.trim()) return;
      await supabase.from("company_job_tasks").insert({
        quote_id: quoteId,
        company_id: companyId,
        title: title.trim(),
        due_date: dueDate || null,
      } as never);
      await reload();
    },
    [quoteId, companyId, reload],
  );

  const toggleTask = useCallback(
    async (task: JobTask) => {
      await supabase
        .from("company_job_tasks")
        .update({ done: !task.done } as never)
        .eq("id", task.id);
      await reload();
    },
    [reload],
  );

  const removeTask = useCallback(
    async (id: string) => {
      await supabase.from("company_job_tasks").delete().eq("id", id);
      await reload();
    },
    [reload],
  );

  return { tasks, loadingTasks: loading, addTask, toggleTask, removeTask };
}

/* ------------------------------------------------------------------ */
/*                         Contact history                             */
/* ------------------------------------------------------------------ */

export type ContactChannel = "call" | "sms" | "email";

export type ContactEntry = {
  id: string;
  quote_id: string;
  company_id: string;
  channel: ContactChannel;
  direction: "outbound" | "inbound";
  summary: string | null;
  created_at: string;
};

export function useContactLog(quoteId: string | null, companyId: string | null) {
  const [entries, setEntries] = useState<ContactEntry[]>([]);

  const reload = useCallback(async () => {
    if (!quoteId) return;
    const { data } = await supabase
      .from("company_contact_log")
      .select("*")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: false })
      .limit(200);
    setEntries((data ?? []) as unknown as ContactEntry[]);
  }, [quoteId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const logContact = useCallback(
    async (channel: ContactChannel, summary: string, direction: "outbound" | "inbound") => {
      if (!quoteId || !companyId) return;
      await supabase.from("company_contact_log").insert({
        quote_id: quoteId,
        company_id: companyId,
        channel,
        direction,
        summary: summary.trim() || null,
      } as never);
      await reload();
    },
    [quoteId, companyId, reload],
  );

  return { entries, logContact, reloadContacts: reload };
}

/* ------------------------------------------------------------------ */
/*                          Broker label                               */
/* ------------------------------------------------------------------ */

const brokerCache = new Map<string, string>();

/** Best-effort broker display name for a company-facing job card. */
export function useBrokerName(brokerId: string | null | undefined) {
  const [name, setName] = useState<string | null>(brokerId ? (brokerCache.get(brokerId) ?? null) : null);

  useEffect(() => {
    if (!brokerId) {
      setName(null);
      return;
    }
    const cached = brokerCache.get(brokerId);
    if (cached) {
      setName(cached);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", brokerId)
        .limit(1);
      if (cancelled) return;
      const row = (data?.[0] ?? null) as { full_name?: string | null; email?: string | null } | null;
      const label = row?.full_name || row?.email || "Assigned broker";
      brokerCache.set(brokerId, label);
      setName(label);
    })();
    return () => {
      cancelled = true;
    };
  }, [brokerId]);

  return brokerId ? (name ?? "Assigned broker") : "Unassigned";
}

/* ------------------------------------------------------------------ */
/*                         Decline a claimed job                       */
/* ------------------------------------------------------------------ */

export async function declineJob(quoteId: string, companyId: string, reason?: string) {
  const { error } = await supabase.rpc("fn_company_decline_job", {
    _quote_id: quoteId,
    _company_id: companyId,
    _reason: reason ?? null,
  } as never);
  if (error) throw new Error(error.message);
}
