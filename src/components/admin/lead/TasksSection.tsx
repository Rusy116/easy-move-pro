import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { Empty, dateTime, type LeadQuote } from "./shared";
import { BrokerSelect } from "../BrokerSelect";
import { useT } from "@/i18n";

type Task = {
  id: string;
  kind: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  owner_id: string | null;
  owner_email: string | null;
  priority: string;
  completed_at: string | null;
  created_by_email: string | null;
  created_at: string;
};

const KINDS = ["call", "estimate", "follow_up", "survey", "custom"] as const;

const PRIORITIES = ["low", "normal", "high", "urgent"];

export function TasksSection({ q }: { q: LeadQuote }) {
  const tr = useT();
  const kindLabel = useCallback((id: string) => tr(`admin.shell.tasks.kind.${id}`), [tr]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kind, setKind] = useState<string>("call");
  const [title, setTitle] = useState(kindLabel("call"));
  const [notes, setNotes] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("normal");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("lead_tasks")
      .select("*")
      .eq("quote_id", q.id)
      .order("completed_at", { ascending: true, nullsFirst: true })
      .order("due_at", { ascending: true, nullsFirst: false });
    setTasks((data as unknown as Task[]) ?? []);
  }, [q.id]);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`lead-tasks-${q.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_tasks", filter: `quote_id=eq.${q.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [q.id, load]);

  async function createTask() {
    if (!title.trim()) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("lead_tasks").insert({
      quote_id: q.id,
      kind,
      title: title.trim(),
      notes: notes.trim() || null,
      due_at: due ? new Date(due).toISOString() : null,
      owner_id: ownerId,
      priority,
      created_by: u.user?.id ?? null,
      created_by_email: u.user?.email ?? null,
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    setNotes("");
    setDue("");
    toast.success(tr("admin.shell.tasks.created"));
    void load();
  }

  async function toggle(t: Task) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("lead_tasks")
      .update({
        completed_at: t.completed_at ? null : new Date().toISOString(),
        completed_by: t.completed_at ? null : (u.user?.id ?? null),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", t.id);
    if (error) toast.error(error.message);
    void load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("lead_tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-xl border border-border bg-card/50 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            value={kind}
            onValueChange={(v) => {
              setKind(v);
              if (v !== "custom") setTitle(kindLabel(v));
              if (v === "custom") setTitle("");
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {kindLabel(k)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tr("admin.shell.tasks.titlePlaceholder")}
            className="h-9"
          />
          <Input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="h-9"
          />
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {tr(`admin.shell.tasks.priority.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="sm:col-span-2">
            <BrokerSelect value={ownerId} onChange={setOwnerId} size="sm" />
          </div>
        </div>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={tr("admin.shell.tasks.notesPlaceholder")}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={() => void createTask()} disabled={saving || !title.trim()}>
            {saving ? tr("admin.shell.tasks.saving") : tr("admin.shell.tasks.addTask")}
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Empty>{tr("admin.shell.tasks.empty")}</Empty>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => {
            const overdue = t.due_at && !t.completed_at && new Date(t.due_at) < new Date();
            return (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 text-sm"
              >
                <button
                  type="button"
                  aria-label={
                    t.completed_at
                      ? tr("admin.shell.tasks.markIncomplete")
                      : tr("admin.shell.tasks.markComplete")
                  }
                  onClick={() => void toggle(t)}
                  className="mt-0.5 text-muted-foreground hover:text-foreground"
                >
                  {t.completed_at ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div
                    className={`font-medium ${t.completed_at ? "text-muted-foreground line-through" : ""}`}
                  >
                    {t.title}
                  </div>
                  {t.notes && <p className="mt-0.5 whitespace-pre-wrap">{t.notes}</p>}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {tr("admin.shell.tasks.priorityLabel", {
                        priority: tr(`admin.shell.tasks.priority.${t.priority}`),
                      })}
                    </span>
                    <span className={overdue ? "font-medium text-rose-600" : ""}>
                      {tr("admin.shell.tasks.due", { date: t.due_at ? dateTime(t.due_at) : "—" })}
                    </span>
                    <span>
                      {tr("admin.shell.tasks.owner", {
                        name: t.owner_email ?? tr("admin.shell.tasks.unassigned"),
                      })}
                    </span>
                    {t.completed_at && (
                      <span>{tr("admin.shell.tasks.done", { date: dateTime(t.completed_at) })}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={tr("admin.shell.tasks.deleteTask")}
                  onClick={() => void remove(t.id)}
                  className="text-muted-foreground hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
