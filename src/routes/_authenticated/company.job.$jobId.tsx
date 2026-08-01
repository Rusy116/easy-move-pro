import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Save,
  Send,
  CalendarCheck,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SkeletonRows } from "@/components/shell/Chrome";
import { EmptyState, Fact, JobStatusBadge, ResponseCountdown } from "@/components/company/JobsUI";
import { FinalPriceCard } from "@/components/company/FinalPriceCard";
import { InternalNotesCard } from "@/components/company/InternalNotesCard";

import {
  ACTIVITY_LABEL,
  formatDate,
  money,
  place,
  timeAgo,
  logJobView,
  useCompanyJobs,
  useJobActivity,
  useMyCompany,
  type MyJob,
} from "@/lib/company-jobs";

export const Route = createFileRoute("/_authenticated/company/job/$jobId")({
  head: () => ({
    meta: [
      { title: "Job Details — Easy Moving Company Portal" },
      {
        name: "description",
        content:
          "Confirm the move date, set the final price and send the final quote to the customer.",
      },
    ],
  }),
  component: JobDetailsPage,
});

type Form = {
  final_price: string;
  final_move_date: string;
  arrival_window: string;
  crew_size: string;
  final_truck_size: string;
  company_notes: string;
};

function toForm(job: MyJob): Form {
  return {
    final_price: job.final_price != null ? String(job.final_price) : "",
    final_move_date: job.final_move_date ?? job.move_date ?? "",
    arrival_window: job.arrival_window ?? "",
    crew_size: job.crew_size != null ? String(job.crew_size) : "",
    final_truck_size: job.final_truck_size ?? job.truck_size ?? "",
    company_notes: job.company_notes ?? "",
  };
}

function JobDetailsPage() {
  const { jobId } = Route.useParams();
  const { company, loading: loadingCompany } = useMyCompany();
  const { myJobs, loading, patchJob, reload } = useCompanyJobs(company?.id ?? null);
  const { activity } = useJobActivity(jobId);

  const job = useMemo(() => myJobs.find((j) => j.id === jobId) ?? null, [myJobs, jobId]);
  const [form, setForm] = useState<Form | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (job && !form) setForm(toForm(job));
  }, [job, form]);

  // Audit log: record that this company opened the lead.
  useEffect(() => {
    if (company?.id && jobId) void logJobView(jobId, company.id);
  }, [company?.id, jobId]);

  async function run(action: string, extra?: Partial<Record<string, unknown>>) {
    if (!job || !form) return;
    setPending(action);
    const payload: Record<string, unknown> = {
      final_price: form.final_price ? Number(form.final_price) : null,
      final_move_date: form.final_move_date || null,
      arrival_window: form.arrival_window || null,
      crew_size: form.crew_size ? Number(form.crew_size) : null,
      final_truck_size: form.final_truck_size || null,
      company_notes: form.company_notes || null,
      ...extra,
    };
    const { error } = await supabase.rpc("fn_company_update_job", {
      _quote_id: job.id,
      _action: action,
      _payload: payload as never,
    });
    setPending(null);
    if (error) {
      toast.error(error.message || "Action failed.");
      void reload();
      return;
    }
    const nextStatus: Record<string, string> = {
      contacted: "contacted",
      send_final_quote: "final_quote_sent",
      schedule: "booked",
      complete: "completed",
      cancel: "cancelled",
    };
    if (nextStatus[action]) patchJob(job.id, { job_status: nextStatus[action] } as Partial<MyJob>);
    toast.success(
      action === "save_details"
        ? "Job details saved."
        : action === "send_final_quote"
          ? "Final quote sent to the customer."
          : "Job updated.",
    );
    void reload();
  }

  if (loadingCompany || (loading && !job)) return <SkeletonRows n={4} />;
  if (!job || !form) {
    return (
      <EmptyState
        title="Job not available"
        body="This job is not owned by your company, or it has returned to the marketplace."
      />
    );
  }

  // Customer PII, portal access and the final quote unlock only after a claim.
  const unlocked = Boolean(job.claimed_at && job.assigned_company_id);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-5">
      <Link
        to="/company/myjobs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to my jobs
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {job.quote_number ?? "—"}
          </div>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            {place(job.origin_city, job.origin_state)} →{" "}
            {place(job.destination_city, job.destination_state)}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <JobStatusBadge status={job.job_status} />
          {job.job_status === "claimed" && <ResponseCountdown deadline={job.claim_deadline_at} />}
        </div>
      </header>

      {/* Customer + move facts */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Fact
            icon={<Phone className="h-3 w-3" />}
            label="Phone"
            value={unlocked ? (job.contact_phone ?? "—") : "Locked until claimed"}
          />
          <Fact
            icon={<Mail className="h-3 w-3" />}
            label="Email"
            value={unlocked ? (job.contact_email ?? "—") : "Locked until claimed"}
          />
          <Fact
            icon={<CalendarCheck className="h-3 w-3" />}
            label="Requested date"
            value={formatDate(job.move_date)}
          />
          <Fact
            icon={<CheckCircle2 className="h-3 w-3" />}
            label="Broker estimate"
            value={`${money(job.estimated_low)} – ${money(job.estimated_high)}`}
          />
          <Fact
            icon={<CheckCircle2 className="h-3 w-3" />}
            label="Volume"
            value={job.estimated_cubic_feet ? `${Math.round(job.estimated_cubic_feet)} cu ft` : "—"}
          />
          <Fact
            icon={<CheckCircle2 className="h-3 w-3" />}
            label="Distance"
            value={job.distance_miles ? `${Math.round(job.distance_miles)} mi` : "—"}
          />
          <Fact
            icon={<CheckCircle2 className="h-3 w-3" />}
            label="Pickup"
            value={unlocked ? (job.origin_address ?? "—") : "Locked until claimed"}
          />
          <Fact
            icon={<CheckCircle2 className="h-3 w-3" />}
            label="Delivery"
            value={unlocked ? (job.destination_address ?? "—") : "Locked until claimed"}
          />
        </div>
        {unlocked ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <a href={`tel:${job.contact_phone ?? ""}`}>
                <Phone className="mr-1.5 h-3.5 w-3.5" /> Call customer
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <a href={`mailto:${job.contact_email ?? ""}`}>
                <Mail className="mr-1.5 h-3.5 w-3.5" /> Email customer
              </a>
            </Button>
            {job.quote_number && job.portal_token && (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link
                  to="/portal/$quoteNumber"
                  params={{ quoteNumber: job.quote_number }}
                  search={{ token: job.portal_token }}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Customer portal
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Customer name, phone, email, addresses and portal access unlock as soon as you claim
            this job.
          </p>
        )}
      </section>

      {/* Final quote builder */}
      {unlocked && (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-base font-semibold">Final quote</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="final_price">Final price ($)</Label>
              <Input
                id="final_price"
                inputMode="decimal"
                value={form.final_price}
                onChange={set("final_price")}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="final_move_date">Confirmed move date</Label>
              <Input
                id="final_move_date"
                type="date"
                value={form.final_move_date}
                onChange={set("final_move_date")}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="arrival_window">Arrival time window</Label>
              <Input
                id="arrival_window"
                placeholder="8:00 AM – 10:00 AM"
                value={form.arrival_window}
                onChange={set("arrival_window")}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="crew_size">Crew size</Label>
              <Input
                id="crew_size"
                inputMode="numeric"
                value={form.crew_size}
                onChange={set("crew_size")}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="final_truck_size">Truck size</Label>
              <Input
                id="final_truck_size"
                placeholder="26 ft box truck"
                value={form.final_truck_size}
                onChange={set("final_truck_size")}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="company_notes">Notes for the customer</Label>
              <Textarea
                id="company_notes"
                rows={4}
                value={form.company_notes}
                onChange={set("company_notes")}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              disabled={pending !== null}
              onClick={() => run("save_details")}
            >
              {pending === "save_details" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save details
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={pending !== null}
              onClick={() => run("contacted")}
            >
              {pending === "contacted" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Mark customer contacted
            </Button>
            <Button
              className="rounded-full"
              disabled={pending !== null || !form.final_price}
              onClick={() => run("send_final_quote")}
            >
              {pending === "send_final_quote" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send final quote
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={pending !== null}
              onClick={() => run("schedule")}
            >
              {pending === "schedule" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CalendarCheck className="mr-2 h-4 w-4" />
              )}
              Schedule move
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={pending !== null}
              onClick={() => run("complete")}
            >
              Mark completed
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-rose-300 text-rose-700 hover:bg-rose-50"
              disabled={pending !== null}
              onClick={() => run("cancel")}
            >
              <XCircle className="mr-2 h-4 w-4" /> Cancel job
            </Button>
          </div>
        </section>
      )}

      {/* Phase 4 — final price lock, revision history and internal notes */}
      {unlocked && company && (
        <>
          <FinalPriceCard job={job} companyId={company.id} onChanged={() => void reload()} />
          <InternalNotesCard quoteId={job.id} companyId={company.id} />
        </>
      )}

      {/* Audit log */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold">Activity log</h2>
        {activity.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {activity.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <span className="text-sm">{ACTIVITY_LABEL[a.action] ?? a.action}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(a.created_at)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
