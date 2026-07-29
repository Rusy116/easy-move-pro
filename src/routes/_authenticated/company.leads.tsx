import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CompanyHeader,
  EstimateBuilderDialog,
  LeadCard,
  LeadDetailDialog,
  NoCompanyScreen,
  StatusBanner,
  statusTabOf,
  useMoverPortal,
  type LeadStatusTab,
  type MergedLead,
} from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Filter } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/leads")({
  head: () => ({ meta: [{ title: "My Leads — Company Portal" }] }),
  component: LeadsPage,
});

const TABS: Array<{ id: LeadStatusTab; label: string }> = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "estimate_sent", label: "Estimate sent" },
  { id: "scheduled", label: "Scheduled" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
  { id: "completed", label: "Completed" },
];

type SortKey = "recent" | "move_date" | "value" | "sla";
type PhaseKey = "any" | "exclusive" | "open_market" | "closed";
type MoveKey = "any" | "local" | "long_distance" | "interstate";
const PAGE_SIZE = 10;

function LeadsPage() {
  const { loading, company, merged, reload, canClaim } = useMoverPortal();
  const [tab, setTab] = useState<LeadStatusTab>("new");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [phase, setPhase] = useState<PhaseKey>("any");
  const [move, setMove] = useState<MoveKey>("any");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<MergedLead | null>(null);
  const [estimateFor, setEstimateFor] = useState<MergedLead | null>(null);

  const claimed = useMemo(() => merged.filter((r) => !!r.assignment), [merged]);

  const filtered = useMemo(() => {
    let list = claimed.filter((r) => statusTabOf(r) === tab);
    if (phase !== "any") list = list.filter((r) => r.lead.lead_phase === phase);
    if (move !== "any") list = list.filter((r) => r.lead.move_type === move);
    if (q.trim()) {
      const n = q.toLowerCase();
      list = list.filter((r) => {
        const l = r.lead;
        return (
          (l.quote_number ?? "").toLowerCase().includes(n) ||
          (l.full_name ?? "").toLowerCase().includes(n) ||
          (l.origin_city ?? "").toLowerCase().includes(n) ||
          (l.destination_city ?? "").toLowerCase().includes(n) ||
          (l.contact_phone ?? "").includes(n) ||
          (l.contact_email ?? "").toLowerCase().includes(n)
        );
      });
    }
    const arr = [...list];
    arr.sort((a, b) => {
      if (sort === "value") {
        return (
          Number(b.assignment?.quoted_amount ?? b.lead.estimated_high) -
          Number(a.assignment?.quoted_amount ?? a.lead.estimated_high)
        );
      }
      if (sort === "move_date") {
        const av = a.lead.move_date ? new Date(a.lead.move_date).getTime() : Infinity;
        const bv = b.lead.move_date ? new Date(b.lead.move_date).getTime() : Infinity;
        return av - bv;
      }
      if (sort === "sla") {
        const av = a.lead.exclusive_expires_at
          ? new Date(a.lead.exclusive_expires_at).getTime()
          : Infinity;
        const bv = b.lead.exclusive_expires_at
          ? new Date(b.lead.exclusive_expires_at).getTime()
          : Infinity;
        return av - bv;
      }
      return new Date(b.lead.created_at).getTime() - new Date(a.lead.created_at).getTime();
    });
    return arr;
  }, [claimed, tab, q, phase, move, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const counts = useMemo(() => {
    const c: Record<LeadStatusTab, number> = {
      new: 0,
      contacted: 0,
      estimate_sent: 0,
      scheduled: 0,
      won: 0,
      lost: 0,
      completed: 0,
    };
    for (const r of claimed) {
      const s = statusTabOf(r);
      if (s) c[s]++;
    }
    return c;
  }, [claimed]);

  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />
      <StatusBanner company={company} />

      <div className="card-premium p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setPage(0);
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {t.label} <span className="opacity-70">({counts[t.id]})</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, city, phone, email, ID…"
              className="pl-9"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Filter
            </div>
            <Select
              value={phase}
              onValueChange={(v) => {
                setPhase(v as PhaseKey);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any phase</SelectItem>
                <SelectItem value="exclusive">Exclusive</SelectItem>
                <SelectItem value="open_market">Open market</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={move}
              onValueChange={(v) => {
                setMove(v as MoveKey);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Move type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any type</SelectItem>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="long_distance">Long distance</SelectItem>
                <SelectItem value="interstate">Interstate</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="move_date">Move date</SelectItem>
                <SelectItem value="value">Highest value</SelectItem>
                <SelectItem value="sla">SLA (soonest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          {rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              No leads match these filters.
            </div>
          )}
          {rows.map((r) => (
            <LeadCard
              key={r.lead.id}
              merged={r}
              canClaim={canClaim}
              onOpen={() => setSelected(r)}
              onEstimate={() => setEstimateFor(r)}
              onClaimed={reload}
            />
          ))}
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground">
              Showing {currentPage * PAGE_SIZE + 1}–
              {Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={currentPage >= pageCount - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <LeadDetailDialog
          merged={selected}
          onClose={() => setSelected(null)}
          onReload={reload}
          onEstimate={() => {
            setEstimateFor(selected);
            setSelected(null);
          }}
          canClaim={canClaim}
        />
      )}
      {estimateFor && company && (
        <EstimateBuilderDialog
          merged={estimateFor}
          companyId={company.id}
          onClose={() => setEstimateFor(null)}
          onSubmitted={() => {
            setEstimateFor(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
