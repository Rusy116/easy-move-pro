import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { listSettings, saveSetting } from "@/lib/ai/api";

export const Route = createFileRoute("/_authenticated/ai/settings")({
  head: () => ({
    meta: [
      { title: "AI Settings — Easy Moving" },
      { name: "description", content: "Languages, templates, quality rules, models and limits." },
    ],
  }),
  component: AiSettings,
});

const GROUPS: { key: string; title: string; hint: string }[] = [
  { key: "languages", title: "Languages", hint: "Locales the factories produce content in." },
  { key: "countries", title: "Countries", hint: "Markets in scope." },
  { key: "states", title: "States", hint: "State coverage for local pages." },
  { key: "cities", title: "Cities", hint: "City list used by the SEO Factory." },
  { key: "content_templates", title: "Content Templates", hint: "Reusable content skeletons." },
  { key: "seo_templates", title: "SEO Templates", hint: "Title and meta patterns." },
  { key: "publishing_rules", title: "Publishing Rules", hint: "When output may go live." },
  { key: "quality_rules", title: "Quality Rules", hint: "Minimum score and checks." },
  { key: "approval_workflow", title: "Approval Workflow", hint: "Who approves what." },
  { key: "ai_models", title: "AI Models", hint: "Model routing per agent." },
  { key: "task_limits", title: "Task Limits", hint: "Concurrency and daily caps." },
  { key: "api_keys", title: "API Keys", hint: "Named references only — secrets stay server-side." },
];

function AiSettings() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["ai", "settings"], queryFn: listSettings });
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!settings.data) return;
    const next: Record<string, string> = {};
    for (const g of GROUPS) {
      const row = settings.data.find((s) => s.key === g.key);
      next[g.key] = JSON.stringify(row?.value ?? {}, null, 2);
    }
    setDraft(next);
  }, [settings.data]);

  async function save(key: string) {
    try {
      const parsed = JSON.parse(draft[key] ?? "{}");
      await saveSetting(key, parsed);
      toast.success(`${key} saved`);
      qc.invalidateQueries({ queryKey: ["ai", "settings"] });
    } catch (e) {
      toast.error(e instanceof SyntaxError ? "Invalid JSON" : "Could not save");
    }
  }

  return (
    <AiShell>
      <PageHeader
        eyebrow="AI Growth Center"
        title="Settings"
        subtitle="Configuration is stored as structured values so new agents can read it directly."
        icon={<Settings className="h-5 w-5" />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map((g) => (
          <SectionShell
            key={g.key}
            title={g.title}
            right={
              <Button size="sm" variant="outline" onClick={() => save(g.key)}>
                <Save className="mr-1.5 h-3.5 w-3.5" /> Save
              </Button>
            }
          >
            <p className="mb-2 text-xs text-muted-foreground">{g.hint}</p>
            <Textarea
              value={draft[g.key] ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, [g.key]: e.target.value }))}
              rows={6}
              spellCheck={false}
              className="font-mono text-xs"
            />
          </SectionShell>
        ))}
      </div>
    </AiShell>
  );
}
