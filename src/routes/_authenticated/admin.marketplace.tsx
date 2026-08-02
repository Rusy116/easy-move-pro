import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Globe,
  RefreshCw,
  Timer,
  Eye,
  BellRing,
  Building2,
  ChevronDown,
  ChevronRight,
  Clock,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeader, SkeletonRows } from "@/components/shell/Chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace monitor — Easy Moving admin" },
      {
        name: "description",
        content:
          "Monitor every published moving lead: exclusive countdowns, notified companies, claims, workflow stage, revenue and platform commission.",
      },
    ],
  }),
  component: AdminMarketplacePage,
});

type QuoteRow = {
  id: string;
  quote_number: string | null;
  lead_phase: string;
  lead_status: string;
  job_status: string;
  status: string;
  published_at: string | null;
  open_market_opened_at: string | null;
  assigned_at: string | null;
  assigned_broker_id: string | null;
  assigned_company_id: string | null;
  exclusive_expires_at: string | null;
  exclusive_started_at: string | null;
  claimed_at: string | null;
  estimated_low: number | null;
  estimated_high: number | null;
  final_price: number | null;
  final_accepted_price: number | null;
  origin_city: string | null;
  origin_state: string | null;
  destination_city: string | null;
  destination_state: string | null;
  move_date: string | null;
  last_activity_at: string;
  created_at: string;
};

type Assignment = {
  id: string;
  quote_id: string;
  company_id: string;
  is_exclusive: boolean;
  state: string;
  status: string;
  invited_at: string;
  viewed_at: string | null;
  accepted_at: string | null;
  sla_due_at: string | null;
};

type Distribution = {
  id: string;
  quote_id: string;
  company_id: string;
  notified_at: string;
  viewed_at: string | null;
  revoked_at: string | null;
};

type LeadEvent = {
  id: string;
  quote_id: string;
  event_type: string;
  actor_role: string | null;
  actor_email: string | null;
  company_id: string | null;
  created_at: string;
};

type Commission = { quote_id: string; amount: number; base_price: number; status: string };

const money = (n: number | null | undefined) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";

const dt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";

const STAGE_TONE: Record<string, string> = {
  exclusive: "border-amber-300 bg-amber-50 text-amber-800",
  open_market: "border-sky-300 bg-sky-50 text-sky-800",
  claimed: "border-indigo-300 bg-indigo-50 text-indigo-800",
  closed: "border-emerald-300 bg-emerald-50 text-emerald-800",
};

function stageOf(q: QuoteRow, exclusive?: Assignment, claimedBy?: Assignment) {
  if (claimedBy || q.claimed_at || q.assigned_company_id) return "claimed";
  if (q.lead_phase === "closed" || q.status === "cancelled") return "closed";
  if (exclusive && q.exclusive_expires_at && new Date(q.exclusive_expires_at) > new Date())
    return "exclusive";
  if (q.open_market_opened_at) return "open_market";
  return q.lead_phase ?? "open_market";
}

function useTicker() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);
}

function Countdown({ until }: { until: string | null }) {
  if (!until) return <span className="text-muted-foreground">—</span>;
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return <span className="font-medium text-muted-foreground">Expired</span>;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const urgent = ms < 60 * 60 * 1000;
  return (
    <span
      className={`font-mono text-sm font-semibold tabular-nums ${urgent ? "text-destructive" : "text-foreground"}`}
    >
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

function AdminMarketplacePage() {
  useTicker();
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [brokers, setBrokers] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: q, error } = await supabase
        .from("quotes")
        .select(
          "id,quote_number,lead_phase,lead_status,job_status,status,published_at,open_market_opened_at,assigned_at,assigned_broker_id,assigned_company_id,exclusive_expires_at,exclusive_started_at,claimed_at,estimated_low,estimated_high,final_price,final_accepted_price,origin_city,origin_state,destination_city,destination_state,move_date,last_activity_at,created_at",
        )
        .order("last_activity_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      const rows = (q ?? []) as unknown as QuoteRow[];
      const ids = rows.map((r) => r.id);
      setQuotes(rows);

      if (ids.length === 0) {
        setAssignments([]);
        setDistributions([]);
        setEvents([]);
        setCommissions([]);
        return;
      }

      const [a, d, e, c, mc, pf] = await Promise.all([
        supabase
          .from("quote_assignments")
          .select(
            "id,quote_id,company_id,is_exclusive,state,status,invited_at,viewed_at,accepted_at,sla_due_at",
          )
          .in("quote_id", ids),
        supabase
          .from("lead_distributions")
          .select("id,quote_id,company_id,notified_at,viewed_at,revoked_at")
          .in("quote_id", ids),
        supabase
          .from("lead_events")
          .select("id,quote_id,event_type,actor_role,actor_email,company_id,created_at")
          .in("quote_id", ids)
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("company_commissions")
          .select("quote_id,amount,base_price,status")
          .in("quote_id", ids),
        supabase.from("moving_companies").select("id,name"),
        supabase.from("profiles").select("id,full_name"),
      ]);

      setAssignments((a.data ?? []) as unknown as Assignment[]);
      setDistributions((d.data ?? []) as unknown as Distribution[]);
      setEvents((e.data ?? []) as unknown as LeadEvent[]);
      setCommissions((c.data ?? []) as unknown as Commission[]);
      setCompanies(
        Object.fromEntries(((mc.data ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name])),
      );
      setBrokers(
        Object.fromEntries(
          ((pf.data ?? []) as { id: string; full_name: string | null }[]).map((r) => [
            r.id,
            r.full_name ?? "Broker",
          ]),
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load marketplace data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    return quotes
      .filter(
        (q) =>
          q.published_at ||
          q.assigned_at ||
          q.open_market_opened_at ||
          assignments.some((a) => a.quote_id === q.id) ||
          distributions.some((d) => d.quote_id === q.id),
      )
      .map((q) => {
        const qa = assignments.filter((a) => a.quote_id === q.id);
        const exclusive = qa.find((a) => a.is_exclusive && !["withdrawn", "declined"].includes(a.status));
        const claimed =
          qa.find((a) => ["accepted", "won", "claimed"].includes(a.state) || a.accepted_at) ?? undefined;
        const dist = distributions.filter((d) => d.quote_id === q.id && !d.revoked_at);
        const viewed = new Set([
          ...dist.filter((d) => d.viewed_at).map((d) => d.company_id),
          ...qa.filter((a) => a.viewed_at).map((a) => a.company_id),
        ]);
        const notified = new Set([...dist.map((d) => d.company_id), ...qa.map((a) => a.company_id)]);
        const comm = commissions.find((c) => c.quote_id === q.id);
        const revenue = q.final_accepted_price ?? q.final_price ?? q.estimated_high ?? 0;
        return {
          q,
          exclusive,
          claimed,
          notified: [...notified],
          viewed: [...viewed],
          stage: stageOf(q, exclusive, claimed),
          revenue,
          commission: comm?.amount ?? Math.round(revenue * 0.25),
          commissionStatus: comm?.status ?? "projected",
          timeline: events.filter((ev) => ev.quote_id === q.id).slice(0, 12),
        };
      })
      .filter((r) => (stage === "all" ? true : r.stage === stage))
      .filter((r) => {
        const s = search.trim().toLowerCase();
        if (!s) return true;
        return (
          (r.q.quote_number ?? "").toLowerCase().includes(s) ||
          r.q.id.toLowerCase().includes(s) ||
          `${r.q.origin_city ?? ""} ${r.q.destination_city ?? ""}`.toLowerCase().includes(s) ||
          r.notified.some((id) => (companies[id] ?? "").toLowerCase().includes(s))
        );
      });
  }, [quotes, assignments, distributions, events, commissions, stage, search, companies]);

  const totals = useMemo(
    () => ({
      live: rows.filter((r) => r.stage === "exclusive" || r.stage === "open_market").length,
      exclusive: rows.filter((r) => r.stage === "exclusive").length,
      claimed: rows.filter((r) => r.stage === "claimed").length,
      commission: rows.reduce((s, r) => s + (r.commission || 0), 0),
    }),
    [rows],
  );

  return (
    <AdminShell>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8 md:py-12">
        <PageHeader
          eyebrow="Lead distribution"
          title="Marketplace monitor"
          subtitle="Every published lead, who was notified, who viewed it, who claimed it — and what it earns."
          icon={<Globe className="h-5 w-5" />}
          actions={
            <Button variant="outline" size="sm" className="rounded-full" onClick={load}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
            </Button>
          }
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Live in market", value: totals.live },
            { label: "Exclusive window", value: totals.exclusive },
            { label: "Claimed", value: totals.claimed },
            { label: "Commission tracked", value: money(totals.commission) },
          ].map((s) => (
            <div key={s.label} className="card-premium p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {s.label}
              </div>
              <div className="mt-1 font-serif text-2xl">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search lead ID, city or company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 max-w-xs rounded-full"
          />
          {["all", "exclusive", "open_market", "claimed", "closed"].map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                stage === s
                  ? "border-foreground/20 bg-foreground/5 text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <SkeletonRows n={4} />
          ) : rows.length === 0 ? (
            <div className="card-premium p-12 text-center text-sm text-muted-foreground">
              No leads have been published to the marketplace yet.
            </div>
          ) : (
            rows.map((r) => {
              const open = openId === r.q.id;
              return (
                <article key={r.q.id} className="card-premium overflow-hidden">
                  <button
                    className="flex w-full flex-wrap items-start gap-4 p-4 text-left md:p-5"
                    onClick={() => setOpenId(open ? null : r.q.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {open ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-mono text-sm font-semibold">
                          {r.q.quote_number ?? r.q.id.slice(0, 8).toUpperCase()}
                        </span>
                        <Badge
                          variant="outline"
                          className={STAGE_TONE[r.stage] ?? "border-border"}
                        >
                          {r.stage.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {(r.q.lead_status ?? r.q.status ?? "new").replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="mt-1.5 truncate text-sm text-muted-foreground">
                        {r.q.origin_city ?? "—"}, {r.q.origin_state ?? ""} →{" "}
                        {r.q.destination_city ?? "—"}, {r.q.destination_state ?? ""}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Broker:{" "}
                        <span className="text-foreground">
                          {r.q.assigned_broker_id
                            ? (brokers[r.q.assigned_broker_id] ?? "Assigned")
                            : "Unassigned"}
                        </span>{" "}
                        · Published {dt(r.q.published_at ?? r.q.assigned_at ?? r.q.created_at)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                      <div>
                        <div className="text-muted-foreground">Exclusive to</div>
                        <div className="font-medium">
                          {r.exclusive ? (companies[r.exclusive.company_id] ?? "Company") : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Opens to market in</div>
                        <Countdown until={r.q.exclusive_expires_at} />
                      </div>
                      <div>
                        <div className="text-muted-foreground">Claimed by</div>
                        <div className="font-medium">
                          {r.claimed
                            ? (companies[r.claimed.company_id] ?? "Company")
                            : r.q.assigned_company_id
                              ? (companies[r.q.assigned_company_id] ?? "Company")
                              : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Revenue / commission</div>
                        <div className="font-medium">
                          {money(r.revenue)} · {money(r.commission)}
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-wrap gap-3 text-xs text-muted-foreground sm:w-auto">
                      <span className="inline-flex items-center gap-1">
                        <BellRing className="h-3.5 w-3.5" /> {r.notified.length} notified
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> {r.viewed.length} viewed
                      </span>
                    </div>
                  </button>

                  {open && (
                    <div className="grid gap-6 border-t border-border bg-muted/30 p-4 md:grid-cols-2 md:p-5">
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                          <Building2 className="h-4 w-4" /> Distribution
                        </h3>
                        <ul className="mt-3 space-y-2 text-sm">
                          {r.notified.length === 0 && (
                            <li className="text-muted-foreground">No companies notified yet.</li>
                          )}
                          {r.notified.map((cid) => {
                            const a = assignments.find(
                              (x) => x.quote_id === r.q.id && x.company_id === cid,
                            );
                            const d = distributions.find(
                              (x) => x.quote_id === r.q.id && x.company_id === cid,
                            );
                            const isViewed = r.viewed.includes(cid);
                            return (
                              <li
                                key={cid}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
                              >
                                <span className="font-medium">{companies[cid] ?? "Company"}</span>
                                <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {a?.is_exclusive && (
                                    <Badge variant="outline" className={STAGE_TONE.exclusive}>
                                      Exclusive
                                    </Badge>
                                  )}
                                  <span>Notified {dt(a?.invited_at ?? d?.notified_at ?? null)}</span>
                                  <Badge variant="outline">
                                    {isViewed ? "Viewed" : "Not viewed"}
                                  </Badge>
                                  {(a?.accepted_at || r.claimed?.company_id === cid) && (
                                    <Badge variant="outline" className={STAGE_TONE.claimed}>
                                      Claimed
                                    </Badge>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>

                        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <dt className="text-muted-foreground">Exclusive started</dt>
                            <dd>{dt(r.q.exclusive_started_at)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Open market since</dt>
                            <dd>{dt(r.q.open_market_opened_at)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Workflow stage</dt>
                            <dd className="capitalize">
                              {(r.q.job_status ?? r.stage).replace(/_/g, " ")}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Commission status</dt>
                            <dd className="capitalize">{r.commissionStatus}</dd>
                          </div>
                        </dl>
                      </div>

                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                          <Clock className="h-4 w-4" /> Activity timeline
                        </h3>
                        <ol className="mt-3 space-y-3 border-l border-border pl-4 text-sm">
                          {r.timeline.length === 0 && (
                            <li className="text-muted-foreground">No recorded events yet.</li>
                          )}
                          {r.timeline.map((ev) => (
                            <li key={ev.id} className="relative">
                              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                              <div className="font-medium capitalize">
                                {ev.event_type.replace(/_/g, " ")}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {dt(ev.created_at)}
                                {ev.company_id ? ` · ${companies[ev.company_id] ?? "Company"}` : ""}
                                {ev.actor_email ? ` · ${ev.actor_email}` : ""}
                              </div>
                            </li>
                          ))}
                        </ol>
                        <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <Timer className="h-3.5 w-3.5" />
                          Last activity {dt(r.q.last_activity_at)}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    </AdminShell>
  );
}
