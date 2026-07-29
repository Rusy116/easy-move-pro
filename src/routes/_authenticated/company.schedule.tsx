import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CompanyHeader,
  LeadDetailDialog,
  NoCompanyScreen,
  useMoverPortal,
  type MergedLead,
} from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Truck,
  Users as UsersIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/schedule")({
  head: () => ({ meta: [{ title: "Schedule — Company Portal" }] }),
  component: SchedulePage,
});

type View = "day" | "week" | "month";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}
function fmtDay(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function fmtMonth(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function SchedulePage() {
  const { loading, company, merged, reload, canClaim } = useMoverPortal();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState<Date>(startOfDay(new Date()));
  const [selected, setSelected] = useState<MergedLead | null>(null);

  const jobs = useMemo(() => {
    return merged
      .filter(
        (r) =>
          r.assignment &&
          r.lead.move_date &&
          ["accepted", "won", "quoted"].includes(r.assignment.state),
      )
      .map((r) => ({ row: r, when: startOfDay(new Date(r.lead.move_date!)) }))
      .sort((a, b) => a.when.getTime() - b.when.getTime());
  }, [merged]);

  const window = useMemo(() => {
    if (view === "day") return { start: cursor, end: cursor };
    if (view === "week") {
      const dow = cursor.getDay();
      const start = addDays(cursor, -dow);
      return { start, end: addDays(start, 6) };
    }
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    return { start, end };
  }, [view, cursor]);

  const visible = useMemo(() => {
    return jobs.filter((j) => j.when >= window.start && j.when <= window.end);
  }, [jobs, window]);

  function shift(delta: number) {
    if (view === "day") setCursor((d) => addDays(d, delta));
    else if (view === "week") setCursor((d) => addDays(d, delta * 7));
    else setCursor((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;

  const label =
    view === "day"
      ? fmtDay(cursor)
      : view === "week"
        ? `${fmtDay(window.start)} – ${fmtDay(window.end)}`
        : fmtMonth(cursor);

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />

      <div className="card-premium p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-xl">Schedule</h2>
            <span className="text-sm text-muted-foreground">({visible.length} jobs)</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setCursor(startOfDay(new Date()))}>
              Today
            </Button>
            <Button size="sm" variant="outline" onClick={() => shift(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">{label}</span>
            <Button size="sm" variant="outline" onClick={() => shift(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="ml-2 flex rounded-full border border-border overflow-hidden">
              {(["day", "week", "month"] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize ${view === v ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === "month" ? (
          <MonthGrid cursor={cursor} jobs={jobs} onOpen={setSelected} />
        ) : (
          <DayList start={window.start} end={window.end} jobs={visible} onOpen={setSelected} />
        )}
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

function JobCard({ row, onOpen }: { row: MergedLead; onOpen: () => void }) {
  const l = row.lead;
  const a = row.assignment!;
  const status =
    a.state === "accepted" ? "Booked" : a.state === "won" ? "Completed" : "Estimate pending";
  const color =
    a.state === "accepted"
      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
      : a.state === "won"
        ? "bg-sky-50 text-sky-800 border-sky-300"
        : "bg-amber-50 text-amber-800 border-amber-300";
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{l.full_name ?? "Customer"}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {l.quote_number ?? l.id.slice(0, 8)}
            </span>
            <Badge variant="outline" className={color}>
              {status}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {l.origin_city ?? l.origin_zip} → {l.destination_city ?? l.destination_zip}
            </span>
            <span className="flex items-center gap-1">
              <Truck className="h-3 w-3" />
              {l.truck_size ?? "—"}
            </span>
            <span className="flex items-center gap-1">
              <UsersIcon className="h-3 w-3" />
              {l.num_movers ?? "?"} crew
            </span>
            {l.preferred_time && <span>· {l.preferred_time}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="font-serif text-lg">
            ${Number(a.quoted_amount ?? l.estimated_high).toLocaleString()}
          </div>
        </div>
      </div>
    </button>
  );
}

function DayList({
  start,
  end,
  jobs,
  onOpen,
}: {
  start: Date;
  end: Date;
  jobs: Array<{ row: MergedLead; when: Date }>;
  onOpen: (r: MergedLead) => void;
}) {
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(new Date(d));

  return (
    <div className="space-y-4">
      {days.map((d) => {
        const dayJobs = jobs.filter((j) => sameDay(j.when, d));
        return (
          <div key={d.toISOString()}>
            <div className="mb-2 flex items-center gap-2">
              <div
                className={`text-sm font-semibold ${sameDay(d, new Date()) ? "text-primary" : ""}`}
              >
                {fmtDay(d)}
              </div>
              <div className="text-xs text-muted-foreground">
                {dayJobs.length} job{dayJobs.length === 1 ? "" : "s"}
              </div>
            </div>
            {dayJobs.length === 0 ? (
              <div className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">
                No jobs
              </div>
            ) : (
              <div className="space-y-2">
                {dayJobs.map((j) => (
                  <JobCard key={j.row.lead.id} row={j.row} onOpen={() => onOpen(j.row)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({
  cursor,
  jobs,
  onOpen,
}: {
  cursor: Date;
  jobs: Array<{ row: MergedLead; when: Date }>;
  onOpen: (r: MergedLead) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
  const today = new Date();

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-muted-foreground mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const dayJobs = jobs.filter((j) => sameDay(j.when, d));
          return (
            <div
              key={d.toISOString()}
              className={`min-h-[92px] rounded-lg border p-1.5 text-xs ${inMonth ? "border-border bg-card" : "border-transparent bg-muted/30"} ${sameDay(d, today) ? "ring-2 ring-primary/40" : ""}`}
            >
              <div
                className={`text-[11px] font-semibold ${inMonth ? "" : "text-muted-foreground"}`}
              >
                {d.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {dayJobs.slice(0, 3).map((j) => (
                  <button
                    key={j.row.lead.id}
                    onClick={() => onOpen(j.row)}
                    className="w-full text-left truncate rounded bg-primary/10 text-primary px-1.5 py-0.5 hover:bg-primary/20"
                  >
                    {j.row.lead.full_name ?? j.row.lead.quote_number ?? "Job"}
                  </button>
                ))}
                {dayJobs.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-1">
                    +{dayJobs.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
