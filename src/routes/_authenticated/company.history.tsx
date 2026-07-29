import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, History, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SkeletonRows } from "@/components/shell/Chrome";
import { EmptyState, JobStatusBadge } from "@/components/company/JobsUI";
import {
  formatDate,
  money,
  place,
  timeAgo,
  useCompanyJobs,
  useMyCompany,
  type MyJob,
} from "@/lib/company-jobs";
import { useCompanyPriceRevisions } from "@/lib/company-crm";

export const Route = createFileRoute("/_authenticated/company/history")({
  head: () => ({
    meta: [
      { title: "Job History — Easy Moving Company Portal" },
      {
        name: "description",
        content:
          "Claimed leads, active jobs, completed and cancelled moves, plus your full price revision history.",
      },
    ],
  }),
  component: CompanyHistoryPage,
});

const ACTIVE = ["claimed", "contacted", "final_quote_sent", "accepted", "booked"];

function CompanyHistoryPage() {
  const { company, loading: loadingCompany } = useMyCompany();
  const { myJobs, loading } = useCompanyJobs(company?.id ?? null);
  const { rows: revisions } = useCompanyPriceRevisions(company?.id ?? null);

  const [q, setQ] = useState("");
  const [state, setState] = useState("all");
  const [city, setCity] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "move_date">("newest");

  const states = useMemo(
    () =>
      Array.from(
        new Set(myJobs.flatMap((j) => [j.origin_state, j.destination_state]).filter(Boolean)),
      ).sort() as string[],
    [myJobs],
  );
  const cities = useMemo(
    () =>
      Array.from(
        new Set(myJobs.flatMap((j) => [j.origin_city, j.destination_city]).filter(Boolean)),
      ).sort() as string[],
    [myJobs],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = myJobs.filter((j) => {
      if (statusFilter !== "all" && j.job_status !== statusFilter) return false;
      if (state !== "all" && j.origin_state !== state && j.destination_state !== state)
        return false;
      if (city !== "all" && j.origin_city !== city && j.destination_city !== city) return false;
      if (dateFrom && (!j.move_date || j.move_date < dateFrom)) return false;
      if (needle) {
        const hay = [
          j.quote_number,
          j.contact_email,
          j.contact_phone,
          j.origin_city,
          j.destination_city,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const t = (v?: string | null) => (v ? new Date(v).getTime() : 0);
    return rows.sort((a, b) => {
      if (sort === "oldest") return t(a.created_at) - t(b.created_at);
      if (sort === "move_date") return (a.move_date ?? "9999").localeCompare(b.move_date ?? "9999");
      return t(b.created_at) - t(a.created_at);
    });
  }, [myJobs, q, state, city, statusFilter, dateFrom, sort]);

  const buckets = useMemo(
    () => ({
      claimed: filtered.filter((j) => j.job_status === "claimed"),
      active: filtered.filter((j) => ACTIVE.includes(j.job_status ?? "")),
      completed: filtered.filter((j) => j.job_status === "completed"),
      cancelled: filtered.filter((j) =>
        ["cancelled", "rejected", "expired"].includes(j.job_status ?? ""),
      ),
    }),
    [filtered],
  );

  if (loadingCompany || (loading && !myJobs.length)) return <SkeletonRows n={4} />;
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
        <h1 className="text-2xl font-semibold tracking-tight">Job history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every lead your company has claimed, from first contact through completion.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search customer, lead ID, city"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Array.from(new Set(myJobs.map((j) => j.job_status).filter(Boolean))).map((s) => (
              <SelectItem key={s as string} value={s as string} className="capitalize">
                {(s as string).replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={state} onValueChange={setState}>
          <SelectTrigger>
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            {states.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger>
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          aria-label="Move date from"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="move_date">Soonest move date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="claimed">
        <TabsList className="flex w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="claimed">Claimed ({buckets.claimed.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({buckets.active.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({buckets.completed.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({buckets.cancelled.length})</TabsTrigger>
          <TabsTrigger value="revisions">Price revisions ({revisions.length})</TabsTrigger>
        </TabsList>

        {(["claimed", "active", "completed", "cancelled"] as const).map((key) => (
          <TabsContent key={key} value={key} className="mt-4">
            <JobTable rows={buckets[key]} />
          </TabsContent>
        ))}

        <TabsContent value="revisions" className="mt-4">
          {revisions.length === 0 ? (
            <EmptyState
              title="No price revisions"
              body="Revisions you file on confirmed jobs appear here with full history."
            />
          ) : (
            <ol className="space-y-3">
              {revisions.map((r) => (
                <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <History className="h-4 w-4" /> Revision #{r.revision} ·{" "}
                      {money(r.previous_price)} → {money(r.new_price)}
                    </span>
                    <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                  </div>
                  {r.reason && <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>}
                  <Link
                    to="/company/job/$jobId"
                    params={{ jobId: r.quote_id }}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline"
                  >
                    Open job <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function JobTable({ rows }: { rows: MyJob[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing here yet"
        body="Jobs matching these filters will appear in this tab."
      />
    );
  }
  return (
    <div className="grid gap-3">
      {rows.map((j) => (
        <Link
          key={j.id}
          to="/company/job/$jobId"
          params={{ jobId: j.id }}
          className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-mono text-xs text-muted-foreground">
                {j.quote_number ?? j.id.slice(0, 8)}
              </div>
              <div className="mt-0.5 truncate font-medium">
                {place(j.origin_city, j.origin_state)} →{" "}
                {place(j.destination_city, j.destination_state)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Move {formatDate(j.move_date)} · Claimed {timeAgo(j.claimed_at)}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <JobStatusBadge status={j.job_status} />
              <span className="text-sm font-semibold tabular-nums">{money(j.final_price)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
