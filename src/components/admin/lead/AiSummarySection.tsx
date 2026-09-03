import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { summarizeLead } from "@/lib/lead-ai.functions";
import type { LeadAiSummary } from "@/lib/lead-ai.server";
import { Section, Empty, dateTime, type LeadQuote } from "./shared";
import { useT } from "@/i18n";

export function AiSummarySection({ q }: { q: LeadQuote }) {
  const tr = useT();
  const stored = (q.ai_summary as LeadAiSummary | null) ?? null;
  const [summary, setSummary] = useState<LeadAiSummary | null>(stored);
  const [at, setAt] = useState<string | null>((q.ai_summary_at as string | null) ?? null);
  const [loading, setLoading] = useState(false);
  const run = useServerFn(summarizeLead);

  async function generate() {
    setLoading(true);
    try {
      const s = (await run({ data: { quoteId: q.id } })) as LeadAiSummary;
      setSummary(s);
      setAt(new Date().toISOString());
      toast.success(tr("admin.shell.aiSummary.generated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("admin.shell.aiSummary.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section
      title={
        <span className="inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> {tr("admin.shell.aiSummary.title")}
        </span>
      }
      action={
        <Button size="sm" variant="outline" onClick={() => void generate()} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading
            ? tr("admin.shell.aiSummary.analyzing")
            : summary
              ? tr("admin.shell.aiSummary.regenerate")
              : tr("admin.shell.aiSummary.generate")}
        </Button>
      }
    >
      {!summary ? (
        <Empty>{tr("admin.shell.aiSummary.empty")}</Empty>
      ) : (
        <div className="space-y-3 text-sm">
          {summary.headline && <p className="font-medium">{summary.headline}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Score
              label={tr("admin.shell.aiSummary.complexity")}
              value={summary.complexity_score}
              caption={summary.complexity}
            />
            <Score label={tr("admin.shell.aiSummary.risk")} value={summary.risk_score} />
          </div>
          {summary.customer_requests?.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {tr("admin.shell.aiSummary.customerRequests")}
              </div>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {summary.customer_requests.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          <Block label={tr("admin.shell.aiSummary.pricingRecommendation")} text={summary.pricing_recommendation} />
          <Block
            label={tr("admin.shell.aiSummary.followUpRecommendation")}
            text={summary.follow_up_recommendation}
          />
          {at && (
            <p className="text-xs text-muted-foreground">
              {tr("admin.shell.aiSummary.generatedAt", { date: dateTime(at) })}
            </p>
          )}
        </div>
      )}
    </Section>
  );
}

function Score({ label, value, caption }: { label: string; value: number; caption?: string }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const tone = pct >= 70 ? "bg-rose-500" : pct >= 40 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-semibold">{pct}</span>
        {caption && <span className="text-xs capitalize text-muted-foreground">{caption}</span>}
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Block({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <p className="mt-1 whitespace-pre-wrap">{text}</p>
    </div>
  );
}
