import { useEffect, useState } from "react";
import { Clock, PauseCircle } from "lucide-react";

/**
 * Live SLA countdown driven by exclusive_expires_at.
 * If exclusive_paused_at is set, the timer is frozen and shown as paused.
 */
export function SlaCountdown({
  expiresAt,
  pausedAt,
  className = "",
  compact = false,
}: {
  expiresAt: string | null;
  pausedAt?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt || pausedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt, pausedAt]);

  if (!expiresAt) return null;

  const end = new Date(expiresAt).getTime();
  const reference = pausedAt ? new Date(pausedAt).getTime() : now;
  const remaining = Math.max(0, end - reference);
  const expired = !pausedAt && remaining <= 0;

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  const label = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;

  const tone = pausedAt
    ? "bg-slate-100 text-slate-700 border-slate-300"
    : expired
      ? "bg-rose-100 text-rose-800 border-rose-300"
      : remaining < 3_600_000
        ? "bg-amber-100 text-amber-800 border-amber-300"
        : "bg-emerald-100 text-emerald-800 border-emerald-300";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] ${tone} ${className}`}
      title={
        pausedAt
          ? `Paused at ${new Date(pausedAt).toLocaleString()}`
          : `Expires ${new Date(expiresAt).toLocaleString()}`
      }
    >
      {pausedAt ? <PauseCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {pausedAt ? (compact ? "Paused" : "SLA paused") : expired ? "Expired" : label}
    </span>
  );
}
