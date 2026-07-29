import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { JobActivity } from "@/lib/company-jobs";

/* ------------------------------------------------------------------ */
/*                               Types                                 */
/* ------------------------------------------------------------------ */

export type PriceRevision = {
  id: string;
  quote_id: string;
  company_id: string;
  revision: number;
  previous_price: number | null;
  new_price: number;
  deposit_amount: number | null;
  additional_charges: number;
  reason: string | null;
  notes: string | null;
  attachments: unknown;
  kind: string;
  status: string;
  created_at: string;
};

export type Commission = {
  id: string;
  quote_id: string;
  company_id: string;
  base_price: number;
  rate: number;
  amount: number;
  status: string;
  created_at: string;
};

export type CompanyNote = {
  id: string;
  quote_id: string;
  body: string;
  created_at: string;
};

/* ------------------------------------------------------------------ */
/*                            Price history                            */
/* ------------------------------------------------------------------ */

/** Full, append-only price history for one job. Never overwritten. */
export function usePriceRevisions(quoteId: string | null) {
  const [rows, setRows] = useState<PriceRevision[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!quoteId) return;
    const { data } = await supabase
      .from("company_price_revisions")
      .select("*")
      .eq("quote_id", quoteId)
      .order("revision", { ascending: false });
    setRows((data ?? []) as unknown as PriceRevision[]);
    setLoading(false);
  }, [quoteId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!quoteId) return;
    const channel = supabase
      .channel(`price-revisions-${quoteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "company_price_revisions",
          filter: `quote_id=eq.${quoteId}`,
        },
        () => void reload(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [quoteId, reload]);

  return { revisions: rows, loadingRevisions: loading, reloadRevisions: reload };
}

/** Every price revision this company has ever filed. */
export function useCompanyPriceRevisions(companyId: string | null) {
  const [rows, setRows] = useState<PriceRevision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("company_price_revisions")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      setRows((data ?? []) as unknown as PriceRevision[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return { rows, loading };
}

/* ------------------------------------------------------------------ */
/*                             Commissions                             */
/* ------------------------------------------------------------------ */

/** Commission records created when a final price is confirmed (payment not processed). */
export function useCommissions(companyId: string | null) {
  const [rows, setRows] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("company_commissions")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(300);
    setRows((data ?? []) as unknown as Commission[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const pendingTotal = rows
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  return {
    commissions: rows,
    loadingCommissions: loading,
    pendingTotal,
    reloadCommissions: reload,
  };
}

/* ------------------------------------------------------------------ */
/*                           Internal notes                            */
/* ------------------------------------------------------------------ */

export function useCompanyNotes(quoteId: string | null, companyId: string | null) {
  const [notes, setNotes] = useState<CompanyNote[]>([]);

  const reload = useCallback(async () => {
    if (!quoteId) return;
    const { data } = await supabase
      .from("company_notes")
      .select("id, quote_id, body, created_at")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: false });
    setNotes((data ?? []) as CompanyNote[]);
  }, [quoteId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addNote = useCallback(
    async (body: string) => {
      if (!quoteId || !companyId || !body.trim()) return { error: null };
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("company_notes").insert({
        quote_id: quoteId,
        company_id: companyId,
        author_id: auth.user?.id ?? null,
        body: body.trim(),
      });
      if (!error) await reload();
      return { error };
    },
    [quoteId, companyId, reload],
  );

  return { notes, addNote, reloadNotes: reload };
}

/* ------------------------------------------------------------------ */
/*                         Company CRM actions                         */
/* ------------------------------------------------------------------ */

export async function confirmFinalPrice(args: {
  quoteId: string;
  companyId: string;
  finalPrice: number;
  deposit?: number | null;
  additional?: number;
  notes?: string | null;
}) {
  return supabase.rpc("fn_company_confirm_final_price", {
    _quote_id: args.quoteId,
    _company_id: args.companyId,
    _final_price: args.finalPrice,
    _deposit: args.deposit ?? null,
    _additional: args.additional ?? 0,
    _notes: args.notes ?? null,
  } as never);
}

export async function requestPriceRevision(args: {
  quoteId: string;
  companyId: string;
  newPrice: number;
  reason: string;
  notes?: string | null;
  attachments?: Array<{ name: string; url: string }>;
}) {
  return supabase.rpc("fn_company_request_price_revision", {
    _quote_id: args.quoteId,
    _company_id: args.companyId,
    _new_price: args.newPrice,
    _reason: args.reason,
    _notes: args.notes ?? null,
    _attachments: (args.attachments ?? []) as never,
  } as never);
}

export async function completeMove(args: {
  quoteId: string;
  companyId: string;
  notes?: string | null;
}) {
  return supabase.rpc("fn_company_complete_move", {
    _quote_id: args.quoteId,
    _company_id: args.companyId,
    _notes: args.notes ?? null,
  } as never);
}

/** True once the final price is locked and can only change through a revision. */
export function isPriceLocked(leadStatus?: string | null) {
  return ["price_confirmed", "customer_confirmed", "completed"].includes(leadStatus ?? "");
}

/* ------------------------------------------------------------------ */
/*                          Recent activity                            */
/* ------------------------------------------------------------------ */

/** Latest audit-log entries across every job this company owns. */
export function useCompanyRecentActivity(companyId: string | null, limit = 12) {
  const [activity, setActivity] = useState<JobActivity[]>([]);

  const reload = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("company_activity")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit);
    setActivity((data ?? []) as JobActivity[]);
  }, [companyId, limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`company-recent-activity-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "company_activity",
          filter: `company_id=eq.${companyId}`,
        },
        () => void reload(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, reload]);

  return { activity, reloadActivity: reload };
}
