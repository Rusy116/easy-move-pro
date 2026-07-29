import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/shell/Chrome";
import { EmptyState, Fact } from "@/components/company/JobsUI";
import { useExpiredClaims, useMyCompany, formatDate, place } from "@/lib/company-jobs";
import { Calendar, Clock, Globe, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/expired")({
  head: () => ({
    meta: [
      { title: "Expired Claims — Easy Moving Company Portal" },
      {
        name: "description",
        content: "Claims that passed the 12-hour exclusive window and returned to the marketplace.",
      },
    ],
  }),
  component: ExpiredClaimsPage,
});

function ExpiredClaimsPage() {
  const { company, loading: loadingCompany } = useMyCompany();
  const { rows, loading } = useExpiredClaims(company?.id ?? null);

  if (loadingCompany || (loading && !rows.length)) return <SkeletonRows n={3} />;
  if (!company) {
    return (
      <EmptyState
        title="No company linked"
        body="Your account is not linked to a moving company yet."
      />
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Expired claims</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These leads returned to the marketplace because the 12-hour exclusive window closed
          without progress.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="No expired claims"
          body="Respond to claimed jobs within 12 hours and they will never show up here."
        />
      ) : (
        <div className="grid gap-4">
          {rows.map((r) => (
            <article
              key={`${r.quote_id}-${r.expires_at}`}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Lead ID
                  </div>
                  <h3 className="mt-0.5 truncate font-mono text-lg font-semibold">
                    {r.quote_number ?? r.quote_id.slice(0, 8)}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                  <Clock className="h-3 w-3" /> Claim expired
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Fact
                  icon={<MapPin className="h-3 w-3" />}
                  label="Origin"
                  value={place(r.origin_city, r.origin_state)}
                />
                <Fact
                  icon={<MapPin className="h-3 w-3" />}
                  label="Destination"
                  value={place(r.destination_city, r.destination_state)}
                />
                <Fact
                  icon={<Calendar className="h-3 w-3" />}
                  label="Move date"
                  value={formatDate(r.move_date)}
                />
                <Fact
                  icon={<Clock className="h-3 w-3" />}
                  label="Expired"
                  value={formatDate(r.expires_at)}
                />
              </div>

              {r.job_status === "open_market" && (
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link to="/company/jobs">
                    <Globe className="mr-2 h-4 w-4" />
                    Available again — claim from marketplace
                  </Link>
                </Button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
