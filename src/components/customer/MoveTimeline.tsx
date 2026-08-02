import { CheckCircle2, Circle, Clock } from "lucide-react";
import { LEAD_STATUS_FLOW, type LeadStatus } from "@/lib/lead-status";
import { useStatusLabel } from "@/i18n";
import type { TimelineEntry } from "@/lib/customer-portal";

/** Canonical customer-facing lifecycle steps. */
const STEPS: LeadStatus[] = [...LEAD_STATUS_FLOW].filter((s) => s !== "draft") as LeadStatus[];

const STEP_COPY: Partial<Record<LeadStatus, string>> = {
  submitted: "Quote submitted",
  under_review: "Broker review",
  qualified: "Qualified",
  published: "Published to movers",
  claimed: "Company claimed",
  contacted: "Company contacted you",
  price_confirmed: "Final price ready",
  customer_confirmed: "You confirmed",
  completed: "Move completed",
};

export function MoveProgress({ status }: { status: LeadStatus }) {
  const statusLabel = useStatusLabel();
  const cancelled = status === "cancelled" || status === "rejected";
  const index = STEPS.indexOf(status);

  return (
    <ol className="space-y-3">
      {STEPS.map((step, i) => {
        const done = !cancelled && index >= 0 && i < index;
        const current = !cancelled && i === index;
        return (
          <li key={step} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0">
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : current ? (
                <Clock className="h-4 w-4 text-ochre" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40" />
              )}
            </span>
            <span
              className={
                current
                  ? "text-sm font-medium"
                  : done
                    ? "text-sm text-foreground/80"
                    : "text-sm text-muted-foreground"
              }
            >
              {STEP_COPY[step] ?? statusLabel("lead", step)}
            </span>
          </li>
        );
      })}
      {cancelled && (
        <li className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0">
            <Circle className="h-4 w-4 text-rose-500" />
          </span>
          <span className="text-sm font-medium text-rose-700">{statusLabel("lead", status)}</span>
        </li>
      )}
    </ol>
  );
}

export function MoveTimeline({
  entries,
  emptyLabel = "No activity recorded yet.",
}: {
  entries: TimelineEntry[];
  emptyLabel?: string;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ol className="relative space-y-4 border-l border-border/70 pl-5">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span
            className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-sage ring-4 ring-background"
            aria-hidden
          />
          <div className="text-sm font-medium">{e.label}</div>
          {e.detail && <div className="text-xs text-muted-foreground">{e.detail}</div>}
          <div className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString()}</div>
        </li>
      ))}
    </ol>
  );
}
