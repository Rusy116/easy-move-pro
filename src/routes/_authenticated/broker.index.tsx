import { createFileRoute } from "@tanstack/react-router";
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
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/broker/")({
  head: () => ({ meta: [{ title: "Broker leads — Easy Move Pro" }] }),
  component: BrokerLeadsPage,
});

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

const STATUSES = ["all", "new", "contacted", "scheduled", "won", "lost", "cancelled"];

function BrokerLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
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
  }, [leads, q, status]);

  const stats = useMemo(() => {
    const open = leads.filter((l) => !["won", "lost", "cancelled"].includes(l.status)).length;
    const won = leads.filter((l) => l.status === "won").length;
    const unassigned = leads.filter((l) => l.lead_phase === "unassigned").length;
    return { total: leads.length, open, won, unassigned };
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
          <StatCard label="Leads" value={stats.total} />
          <StatCard label="Open" value={stats.open} tone="info" />
          <StatCard label="Unassigned" value={stats.unassigned} />
          <StatCard label="Won" value={stats.won} tone="success" />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
                <SelectItem key={s} value={s} className="capitalize">
                  {s === "all" ? "All statuses" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                      <Badge variant="outline" className="capitalize">
                        {l.lead_phase.replace("_", " ")}
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
