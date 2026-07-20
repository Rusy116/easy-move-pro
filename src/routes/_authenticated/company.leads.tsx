import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CompanyHeader, EstimateBuilderDialog, LeadCard, LeadDetailDialog,
  NoCompanyScreen, StatusBanner, statusTabOf, useMoverPortal,
  type LeadStatusTab, type MergedLead,
} from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/leads")({
  head: () => ({ meta: [{ title: "My Leads — Company Portal" }] }),
  component: LeadsPage,
});

const TABS: Array<{ id: LeadStatusTab; label: string }> = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "estimate_sent", label: "Estimate sent" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
  { id: "completed", label: "Completed" },
];

function LeadsPage() {
  const { loading, company, merged, reload, canClaim } = useMoverPortal();
  const [tab, setTab] = useState<LeadStatusTab>("new");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<MergedLead | null>(null);
  const [estimateFor, setEstimateFor] = useState<MergedLead | null>(null);

  const claimed = useMemo(() => merged.filter((r) => !!r.assignment), [merged]);

  const filtered = useMemo(() => {
    const byTab = claimed.filter((r) => {
      const s = statusTabOf(r);
      if (tab === "won") return s === "won" || s === "completed";
      return s === tab;
    });
    if (!q.trim()) return byTab;
    const needle = q.toLowerCase();
    return byTab.filter((r) => {
      const l = r.lead;
      return (
        (l.quote_number ?? "").toLowerCase().includes(needle) ||
        (l.full_name ?? "").toLowerCase().includes(needle) ||
        (l.origin_city ?? "").toLowerCase().includes(needle) ||
        (l.destination_city ?? "").toLowerCase().includes(needle) ||
        (l.contact_phone ?? "").includes(needle) ||
        (l.contact_email ?? "").toLowerCase().includes(needle)
      );
    });
  }, [claimed, tab, q]);

  const counts = useMemo(() => {
    const c: Record<LeadStatusTab, number> = {
      new: 0, contacted: 0, estimate_sent: 0, won: 0, lost: 0, completed: 0,
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 border-b border-transparent">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {t.label} <span className="opacity-70">({counts[t.id]})</span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search leads…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              No leads in this bucket.
            </div>
          )}
          {filtered.map((r) => (
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
      </div>

      {selected && (
        <LeadDetailDialog
          merged={selected}
          onClose={() => setSelected(null)}
          onReload={reload}
          onEstimate={() => { setEstimateFor(selected); setSelected(null); }}
          canClaim={canClaim}
        />
      )}
      {estimateFor && company && (
        <EstimateBuilderDialog
          merged={estimateFor}
          companyId={company.id}
          onClose={() => setEstimateFor(null)}
          onSubmitted={() => { setEstimateFor(null); reload(); }}
        />
      )}
    </div>
  );
}
