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
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/ai/settings")({
  head: () => ({
    meta: [
      { title: "AI Settings — Easy Moving" },
      { name: "description", content: "Languages, templates, quality rules, models and limits." },
    ],
  }),
  component: AiSettings,
});

const GROUPS: { key: string; titleKey: string; hintKey: string }[] = [
  { key: "languages", titleKey: "admin.ai3.settings.groupLanguagesTitle", hintKey: "admin.ai3.settings.groupLanguagesHint" },
  { key: "countries", titleKey: "admin.ai3.settings.groupCountriesTitle", hintKey: "admin.ai3.settings.groupCountriesHint" },
  { key: "states", titleKey: "admin.ai3.settings.groupStatesTitle", hintKey: "admin.ai3.settings.groupStatesHint" },
  { key: "cities", titleKey: "admin.ai3.settings.groupCitiesTitle", hintKey: "admin.ai3.settings.groupCitiesHint" },
  { key: "content_templates", titleKey: "admin.ai3.settings.groupContentTemplatesTitle", hintKey: "admin.ai3.settings.groupContentTemplatesHint" },
  { key: "seo_templates", titleKey: "admin.ai3.settings.groupSeoTemplatesTitle", hintKey: "admin.ai3.settings.groupSeoTemplatesHint" },
  { key: "publishing_rules", titleKey: "admin.ai3.settings.groupPublishingRulesTitle", hintKey: "admin.ai3.settings.groupPublishingRulesHint" },
  { key: "quality_rules", titleKey: "admin.ai3.settings.groupQualityRulesTitle", hintKey: "admin.ai3.settings.groupQualityRulesHint" },
  { key: "approval_workflow", titleKey: "admin.ai3.settings.groupApprovalWorkflowTitle", hintKey: "admin.ai3.settings.groupApprovalWorkflowHint" },
  { key: "ai_models", titleKey: "admin.ai3.settings.groupAiModelsTitle", hintKey: "admin.ai3.settings.groupAiModelsHint" },
  { key: "task_limits", titleKey: "admin.ai3.settings.groupTaskLimitsTitle", hintKey: "admin.ai3.settings.groupTaskLimitsHint" },
  { key: "api_keys", titleKey: "admin.ai3.settings.groupApiKeysTitle", hintKey: "admin.ai3.settings.groupApiKeysHint" },
];

function AiSettings() {
  const tr = useT();
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
      toast.success(tr("admin.ai3.settings.toastSaved", { key }));
      qc.invalidateQueries({ queryKey: ["ai", "settings"] });
    } catch (e) {
      toast.error(
        e instanceof SyntaxError
          ? tr("admin.ai3.settings.toastInvalidJson")
          : tr("admin.ai3.settings.toastSaveFailed")
      );
    }
  }

  return (
    <AiShell>
      <PageHeader
        eyebrow={tr("admin.ai.dashboard.eyebrow")}
        title={tr("admin.ai3.settings.title")}
        subtitle={tr("admin.ai3.settings.subtitle")}
        icon={<Settings className="h-5 w-5" />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map((g) => (
          <SectionShell
            key={g.key}
            title={tr(g.titleKey)}
            right={
              <Button size="sm" variant="outline" onClick={() => save(g.key)}>
                <Save className="mr-1.5 h-3.5 w-3.5" /> {tr("admin.ai3.settings.save")}
              </Button>
            }
          >
            <p className="mb-2 text-xs text-muted-foreground">{tr(g.hintKey)}</p>
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
