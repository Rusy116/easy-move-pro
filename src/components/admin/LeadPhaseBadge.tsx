import { Badge } from "@/components/ui/badge";
import { Lock, Globe, XCircle, Circle } from "lucide-react";
import { useT } from "@/i18n";

export type LeadPhase = "unassigned" | "exclusive" | "open_market" | "closed";

const STYLES: Record<LeadPhase, string> = {
  unassigned: "bg-slate-100 text-slate-700 border-slate-300",
  exclusive: "bg-indigo-100 text-indigo-800 border-indigo-300",
  open_market: "bg-amber-100 text-amber-900 border-amber-300",
  closed: "bg-neutral-200 text-neutral-700 border-neutral-300",
};

export function LeadPhaseBadge({ phase }: { phase: string | null | undefined }) {
  const t = useT();
  const p = (phase ?? "unassigned") as LeadPhase;
  const Icon =
    p === "exclusive" ? Lock : p === "open_market" ? Globe : p === "closed" ? XCircle : Circle;
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 ${STYLES[p] ?? STYLES.unassigned}`}
    >
      <Icon className="h-3 w-3" />
      {t(`admin.shell.leadPhase.${p}`)}
    </Badge>
  );
}
