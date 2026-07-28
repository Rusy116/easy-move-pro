import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Boxes, Calendar, Clock, Mail, MapPin, Phone, Route as RouteIcon, Loader2, ExternalLink,
} from "lucide-react";
import {
  countdown, formatDate, money, place, timeAgo,
  JOB_STATUS_LABEL, JOB_STATUS_TONE, type AvailableJob, type JobStatus, type MyJob,
} from "@/lib/company-jobs";

/* ------------------------------- badges ------------------------------ */

export function JobStatusBadge({ status }: { status: string }) {
  const key = (status as JobStatus) in JOB_STATUS_LABEL ? (status as JobStatus) : "new";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${JOB_STATUS_TONE[key]}`}
    >
      {JOB_STATUS_LABEL[key]}
    </span>
  );
}

/** Live 12-hour response countdown. */
export function ResponseCountdown({ deadline }: { deadline: string | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!deadline) return null;
  const c = countdown(deadline);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        c.expired || c.urgent
          ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
      }`}
    >
      <Clock className="h-3 w-3" />
      {c.expired ? "Response overdue" : `${c.label} to respond`}
    </span>
  );
}

/* ------------------------------ fact row ----------------------------- */

export function Fact({
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

/* -------------------------- available job card ----------------------- */

export function AvailableJobCard({
  job,
  claiming,
  onClaim,
}: {
  job: AvailableJob;
  claiming: boolean;
  onClaim: (job: AvailableJob) => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {job.quote_number ?? "—"}
          </div>
          <h3 className="mt-0.5 truncate text-lg font-semibold">{job.customer_name ?? "Customer"}</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <Clock className="h-3 w-3" /> {timeAgo(job.published_at)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Fact icon={<MapPin className="h-3 w-3" />} label="Origin" value={place(job.origin_city, job.origin_state)} />
        <Fact icon={<MapPin className="h-3 w-3" />} label="Destination" value={place(job.destination_city, job.destination_state)} />
        <Fact icon={<Calendar className="h-3 w-3" />} label="Move date" value={formatDate(job.move_date)} />
        <Fact icon={<RouteIcon className="h-3 w-3" />} label="Distance" value={job.distance_miles ? `${Math.round(job.distance_miles)} mi` : "—"} />
        <Fact icon={<Boxes className="h-3 w-3" />} label="Volume" value={job.estimated_cubic_feet ? `${Math.round(job.estimated_cubic_feet)} cu ft` : "—"} />
        <Fact
          icon={<Boxes className="h-3 w-3" />}
          label="Estimate"
          value={`${money(job.estimated_low)} – ${money(job.estimated_high)}`}
        />
      </div>

      {job.services && job.services.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {job.services.map((s) => (
            <span key={s} className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium">
              {s}
            </span>
          ))}
        </div>
      )}

      <Button
        onClick={() => onClaim(job)}
        disabled={claiming}
        size="lg"
        className="mt-5 h-12 w-full rounded-xl text-base font-semibold"
      >
        {claiming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Claim Job
      </Button>
    </article>
  );
}

/* ----------------------------- my job card --------------------------- */

export function MyJobCard({ job }: { job: MyJob }) {
  const canPortal = Boolean(job.quote_number && job.portal_token);


  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {job.quote_number ?? "—"}
          </div>
          <h3 className="mt-0.5 truncate text-lg font-semibold">
            {place(job.origin_city, job.origin_state)} → {place(job.destination_city, job.destination_state)}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <JobStatusBadge status={job.job_status} />
          {job.job_status === "claimed" && <ResponseCountdown deadline={job.claim_deadline_at} />}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact icon={<Calendar className="h-3 w-3" />} label="Move date" value={formatDate(job.final_move_date ?? job.move_date)} />
        <Fact icon={<RouteIcon className="h-3 w-3" />} label="Distance" value={job.distance_miles ? `${Math.round(job.distance_miles)} mi` : "—"} />
        <Fact icon={<Phone className="h-3 w-3" />} label="Phone" value={job.contact_phone ?? "—"} />
        <Fact icon={<Mail className="h-3 w-3" />} label="Email" value={job.contact_email ?? "—"} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" className="rounded-full" disabled={!job.contact_phone}>
          <a href={`tel:${job.contact_phone ?? ""}`}>
            <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
          </a>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-full" disabled={!job.contact_email}>
          <a href={`mailto:${job.contact_email ?? ""}`}>
            <Mail className="mr-1.5 h-3.5 w-3.5" /> Email
          </a>
        </Button>
        {portalHref && (
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to={portalHref}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Customer Portal
            </Link>
          </Button>
        )}
        <Button asChild size="sm" className="rounded-full">
          <Link to="/company/job/$jobId" params={{ jobId: job.id }}>
            Open job details
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
