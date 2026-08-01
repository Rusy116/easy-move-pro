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

type Revision = EstimateRevision;

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
      .then(({ data }) => {
        setRows((data ?? []) as unknown as Revision[]);
        setBusy(false);
      });
  }, [company]);

  const stats = useMemo(() => {
    const total = rows.length;
    const accepted = rows.filter((r) => r.status === "accepted");
    const open = rows.filter((r) => r.status === "sent" || r.status === "viewed");
    const value = open.reduce((s, r) => s + Number(r.amount), 0);
    const won = accepted.reduce((s, r) => s + Number(r.final_accepted_price ?? r.amount), 0);
    const profit = accepted.reduce((s, r) => s + Number(r.gross_profit ?? 0), 0);
    const commission = accepted.reduce((s, r) => s + Number(r.broker_commission ?? 0), 0);
    return { total, accepted: accepted.length, open: open.length, value, won, profit, commission };
  }, [rows]);

  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Awaiting response", value: `${stats.open}` },
          { label: "Pipeline value", value: `$${stats.value.toLocaleString()}` },
          { label: "Accepted revenue", value: `$${stats.won.toLocaleString()}` },
          { label: "Gross profit", value: `$${stats.profit.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="card-premium p-4">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-1 font-serif text-2xl">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card-premium p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-xl">Estimates history</h2>
          <span className="ml-auto text-sm text-muted-foreground">
            {stats.total} revisions · {stats.accepted} accepted · $
            {stats.commission.toLocaleString()} broker commission
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
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {r.assignment_id.slice(0, 8)}
                </span>
                <span className="font-semibold">v{r.revision}</span>
                <Badge variant="outline" className={ESTIMATE_STATUS_STYLE[r.status]}>
                  {ESTIMATE_STATUS_LABEL[r.status]}
                </Badge>
                {r.is_current && (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-800 border-emerald-300"
                  >
                    Current
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground text-xs">
                {r.broker_estimate_low != null && (
                  <span className="mr-3">
                    Broker ${Number(r.broker_estimate_low).toLocaleString()}–$
                    {Number(r.broker_estimate_high ?? 0).toLocaleString()}
                  </span>
                )}
                {new Date(r.sent_at ?? r.submitted_at).toLocaleString()}
              </div>
              <div className="text-right">
                <div className="font-serif text-lg">${Number(r.amount).toLocaleString()}</div>
                {r.status === "accepted" && (
                  <div className="text-[11px] text-muted-foreground">
                    profit ${Number(r.gross_profit ?? 0).toLocaleString()} · commission $
                    {Number(r.broker_commission ?? 0).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
