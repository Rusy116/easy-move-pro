import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Workflow, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, fmtDate } from "@/components/ai/blocks";
import { ALL_CAPABILITIES, AUTOMATION_PRESETS } from "@/lib/ai/registry";
import {
  createAutomation,
  deleteAutomation,
  listAutomations,
  toggleAutomation,
} from "@/lib/ai/api";

export const Route = createFileRoute("/_authenticated/ai/automation")({
  head: () => ({
    meta: [
      { title: "AI Automation — Easy Moving" },
      { name: "description", content: "Recurring rules that keep the AI workforce producing." },
    ],
  }),
  component: AutomationPage,
});

const FREQUENCIES = ["hourly", "daily", "weekly", "monthly"];

function AutomationPage() {
  const qc = useQueryClient();
  const rules = useQuery({ queryKey: ["ai", "automations"], queryFn: listAutomations });
  const [name, setName] = useState("");
  const [capability, setCapability] = useState(ALL_CAPABILITIES[0]!.key);
  const [frequency, setFrequency] = useState("daily");
  const [quantity, setQuantity] = useState("10");
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["ai"] });

  async function save(input?: { name: string; capability: string; frequency: string; quantity: number }) {
    const payload = input ?? {
      name: name.trim(),
      capability,
      frequency,
      quantity: Number(quantity) || 1,
    };
    if (!payload.name) {
      toast.error("Give the rule a name");
      return;
    }
    setBusy(true);
    try {
      await createAutomation(payload);
      toast.success("Automation created");
      setName("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save rule");
    } finally {
      setBusy(false);
    }
  }

  const list = rules.data ?? [];

  return (
    <AiShell>
      <PageHeader
        eyebrow="AI Growth Center"
        title="Automation"
        subtitle="Rules run on a schedule and enqueue tasks for the right agent."
        icon={<Workflow className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Rules" value={list.length} />
        <StatCard label="Active" value={list.filter((r) => r.enabled).length} tone="success" />
        <StatCard label="Paused" value={list.filter((r) => !r.enabled).length} tone="warning" />
      </div>

      <SectionShell title="Create a rule">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="rule-name">Rule name</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Generate 20 SEO pages every day"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Capability</Label>
            <Select value={capability} onValueChange={setCapability}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {ALL_CAPABILITIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f} className="capitalize">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={() => save()} disabled={busy}>
            <Plus className="mr-2 h-4 w-4" /> Add rule
          </Button>
          <span className="text-xs text-muted-foreground">Presets:</span>
          {AUTOMATION_PRESETS.map((preset) => (
            <Button
              key={preset.name}
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => save({ ...preset })}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </SectionShell>

      <SectionShell title="Rules">
        {list.length ? (
          <ul className="divide-y divide-border/60">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {r.frequency} · {r.quantity}× {r.capability} · {r.agent_key.replace(/_/g, " ")} ·
                    last run {fmtDate(r.last_run_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={async (v) => {
                      await toggleAutomation(r.id, v);
                      refresh();
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await deleteAutomation(r.id);
                      refresh();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No automation rules" hint="Use a preset above to get started." />
        )}
      </SectionShell>
    </AiShell>
  );
}
