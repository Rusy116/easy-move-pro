import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CompanyHeader, EstimateBuilderDialog, LeadCard, LeadDetailDialog,
  NoCompanyScreen, StatusBanner, useMoverPortal, type MergedLead,
} from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/exclusive")({
  head: () => ({ meta: [{ title: "Exclusive Leads — Company Portal" }] }),
  component: ExclusivePage,
});

function ExclusivePage() {
  const { loading, company, merged, reload, canClaim } = useMoverPortal();
  const [selected, setSelected] = useState<MergedLead | null>(null);
  const [estimateFor, setEstimateFor] = useState<MergedLead | null>(null);
  const rows = useMemo(() => merged.filter((r) => r.bucket === "exclusive"), [merged]);

  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />
      <StatusBanner company={company} />

      <div className="card-premium p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-xl">Your exclusive leads</h2>
          <span className="text-sm text-muted-foreground">({rows.length})</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          You have a limited window to contact these customers. If the SLA expires, the lead moves to the open marketplace.
        </p>
        <div className="space-y-3">
          {rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              No exclusive leads right now.
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
      {estimateFor && (
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
