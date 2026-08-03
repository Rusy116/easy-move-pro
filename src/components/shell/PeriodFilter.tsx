/**
 * Shared time-window filter used by every role dashboard so that
 * "Today / This week / This month / All time" means the same thing everywhere.
 */
import { Button } from "@/components/ui/button";

export type DashboardPeriod = "today" | "week" | "month" | "all";

export const DASHBOARD_PERIODS: Array<{ key: DashboardPeriod; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
];

export const PERIOD_LABEL: Record<DashboardPeriod, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  all: "All time",
};

/** Inclusive lower bound for a period, or null for "all". */
export function periodStart(period: DashboardPeriod, now = new Date()): Date | null {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === "today") return d;
  if (period === "week") {
    // Week starts Monday.
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return d;
  }
  if (period === "month") {
    d.setDate(1);
    return d;
  }
  return null;
}

export function inPeriod(iso: string | null | undefined, period: DashboardPeriod): boolean {
  if (period === "all") return true;
  if (!iso) return false;
  const start = periodStart(period);
  if (!start) return true;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t >= start.getTime();
}

export function PeriodFilter({
  value,
  onChange,
  className = "",
}: {
  value: DashboardPeriod;
  onChange: (p: DashboardPeriod) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Time period"
      className={`flex flex-wrap items-center gap-1.5 ${className}`}
    >
      {DASHBOARD_PERIODS.map((p) => (
        <Button
          key={p.key}
          size="sm"
          variant={value === p.key ? "default" : "outline"}
          className="rounded-full"
          aria-pressed={value === p.key}
          onClick={() => onChange(p.key)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
