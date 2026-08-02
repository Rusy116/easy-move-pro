import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { timeAgo } from "@/lib/company-jobs";
import {
  JOB_PIPELINE,
  JOB_SERVICES,
  TASK_TEMPLATES,
  pipelineIndex,
  useContactLog,
  useJobTasks,
  type ContactChannel,
} from "@/lib/company-workflow";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* ------------------------------- pipeline ------------------------------ */

export function JobPipeline({ status }: { status: string | null }) {
  const current = pipelineIndex(status);
  return (
    <Card title="Workflow">
      <ol className="flex flex-wrap gap-2">
        {JOB_PIPELINE.map((step, i) => {
          const done = current >= 0 && i < current;
          const active = i === current;
          return (
            <li
              key={step.status}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : done
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                    : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {done ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              {step.label}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/* ---------------------------- extra services --------------------------- */

export function AdditionalServicesCard({
  value,
  onChange,
  onSave,
  saving,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Card title="Additional services">
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        Changing services may update the final price — review the agreed price after saving.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {JOB_SERVICES.map((s) => {
          const checked = value.includes(s);
          return (
            <label
              key={s}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                checked ? "border-primary bg-primary/5 font-medium" : "border-border"
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--primary))]"
                checked={checked}
                onChange={() =>
                  onChange(checked ? value.filter((v) => v !== s) : [...value, s])
                }
              />
              {s}
            </label>
          );
        })}
      </div>
      <Button className="mt-4 rounded-full" onClick={onSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save services
      </Button>
    </Card>
  );
}

/* ---------------------------- contact history -------------------------- */

const CHANNELS: Array<{ key: ContactChannel; label: string; icon: React.ReactNode }> = [
  { key: "call", label: "Call", icon: <Phone className="h-3.5 w-3.5" /> },
  { key: "sms", label: "SMS", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { key: "email", label: "Email", icon: <Mail className="h-3.5 w-3.5" /> },
];

export function ContactHistoryCard({
  quoteId,
  companyId,
}: {
  quoteId: string;
  companyId: string;
}) {
  const { entries, logContact } = useContactLog(quoteId, companyId);
  const [channel, setChannel] = useState<ContactChannel>("call");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = (c: ContactChannel) => entries.filter((e) => e.channel === c);

  async function add() {
    setBusy(true);
    try {
      await logContact(channel, summary, "outbound");
      setSummary("");
      toast.success("Contact logged.");
    } catch {
      toast.error("Could not log this contact.");
    }
    setBusy(false);
  }

  return (
    <Card title="Contact history">
      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((c) => (
          <Button
            key={c.key}
            size="sm"
            variant={channel === c.key ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setChannel(c.key)}
          >
            {c.icon}
            <span className="ml-1.5">{c.label}</span>
          </Button>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={`What happened on this ${channel}?`}
        />
        <Button className="rounded-full" onClick={add} disabled={busy || !summary.trim()}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Log
        </Button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {CHANNELS.map((c) => (
          <div key={c.key}>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {c.icon} {c.label} history
            </div>
            <ul className="mt-2 space-y-2">
              {filtered(c.key).length === 0 && (
                <li className="text-sm text-muted-foreground">No {c.label.toLowerCase()} yet.</li>
              )}
              {filtered(c.key).map((e) => (
                <li key={e.id} className="rounded-lg border border-border/70 px-3 py-2 text-sm">
                  <p className="break-words">{e.summary ?? "—"}</p>
                  <span className="text-xs text-muted-foreground">{timeAgo(e.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* --------------------------------- tasks ------------------------------- */

export function TasksCard({ quoteId, companyId }: { quoteId: string; companyId: string }) {
  const { tasks, addTask, toggleTask, removeTask } = useJobTasks(quoteId, companyId);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  return (
    <Card title="Tasks">
      <div className="flex flex-wrap gap-1.5">
        {TASK_TEMPLATES.map((t) => (
          <Button
            key={t}
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => void addTask(t)}
          >
            <Plus className="mr-1 h-3 w-3" /> {t}
          </Button>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <Label htmlFor="task_title" className="sr-only">
            Task
          </Label>
          <Input
            id="task_title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New task"
          />
        </div>
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <Button
          className="rounded-full"
          disabled={!title.trim()}
          onClick={() => {
            void addTask(title, due || null);
            setTitle("");
            setDue("");
          }}
        >
          Add task
        </Button>
      </div>

      <ul className="mt-4 space-y-2">
        {tasks.length === 0 && <li className="text-sm text-muted-foreground">No tasks yet.</li>}
        {tasks.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2"
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-[hsl(var(--primary))]"
              checked={t.done}
              onChange={() => void toggleTask(t)}
              aria-label={`Mark ${t.title} done`}
            />
            <span className={`flex-1 text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>
              {t.title}
            </span>
            {t.due_date && (
              <span className="text-xs text-muted-foreground">due {t.due_date}</span>
            )}
            <button
              type="button"
              onClick={() => void removeTask(t.id)}
              className="text-muted-foreground hover:text-rose-600"
              aria-label={`Delete ${t.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
