import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Clock, Undo2, Building2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { countdown } from "@/lib/company-jobs";

/* ------------------------------------------------------------------ */
/*                     Timer tone (Stage 1 color rules)                */
/*   green  = healthy   orange = < 2h remaining   red = expired        */
/* ------------------------------------------------------------------ */

export function timerTone(deadline?: string | null) {
  const c = countdown(deadline);
  if (!deadline) return { ...c, tone: "border-border bg-muted text-muted-foreground" };
  if (c.expired) return { ...c, tone: "border-rose-500/30 bg-rose-500/10 text-rose-700" };
  if (c.urgent) return { ...c, tone: "border-orange-500/30 bg-orange-500/10 text-orange-700" };
  return { ...c, tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" };
}

/** Live claim countdown chip using the Stage 1 color rules. */
export function ClaimTimer({ deadline }: { deadline: string | null | undefined }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!deadline) return null;
  const c = timerTone(deadline);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${c.tone}`}
    >
      <Clock className="h-3 w-3" />
      {c.expired ? "Timer expired" : `${c.label} left`}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*                            Release / Recall                         */
/* ------------------------------------------------------------------ */

function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  required,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  required: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Textarea
          rows={3}
          value={reason}
          placeholder="Reason (visible in the lead timeline)"
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy || (required && !reason.trim())}
            onClick={() => onConfirm(reason.trim())}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Company hands a claimed job back to the open marketplace. */
export function ReleaseJobButton({
  quoteId,
  companyId,
  onDone,
  className = "",
}: {
  quoteId: string;
  companyId: string;
  onDone?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function release(reason: string) {
    setBusy(true);
    const { error } = await supabase.rpc("fn_company_release_job" as never, {
      _quote_id: quoteId,
      _company_id: companyId,
      _reason: reason || null,
    } as never);
    setBusy(false);
    if (error) {
      toast.error(error.message || "Could not release this job");
      return;
    }
    setOpen(false);
    toast.success("Job released — it is back on the marketplace");
    onDone?.();
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={`rounded-full text-rose-700 ${className}`}
        onClick={() => setOpen(true)}
      >
        <Undo2 className="mr-1.5 h-3.5 w-3.5" />
        Release job
      </Button>
      <ReasonDialog
        open={open}
        busy={busy}
        required={false}
        title="Release this job?"
        description="The job returns to the open marketplace immediately and every eligible company can claim it again."
        confirmLabel={busy ? "Releasing…" : "Release job"}
        onCancel={() => setOpen(false)}
        onConfirm={(r) => void release(r)}
      />
    </>
  );
}

/** Admin / broker pulls a job back from the company that owns it. */
export function RecallJobButton({
  quoteId,
  onDone,
  className = "",
}: {
  quoteId: string;
  onDone?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function recall(reason: string) {
    setBusy(true);
    const { error } = await supabase.rpc("fn_staff_recall_job" as never, {
      _quote_id: quoteId,
      _reason: reason,
      _warn: true,
    } as never);
    setBusy(false);
    if (error) {
      toast.error(error.message || "Could not recall this job");
      return;
    }
    setOpen(false);
    toast.success("Job recalled — marketplace reopened and a warning was issued");
    onDone?.();
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={`text-rose-700 ${className}`}
        onClick={() => setOpen(true)}
      >
        <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
        Recall job
      </Button>
      <ReasonDialog
        open={open}
        busy={busy}
        required
        title="Recall this job from the company?"
        description="Use for complaints, fraud, price manipulation or bad communication. The company loses the job, receives a warning and the marketplace reopens."
        confirmLabel={busy ? "Recalling…" : "Recall job"}
        onCancel={() => setOpen(false)}
        onConfirm={(r) => void recall(r)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*                        Broker / admin owner panel                   */
/* ------------------------------------------------------------------ */

type OwnerRow = {
  assigned_company_id: string | null;
  claim_deadline_at: string | null;
  claimed_at: string | null;
  job_status: string | null;
};

type WarningRow = {
  id: string;
  level: number;
  kind: string;
  reason: string | null;
  created_at: string;
};

/** Shows the current job owner, its 12-hour timer, warnings and the recall action. */
export function JobOwnerPanel({ quoteId }: { quoteId: string }) {
  const [row, setRow] = useState<OwnerRow | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<WarningRow[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("quotes")
      .select("assigned_company_id, claim_deadline_at, claimed_at, job_status")
      .eq("id", quoteId)
      .maybeSingle();
    const q = (data as OwnerRow | null) ?? null;
    setRow(q);

    if (q?.assigned_company_id) {
      const [{ data: c }, { data: w }] = await Promise.all([
        supabase.from("moving_companies").select("name").eq("id", q.assigned_company_id).maybeSingle(),
        supabase
          .from("company_warnings" as never)
          .select("id, level, kind, reason, created_at")
          .eq("company_id", q.assigned_company_id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      setCompanyName((c as { name: string } | null)?.name ?? null);
      setWarnings((w ?? []) as unknown as WarningRow[]);
    } else {
      setCompanyName(null);
      setWarnings([]);
    }
  }, [quoteId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`job-owner-${quoteId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quotes", filter: `id=eq.${quoteId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [quoteId, load]);

  if (!row?.assigned_company_id) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground">
        No company owns this lead yet.
      </div>
    );
  }


  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{companyName ?? "Assigned company"}</span>
        <ClaimTimer deadline={row.claim_deadline_at} />
        <div className="ml-auto">
          <RecallJobButton quoteId={quoteId} onDone={() => void load()} />
        </div>
      </div>

      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {warnings.map((w) => (
            <li
              key={w.id}
              className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>Warning #{w.level}</strong> · {w.reason ?? w.kind} ·{" "}
                {new Date(w.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
