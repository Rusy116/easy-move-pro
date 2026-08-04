import { useState, type ReactNode } from "react";
import { Loader2, Play, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AI_STATUS_TONE, type AiCapability } from "@/lib/ai/registry";
import { enqueueTask, type AiTask, type AiLog } from "@/lib/ai/api";

export function StatusPill({ status }: { status: string }) {
  const tone = AI_STATUS_TONE[status] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${tone}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-gradient-to-r from-sage to-ochre transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Grid of capability cards. Clicking one opens the queue dialog. */
export function CapabilityGrid({
  capabilities,
  onQueued,
}: {
  capabilities: AiCapability[];
  onQueued?: () => void;
}) {
  const [active, setActive] = useState<AiCapability | null>(null);
  const [qty, setQty] = useState("5");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!active) return;
    setBusy(true);
    try {
      await enqueueTask({
        capability: active.key,
        title: active.label,
        quantity: Number(qty) || 1,
        scheduledFor: when ? new Date(when).toISOString() : null,
      });
      toast.success(`${active.label} queued`);
      setActive(null);
      onQueued?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not queue task");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {capabilities.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              setActive(c);
              setQty("5");
              setWhen("");
            }}
            className="card-premium card-premium-hover group p-4 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-semibold">{c.label}</span>
              <Play className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{c.description}</p>
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{active?.label}</DialogTitle>
            <DialogDescription>
              {active?.description} The task is added to the queue and picked up by the{" "}
              {active?.agentKey.replace(/_/g, " ")} agent.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="when">Schedule (optional)</Label>
              <Input
                id="when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : when ? (
                <Clock className="mr-2 h-4 w-4" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {when ? "Schedule task" : "Add to queue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TaskTable({ tasks, actions }: { tasks: AiTask[]; actions?: (t: AiTask) => ReactNode }) {
  if (!tasks.length) return <EmptyState title="No tasks yet" hint="Queue a capability to begin." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pr-3 font-semibold">Task</th>
            <th className="py-2 pr-3 font-semibold">Agent</th>
            <th className="py-2 pr-3 font-semibold">Status</th>
            <th className="py-2 pr-3 font-semibold">Progress</th>
            <th className="py-2 pr-3 font-semibold">Created</th>
            {actions && <th className="py-2 font-semibold" />}
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} className="border-b border-border/60 last:border-0">
              <td className="py-2.5 pr-3 font-medium">{t.title}</td>
              <td className="py-2.5 pr-3 text-muted-foreground">{t.agent_key.replace(/_/g, " ")}</td>
              <td className="py-2.5 pr-3">
                <StatusPill status={t.status} />
              </td>
              <td className="py-2.5 pr-3 w-32">
                <Progress value={t.progress} />
              </td>
              <td className="py-2.5 pr-3 text-xs text-muted-foreground">{fmtDate(t.created_at)}</td>
              {actions && <td className="py-2.5 text-right">{actions(t)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LogList({ logs }: { logs: AiLog[] }) {
  if (!logs.length) return <EmptyState title="No activity logged yet" />;
  return (
    <ul className="space-y-2.5">
      {logs.map((l) => (
        <li key={l.id} className="flex items-start gap-3 text-sm">
          <span
            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
              l.level === "error"
                ? "bg-rose-500"
                : l.level === "warn"
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            }`}
          />
          <div className="min-w-0">
            <p className="truncate">{l.message}</p>
            <p className="text-xs text-muted-foreground">
              {l.agent_key.replace(/_/g, " ")} · {fmtDate(l.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
