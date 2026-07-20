import { createFileRoute } from "@tanstack/react-router";
import { CompanyHeader, NoCompanyScreen, useMoverPortal } from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/schedule")({
  head: () => ({ meta: [{ title: "Schedule — Company Portal" }] }),
  component: SchedulePage,
});

function SchedulePage() {
  const { loading, company, reload } = useMoverPortal();
  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;
  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />
      <div className="card-premium p-10 text-center">
        <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-serif text-xl">Scheduling calendar</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Daily / weekly / monthly job scheduling with crew and truck assignments arrives in Phase 5B.
        </p>
      </div>
    </div>
  );
}
