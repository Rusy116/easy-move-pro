import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CompanyHeader, LeadCard, LeadDetailDialog,
  NoCompanyScreen, StatusBanner, useMoverPortal, type MergedLead,
} from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Globe } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/marketplace")({
  head: () => ({ meta: [{ title: "Open Marketplace — Company Portal" }] }),
  component: MarketplacePage,
});

function MarketplacePage() {
  const { loading, company, merged, reload, canClaim } = useMoverPortal();
  const [selected, setSelected] = useState<MergedLead | null>(null);
  const rows = useMemo(() => merged.filter((r) => r.bucket === "open_market" && !r.assignment), [merged]);

  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />
      <StatusBanner company={company} />

      <div className="card-premium p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-xl">Open marketplace</h2>
          <span className="text-sm text-muted-foreground">({rows.length})</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          These leads are open to all approved partners. Claim to unlock customer contact details and submit an estimate.
        </p>
        <div className="space-y-3">
          {rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              No open marketplace leads available.
            </div>
          )}
          {rows.map((r) => (
            <LeadCard
              key={r.lead.id}
              merged={r}
              canClaim={canClaim}
              onOpen={() => setSelected(r)}
              onEstimate={() => {}}
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
          onEstimate={() => {}}
          canClaim={canClaim}
        />
      )}
    </div>
  );
}
