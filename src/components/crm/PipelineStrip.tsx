import { Badge } from "@/components/ui/badge";
import {
  PIPELINE_STAGES,
  STAGE_TONE,
  stageIndex,
  stageLabel,
  stageOf,
  outcomeOf,
  type PipelineQuote,
} from "@/lib/crm-pipeline";

/** Compact stage badge used in lists. */
export function StageBadge({ quote }: { quote: PipelineQuote }) {
  const stage = stageOf(quote);
  return (
    <Badge variant="outline" className={`rounded-full ${STAGE_TONE[stage]}`}>
      {stageLabel(stage)}
    </Badge>
  );
}

/** Full 10-step pipeline strip. Read-only — stages advance from role actions. */
export function PipelineStrip({
  quote,
  note,
}: {
  quote: PipelineQuote;
  note?: string;
}) {
  const stage = stageOf(quote);
  const current = stageIndex(stage);
  const outcome = outcomeOf(quote);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PIPELINE_STAGES.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <span
              key={s.stage}
              className={[
                "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                active
                  ? STAGE_TONE[s.stage]
                  : done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-border/60 bg-muted/40 text-muted-foreground",
              ].join(" ")}
            >
              {s.label}
            </span>
          );
        })}
        {outcome === "cancelled" && (
          <span className={`rounded-full border px-2.5 py-1 text-[11px] ${STAGE_TONE.cancelled}`}>
            Cancelled
          </span>
        )}
        {outcome === "lost" && (
          <span className={`rounded-full border px-2.5 py-1 text-[11px] ${STAGE_TONE.lost}`}>
            Lost
          </span>
        )}
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
