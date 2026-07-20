import { createFileRoute } from "@tanstack/react-router";
import { CompanyHeader, NoCompanyScreen, useMoverPortal } from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/customers")({
  head: () => ({ meta: [{ title: "Customers — Company Portal" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const { loading, company, reload } = useMoverPortal();
  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;
  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />
      <div className="card-premium p-10 text-center">
        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-serif text-xl">Customer database</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Search, history, previous moves and lifetime value arrive in Phase 5B.
        </p>
      </div>
    </div>
  );
}
