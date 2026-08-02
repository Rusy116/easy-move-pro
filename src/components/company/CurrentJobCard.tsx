import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, MapPin, Calendar, User, Building2, DollarSign, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "@/components/company/JobsUI";
import { timerTone } from "@/components/marketplace/JobOwnership";
import { formatDate, money, place, type MyJob } from "@/lib/company-jobs";
import { useBrokerName } from "@/lib/company-workflow";

/** Large 12-hour countdown until first customer contact. */
export function BigCountdown({ deadline }: { deadline: string | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!deadline) return null;
  const c = timerTone(deadline);
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${c.tone}`}
      aria-live="polite"
    >
      <Clock className="h-5 w-5 shrink-0" />
      <div className="leading-tight">
        <div className="text-xl font-bold tabular-nums">
          {c.expired ? "EXPIRED" : c.label.toUpperCase()}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
          {c.expired ? "Returned to marketplace" : "Remaining to contact customer"}
        </div>
      </div>
    </div>
  );
}

function Cell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

export function CurrentJobCard({ job, companyName }: { job: MyJob; companyName: string }) {
  const broker = useBrokerName(job.assigned_broker_id);
  const awaitingContact = (job.job_status ?? "") === "claimed";

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {job.quote_number ?? job.id.slice(0, 8)}
          </div>
          <h3 className="mt-0.5 truncate text-lg font-semibold">
            {place(job.origin_city, job.origin_state)} →{" "}
            {place(job.destination_city, job.destination_state)}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <JobStatusBadge status={job.job_status} />
        </div>
      </div>

      {awaitingContact && (
        <div className="mt-4">
          <BigCountdown deadline={job.claim_deadline_at} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cell
          icon={<User className="h-3 w-3" />}
          label="Customer"
          value={customerName(job)}
        />

        <Cell
          icon={<MapPin className="h-3 w-3" />}
          label="Origin"
          value={place(job.origin_city, job.origin_state)}
        />
        <Cell
          icon={<MapPin className="h-3 w-3" />}
          label="Destination"
          value={place(job.destination_city, job.destination_state)}
        />
        <Cell icon={<User className="h-3 w-3" />} label="Broker" value={broker} />
        <Cell
          icon={<DollarSign className="h-3 w-3" />}
          label="Final price"
          value={job.final_price != null ? money(job.final_price) : "Not set"}
        />
        <Cell
          icon={<Calendar className="h-3 w-3" />}
          label="Move date"
          value={formatDate(job.final_move_date ?? job.move_date)}
        />
        <Cell icon={<Building2 className="h-3 w-3" />} label="Company" value={companyName} />
      </div>

      <Button asChild size="lg" className="mt-5 h-11 w-full rounded-xl font-semibold">
        <Link to="/company/job/$jobId" params={{ jobId: job.id }}>
          Open job <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </article>
  );
}
