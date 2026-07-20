import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyHeader, NoCompanyScreen, useMoverPortal } from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/estimates")({
  head: () => ({ meta: [{ title: "Estimates — Company Portal" }] }),
  component: EstimatesPage,
});

type Revision = {
  id: string;
  quote_id: string;
  assignment_id: string;
  revision: number;
  amount: number;
  currency: string;
  is_current: boolean;
  submitted_at: string;
  valid_until: string | null;
  notes: string | null;
};

function EstimatesPage() {
  const { loading, company, reload } = useMoverPortal();
  const [rows, setRows] = useState<Revision[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!company) return;
    void supabase
      .from("estimate_revisions")
      .select("*")
      .eq("company_id", company.id)
      .order("submitted_at", { ascending: false })
      .limit(200)
      .then(({ data }) => { setRows((data ?? []) as Revision[]); setBusy(false); });
  }, [company]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.is_current).length;
    const value = rows.filter((r) => r.is_current).reduce((s, r) => s + Number(r.amount), 0);
    return { total, active, value };
  }, [rows]);

  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />

      <div className="card-premium p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-xl">Estimates history</h2>
          <span className="ml-auto text-sm text-muted-foreground">
            {stats.total} total · {stats.active} current · ${stats.value.toLocaleString()} pipeline
          </span>
        </div>
        {busy && <SkeletonRows n={3} />}
        {!busy && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No estimates submitted yet.
          </div>
        )}
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{r.assignment_id.slice(0, 8)}</span>
                <span className="font-semibold">v{r.revision}</span>
                {r.is_current && <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300">Current</Badge>}
              </div>
              <div className="text-muted-foreground text-xs">{new Date(r.submitted_at).toLocaleString()}</div>
              <div className="font-serif text-lg">${Number(r.amount).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
