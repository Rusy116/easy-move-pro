import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, X, Lock, Globe, Sparkles, Send } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { withdrawAssignment, forceOpenMarket, assignCompanies } from "@/lib/leads.functions";
import { SlaCountdown } from "./SlaCountdown";
import { LeadPhaseBadge } from "./LeadPhaseBadge";
import { JobOwnerPanel } from "@/components/marketplace/JobOwnership";
import { useT } from "@/i18n";

type Company = {
  id: string;
  name: string;
  service_states: string[] | null;
  approved: boolean | null;
  suspended: boolean | null;
};

type Assignment = {
  id: string;
  quote_id: string;
  company_id: string;
  state: string;
  status: string | null;
  is_exclusive: boolean;
  invited_at: string | null;
  viewed_at: string | null;
  contacted_at: string | null;
  quoted_at: string | null;
  declined_at: string | null;
  closed_at: string | null;
  sla_due_at: string | null;
  decline_reason: string | null;
  created_at: string;
};

type QuotePhaseRow = {
  id: string;
  lead_phase: string | null;
  exclusive_assignment_id: string | null;
  exclusive_expires_at: string | null;
  exclusive_paused_at: string | null;
  exclusive_pause_reason: string | null;
};

const STATE_STYLES: Record<string, string> = {
  invited: "bg-blue-100 text-blue-800 border-blue-300",
  active: "bg-sky-100 text-sky-800 border-sky-300",
  quoted: "bg-purple-100 text-purple-800 border-purple-300",
  accepted: "bg-emerald-100 text-emerald-800 border-emerald-300",
  declined: "bg-neutral-200 text-neutral-700 border-neutral-300",
  expired: "bg-rose-100 text-rose-800 border-rose-300",
  withdrawn: "bg-slate-200 text-slate-700 border-slate-300",
  superseded: "bg-slate-200 text-slate-700 border-slate-300",
  lost: "bg-rose-100 text-rose-800 border-rose-300",
};

const TERMINAL = new Set(["accepted", "declined", "expired", "withdrawn", "superseded", "lost"]);

export function AssignCompanies({ quoteId }: { quoteId: string }) {
  const tr = useT();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quote, setQuote] = useState<QuotePhaseRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [slaHours, setSlaHours] = useState<number>(12);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const doAssignCompanies = useServerFn(assignCompanies);
  const doWithdraw = useServerFn(withdrawAssignment);
  const doForceOpen = useServerFn(forceOpenMarket);

  const reload = useCallback(async () => {
    const [{ data: cs }, { data: asg }, { data: q }] = await Promise.all([
      supabase
        .from("moving_companies")
        .select("id,name,service_states,approved,suspended")
        .order("name"),
      supabase
        .from("quote_assignments")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false }),
      supabase
        .from("quotes")
        .select(
          "id,lead_phase,exclusive_assignment_id,exclusive_expires_at,exclusive_paused_at,exclusive_pause_reason",
        )
        .eq("id", quoteId)
        .maybeSingle(),
    ]);
    setCompanies((cs ?? []) as Company[]);
    setAssignments((asg ?? []) as Assignment[]);
    setQuote((q ?? null) as QuotePhaseRow | null);
  }, [quoteId]);

  useEffect(() => {
    void reload();
    const ch = supabase
      .channel(`assign-${quoteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quote_assignments",
          filter: `quote_id=eq.${quoteId}`,
        },
        () => void reload(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quotes", filter: `id=eq.${quoteId}` },
        (p) => setQuote(p.new as QuotePhaseRow),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [quoteId, reload]);

  const activeAssignments = assignments.filter((a) => !TERMINAL.has(a.state));
  const historical = assignments.filter((a) => TERMINAL.has(a.state));
  const activeCompanyIds = new Set(activeAssignments.map((a) => a.company_id));
  const available = companies.filter((c) => !activeCompanyIds.has(c.id) && !c.suspended);

  const phase = quote?.lead_phase ?? "unassigned";
  const isExclusive = phase === "exclusive";
  const isOpenMarket = phase === "open_market";
  const isClosed = phase === "closed";

  function toggle(companyId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  }

  async function assignSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBusy("assign");
    try {
      await doAssignCompanies({ data: { quoteId, companyIds: ids, slaHours } });
      toast.success(
        ids.length === 1
          ? tr("admin.shell.assignCompanies.toast.assignedExclusive", { hours: slaHours })
          : tr("admin.shell.assignCompanies.toast.assignedOpenMarket", { count: ids.length }),
      );
      setSelected(new Set());
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("admin.shell.assignCompanies.toast.assignFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function withdraw(a: Assignment) {
    setBusy(a.id);
    try {
      await doWithdraw({ data: { assignmentId: a.id } });
      toast.success(tr("admin.shell.assignCompanies.toast.withdrawn"));
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("admin.shell.assignCompanies.toast.failed"));
    } finally {
      setBusy(null);
    }
  }

  async function openMarket() {
    setBusy("open-market");
    try {
      await doForceOpen({ data: { quoteId, reason: "broker_force" } });
      toast.success(tr("admin.shell.assignCompanies.toast.releasedToOpenMarket"));
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("admin.shell.assignCompanies.toast.failed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Current job owner: company, 12-hour timer, warnings, recall */}
      <JobOwnerPanel quoteId={quoteId} />

      {/* Phase header */}
      <div className="rounded-xl border border-border bg-card/50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <LeadPhaseBadge phase={phase} />
          {isExclusive && (
            <SlaCountdown
              expiresAt={quote?.exclusive_expires_at ?? null}
              pausedAt={quote?.exclusive_paused_at ?? null}
            />
          )}
          {quote?.exclusive_pause_reason && (
            <span className="text-xs text-muted-foreground">
              {tr("admin.shell.assignCompanies.pausedReason", { reason: quote.exclusive_pause_reason })}
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {!isClosed && (isExclusive || activeAssignments.length > 0) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void openMarket()}
                disabled={busy === "open-market"}
              >
                <Globe className="mr-1.5 h-3.5 w-3.5" />
                {tr("admin.shell.assignCompanies.forceOpenMarket")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Active assignments */}
      <div className="rounded-xl border border-border bg-card/50 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Building2 className="h-4 w-4" />
          {tr("admin.shell.assignCompanies.activeAssignmentsCount", { count: activeAssignments.length })}
        </div>

        {activeAssignments.length === 0 && (
          <p className="text-sm text-muted-foreground mb-3">
            {tr("admin.shell.assignCompanies.noActiveAssignments")}
          </p>
        )}

        <div className="space-y-2">
          {activeAssignments.map((a) => {
            const c = companies.find((x) => x.id === a.company_id);
            return (
              <div key={a.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      <span className="truncate">{c?.name ?? tr("admin.shell.assignCompanies.unknownCompany")}</span>
                      {a.is_exclusive && (
                        <Badge
                          variant="outline"
                          className="border-indigo-300 bg-indigo-50 text-indigo-800 text-[10px]"
                        >
                          <Lock className="mr-0.5 h-2.5 w-2.5" />
                          {tr("admin.shell.leadPhase.exclusive")}
                        </Badge>
                      )}
                      {!a.is_exclusive && (
                        <Badge
                          variant="outline"
                          className="border-amber-300 bg-amber-50 text-amber-900 text-[10px]"
                        >
                          <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                          {tr("admin.shell.leadPhase.open_market")}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span>
                        {tr("admin.shell.assignCompanies.invitedAt", {
                          time: new Date(a.invited_at ?? a.created_at).toLocaleString(),
                        })}
                      </span>
                      {a.viewed_at && (
                        <span>
                          {tr("admin.shell.assignCompanies.viewedAt", {
                            time: new Date(a.viewed_at).toLocaleString(),
                          })}
                        </span>
                      )}
                      {a.contacted_at && (
                        <span>
                          {tr("admin.shell.assignCompanies.contactedAt", {
                            time: new Date(a.contacted_at).toLocaleString(),
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void withdraw(a)}
                    disabled={busy === a.id}
                    aria-label={tr("admin.shell.assignCompanies.withdraw")}
                    title={tr("admin.shell.assignCompanies.withdrawAssignment")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`capitalize text-xs ${STATE_STYLES[a.state] ?? ""}`}
                  >
                    {tr(`admin.shell.assignCompanies.state.${a.state}`)}
                  </Badge>
                  {a.is_exclusive && a.sla_due_at && (
                    <SlaCountdown
                      expiresAt={a.sla_due_at}
                      pausedAt={quote?.exclusive_paused_at ?? null}
                      compact
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Assign panel */}
        {!isClosed && available.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>
                {isExclusive
                  ? tr("admin.shell.assignCompanies.reassignLead")
                  : tr("admin.shell.assignCompanies.assignLeadHeading")}
              </span>
              <div className="ml-auto flex items-center gap-1 normal-case tracking-normal">
                <span className="text-muted-foreground">{tr("admin.shell.assignCompanies.sla")}</span>
                <Select value={String(slaHours)} onValueChange={(v) => setSlaHours(Number(v))}>
                  <SelectTrigger className="h-7 w-[80px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[6, 12, 24, 48].map((h) => (
                      <SelectItem key={h} value={String(h)} className="text-xs">
                        {tr("admin.shell.assignCompanies.hoursShort", { hours: h })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="mb-2 text-xs text-muted-foreground">
              {tr("admin.shell.assignCompanies.assignInstructions", { hours: slaHours })}
            </p>

            <div className="space-y-1.5">
              {available.map((c) => {
                const checked = selected.has(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:bg-muted/40"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(c.id)}
                      aria-label={tr("admin.shell.assignCompanies.selectCompany", { name: c.name })}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 font-medium">
                        <span className="truncate">{c.name}</span>
                        {c.approved === false && (
                          <span className="text-[10px] text-amber-700">
                            {tr("admin.shell.assignCompanies.unapproved")}
                          </span>
                        )}
                      </div>
                      {c.service_states && c.service_states.length > 0 && (
                        <div className="text-[11px] text-muted-foreground">
                          {tr("admin.shell.assignCompanies.serves", { states: c.service_states.join(", ") })}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {selected.size === 0
                  ? tr("admin.shell.assignCompanies.noCompaniesSelected")
                  : selected.size === 1
                    ? tr("admin.shell.assignCompanies.oneCompanyExclusive")
                    : tr("admin.shell.assignCompanies.multipleCompaniesOpenMarket", { count: selected.size })}
              </span>
              <Button
                size="sm"
                onClick={() => void assignSelected()}
                disabled={selected.size === 0 || busy === "assign"}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {busy === "assign"
                  ? tr("admin.shell.assignCompanies.assigning")
                  : tr("admin.shell.assignCompanies.assignLead")}
              </Button>
            </div>
          </div>
        )}

        {isOpenMarket && (
          <p className="mt-3 text-xs text-muted-foreground">
            {tr("admin.shell.assignCompanies.openMarketNotice")}
          </p>
        )}

        {companies.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {tr("admin.shell.assignCompanies.noCompaniesYet")}{" "}
            <a href="/admin/companies" className="text-primary hover:underline">
              {tr("admin.shell.assignCompanies.createOne")}
            </a>
          </p>
        )}
      </div>

      {/* History */}
      {historical.length > 0 && (
        <details className="rounded-xl border border-border bg-card/30 p-4 text-sm">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {tr("admin.shell.assignCompanies.historyCount", { count: historical.length })}
          </summary>
          <div className="mt-2 space-y-1.5">
            {historical.map((a) => {
              const c = companies.find((x) => x.id === a.company_id);
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium">{c?.name ?? "—"}</span>
                  <Badge variant="outline" className={`capitalize ${STATE_STYLES[a.state] ?? ""}`}>
                    {tr(`admin.shell.assignCompanies.state.${a.state}`)}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(a.closed_at ?? a.created_at).toLocaleString()}
                  </span>
                  {a.decline_reason && (
                    <span className="text-muted-foreground">· {a.decline_reason}</span>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
