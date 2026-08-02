import { useEffect, useMemo, useState } from "react";
import { Inbox, Search, MapPin, ArrowRight, Phone, Mail, Calendar } from "lucide-react";
import { BrokerShell } from "@/components/broker/BrokerShell";
import { PageHeader, StatCard, SkeletonRows } from "@/components/shell/Chrome";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { LeadDetailPanel } from "@/components/admin/LeadDetailPanel";
import { LeadStatusBadge } from "@/components/admin/LeadWorkflow";
import { useBrokers } from "@/components/admin/BrokerSelect";
import {
  ALL_LEAD_STATUSES,
  BROKER_QUEUES,
  BROKER_QUEUE_LABEL,
  type BrokerQueue,
  type LeadStatus,
} from "@/lib/lead-status";
import { toast } from "sonner";
import { useI18n, useStatusLabel } from "@/i18n";

type Lead = {
  [key: string]: unknown;
  id: string;
  quote_number: string | null;
  created_at: string;
  status: string;
  lead_phase: string;
  origin_city: string | null;
  origin_zip: string;
  destination_city: string | null;
  destination_zip: string;
  move_date: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  estimated_low: number;
  estimated_high: number;
};

const STATUSES = ["all", ...ALL_LEAD_STATUSES];
const MOVE_TYPES = ["all", "local", "long_distance", "interstate"];

export function BrokerLeadsWorkspace() {
  const { t } = useI18n();
  const statusLabel = useStatusLabel();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [queue, setQueue] = useState<BrokerQueue>("all");
  const [status, setStatus] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [moveType, setMoveType] = useState("all");
  const [brokerFilter, setBrokerFilter] = useState("all");
  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      setLeads((data ?? []) as Lead[]);
      setLoading(false);
    })();
  }, []);

  // Keep the pipeline in sync with the database (e.g. customer accepts in portal)
  useEffect(() => {
    const channel = supabase
      .channel("broker-quotes-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, (payload) => {
        const row = payload.new as Lead | null;
        if (payload.eventType === "DELETE") {
          const oldId = (payload.old as { id?: string })?.id;
          if (!oldId) return;
          setLeads((prev) => prev.filter((l) => l.id !== oldId));
          setSelected((prev) => (prev && prev.id === oldId ? null : prev));
          return;
        }
        if (!row?.id) return;
        setLeads((prev) => {
          const exists = prev.some((l) => l.id === row.id);
          if (!exists) return [row, ...prev];
          return prev.map((l) => (l.id === row.id ? { ...l, ...row } : l));
        });
        setSelected((prev) => (prev && prev.id === row.id ? { ...prev, ...row } : prev));
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const brokers = useBrokers();

  // Single source of truth: quotes.assigned_broker_id — same field the Admin CRM writes.
  const brokerLabel = (id: unknown) => {
    if (typeof id !== "string" || !id) return null;
    const b = brokers.find((x) => x.id === id);
    return b?.full_name || b?.email || id.slice(0, 8);
  };

  const stateOptions = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      [l.origin_state, l.destination_state].forEach((s) => {
        if (typeof s === "string" && s) set.add(s);
      });
    });
    return Array.from(set).sort();
  }, [leads]);

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      [l.origin_city, l.destination_city].forEach((c) => {
        if (typeof c === "string" && c) set.add(c);
      });
    });
    return Array.from(set).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      const ls = (l.lead_status as string) ?? "submitted";
      if (queue !== "all" && !BROKER_QUEUES[queue].includes(ls as LeadStatus)) return false;
      if (status !== "all" && ls !== status) return false;
      if (moveType !== "all" && (l.move_type as string) !== moveType) return false;
      if (brokerFilter !== "all") {
        const b = (l.assigned_broker_id as string | null) ?? "";
        if (brokerFilter === "unassigned" ? b !== "" : b !== brokerFilter) return false;
      }
      if (
        stateFilter !== "all" &&
        l.origin_state !== stateFilter &&
        l.destination_state !== stateFilter
      )
        return false;
      if (cityFilter !== "all" && l.origin_city !== cityFilter && l.destination_city !== cityFilter)
        return false;
      if (moveFrom && (!l.move_date || l.move_date < moveFrom)) return false;
      if (moveTo && (!l.move_date || l.move_date > moveTo)) return false;
      if (!needle) return true;
      return [
        l.quote_number,
        l.origin_city,
        l.destination_city,
        l.origin_zip,
        l.destination_zip,
        l.contact_email,
        l.contact_phone,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [leads, q, queue, status, moveType, brokerFilter, stateFilter, cityFilter, moveFrom, moveTo]);

  const stats = useMemo(() => {
    const by = (bucket: keyof typeof BROKER_QUEUES) =>
      leads.filter((l) =>
        BROKER_QUEUES[bucket].includes(((l.lead_status as string) ?? "submitted") as LeadStatus),
      ).length;
    return {
      total: leads.length,
      new: by("new"),
      review: by("under_review"),
      qualified: by("qualified"),
      rejected: by("rejected"),
    };
  }, [leads]);

  return (
    <BrokerShell>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 md:py-14">
        <PageHeader
          eyebrow="Broker workspace"
          title="Lead pipeline"
          subtitle="Every incoming moving lead you are responsible for."
          icon={<Inbox className="h-5 w-5" />}
        />

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="New leads" value={stats.new} tone="info" />
          <StatCard label="Under review" value={stats.review} />
          <StatCard label="Qualified" value={stats.qualified} tone="success" />
          <StatCard label="Rejected" value={stats.rejected} />
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {(["all", "new", "under_review", "qualified", "rejected"] as BrokerQueue[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setQueue(k)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                queue === k
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {BROKER_QUEUE_LABEL[k]}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by quote number, city, ZIP, email or phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? t("common.allStatuses") : statusLabel("lead", s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {stateOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {cityOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={moveType} onValueChange={setMoveType}>
            <SelectTrigger>
              <SelectValue placeholder="Move type" />
            </SelectTrigger>
            <SelectContent>
              {MOVE_TYPES.map((m) => (
                <SelectItem key={m} value={m} className="capitalize">
                  {m === "all" ? "All move types" : m.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={brokerFilter} onValueChange={setBrokerFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Broker" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brokers</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {brokers.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.full_name || b.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 sm:col-span-2">
            <span className="whitespace-nowrap text-xs text-muted-foreground">Move date</span>
            <Input type="date" value={moveFrom} onChange={(e) => setMoveFrom(e.target.value)} />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} />
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {loading ? (
            <SkeletonRows n={4} />
          ) : filtered.length === 0 ? (
            <div className="card-premium p-10 text-center text-sm text-muted-foreground">
              No leads match your filters.
            </div>
          ) : (
            filtered.map((l) => (
              <article
                key={l.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(l)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(l);
                  }
                }}
                className="card-premium p-5 cursor-pointer"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-foreground/80">
                        {l.quote_number ?? l.id.slice(0, 8)}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{new Date(l.created_at).toLocaleDateString()}</span>
                      <LeadStatusBadge status={l.lead_status as string} />
                      <Badge variant="outline" className="capitalize">
                        {brokerLabel(l.assigned_broker_id)
                          ? `Broker: ${brokerLabel(l.assigned_broker_id)}`
                          : "Broker: unassigned"}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        Market: {l.lead_phase.replace("_", " ")}
                      </Badge>

                    </div>
                    <div className="mt-1.5 flex items-center gap-2 font-serif text-lg font-medium">
                      <MapPin className="h-4 w-4 shrink-0 text-sage" />
                      <span className="truncate">
                        {l.origin_city ?? l.origin_zip}
                        <ArrowRight className="mx-2 inline h-4 w-4 text-muted-foreground" />
                        {l.destination_city ?? l.destination_zip}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {l.move_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> {l.move_date}
                        </span>
                      )}
                      {l.contact_phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {l.contact_phone}
                        </span>
                      )}
                      {l.contact_email && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{l.contact_email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-xl font-medium tabular-nums">
                      ${Number(l.estimated_low).toLocaleString()} – $
                      {Number(l.estimated_high).toLocaleString()}
                    </div>
                    <Badge variant="outline" className="mt-2 capitalize">
                      {l.status}
                    </Badge>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <LeadDetailPanel
          quote={selected as never}
          onClose={() => setSelected(null)}
          onStatusChange={async (id, next) => {
            const { error } = await supabase.from("quotes").update({ status: next }).eq("id", id);
            if (error) {
              toast.error(error.message);
              return;
            }
            setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: next } : l)));
            setSelected((prev) => (prev && prev.id === id ? { ...prev, status: next } : prev));
            toast.success("Status updated");
          }}
        />
      </section>
    </BrokerShell>
  );
}
