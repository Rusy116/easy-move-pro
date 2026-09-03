import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/i18n";
import { Section, Row, money, Empty, type LeadQuote } from "./shared";

type Rev = {
  id: string;
  revision: number;
  amount: number | null;
  company_estimate: number | null;
  final_accepted_price: number | null;
  broker_estimate_low: number | null;
  broker_estimate_high: number | null;
  status: string | null;
  is_current: boolean | null;
  created_at?: string;
  submitted_at: string | null;
};

type Line = { label: string; amount: number; group?: string };

function sumGroup(lines: Line[], group: string) {
  return lines.filter((l) => l.group === group).reduce((s, l) => s + Number(l.amount || 0), 0);
}

function matchLine(lines: Line[], re: RegExp) {
  return lines
    .filter((l) => re.test(l.label.toLowerCase()))
    .reduce((s, l) => s + Number(l.amount || 0), 0);
}

export function PricingSection({ q }: { q: LeadQuote }) {
  const tr = useT();
  const GROUP_LABEL: Record<string, string> = {
    labor: tr("admin.shell.leadPricing.group.labor"),
    truck: tr("admin.shell.leadPricing.group.truck"),
    fuel: tr("admin.shell.leadPricing.group.fuel"),
    access: tr("admin.shell.leadPricing.group.access"),
    packing: tr("admin.shell.leadPricing.group.packing"),
    specialty: tr("admin.shell.leadPricing.group.specialty"),
    storage: tr("admin.shell.leadPricing.group.storage"),
    shuttle: tr("admin.shell.leadPricing.group.shuttle"),
    discount: tr("admin.shell.leadPricing.group.discount"),
  };
  const lines = (Array.isArray(q.breakdown) ? q.breakdown : []) as Line[];
  const [revs, setRevs] = useState<Rev[]>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("estimate_revisions")
        .select("*")
        .eq("quote_id", q.id)
        .order("revision", { ascending: false });
      setRevs((data as unknown as Rev[]) ?? []);
    })();
  }, [q.id]);

  const current = revs.find((r) => r.is_current) ?? revs[0] ?? null;
  const fuel = sumGroup(lines, "fuel");
  const packing = matchLine(lines, /packing(?!\s*materials)/);
  const materials = matchLine(lines, /materials/);
  const storage = sumGroup(lines, "storage") || matchLine(lines, /storage/);
  const shuttle = sumGroup(lines, "shuttle") || matchLine(lines, /shuttle/);
  const longCarry = matchLine(lines, /carry/);
  const stairs = matchLine(lines, /stair|floor/);
  const elevator = matchLine(lines, /elevator/);
  const discounts = lines
    .filter((l) => Number(l.amount) < 0 || /discount/i.test(l.label))
    .reduce((s, l) => s + Number(l.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Section title={tr("admin.shell.leadPricing.estimates")}>
          <Row
            label={tr("admin.shell.leadPricing.aiEstimate")}
            value={`${money(q.estimated_low)} – ${money(q.estimated_high)}`}
          />
          <Row
            label={tr("admin.shell.leadPricing.brokerEstimate")}
            value={
              current?.broker_estimate_low || current?.broker_estimate_high
                ? `${money(current?.broker_estimate_low)} – ${money(current?.broker_estimate_high)}`
                : null
            }
          />
          <Row label={tr("admin.shell.leadPricing.minimum")} value={money(q.estimated_low)} />
          <Row label={tr("admin.shell.leadPricing.maximum")} value={money(q.estimated_high)} />
          <Row label={tr("admin.shell.leadPricing.companyEstimate")} value={money(current?.company_estimate ?? current?.amount)} />
          <Row
            label={tr("admin.shell.leadPricing.finalQuote")}
            value={money(current?.final_accepted_price ?? q.final_accepted_price ?? q.final_price)}
          />
        </Section>

        <Section title={tr("admin.shell.leadPricing.costComponents")}>
          <Row label={tr("admin.shell.leadPricing.group.fuel")} value={money(fuel)} />
          <Row label={tr("admin.shell.leadPricing.group.packing")} value={money(packing)} />
          <Row label={tr("admin.shell.leadPricing.materials")} value={money(materials)} />
          <Row label={tr("admin.shell.leadPricing.group.storage")} value={money(storage)} />
          <Row label={tr("admin.shell.leadPricing.group.shuttle")} value={money(shuttle)} />
          <Row label={tr("admin.shell.leadPricing.longCarry")} value={money(longCarry)} />
          <Row label={tr("admin.shell.leadPricing.stairs")} value={money(stairs)} />
          <Row label={tr("admin.shell.leadPricing.elevator")} value={money(elevator)} />
          <Row label={tr("admin.shell.leadPricing.discounts")} value={discounts ? money(discounts) : "—"} />
        </Section>
      </div>

      <Section title={tr("admin.shell.leadPricing.fullBreakdown")}>
        {lines.length === 0 ? (
          <Empty>{tr("admin.shell.leadPricing.noBreakdown")}</Empty>
        ) : (
          <ul className="text-sm">
            {lines.map((l, i) => (
              <li key={i} className="flex justify-between border-b border-border py-1.5 last:border-0">
                <span>
                  {l.label}
                  {l.group && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {GROUP_LABEL[l.group] ?? l.group}
                    </span>
                  )}
                </span>
                <span className="font-mono">${Number(l.amount).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {revs.length > 0 && (
        <Section title={tr("admin.shell.leadPricing.estimateRevisions")}>
          <ul className="text-sm">
            {revs.map((r) => (
              <li key={r.id} className="flex justify-between border-b border-border py-1.5 last:border-0">
                <span>
                  {tr("admin.shell.leadPricing.revision", { number: r.revision })} ·{" "}
                  <span className="capitalize">{r.status ?? tr("admin.shell.leadPricing.draft")}</span>
                  {r.is_current && (
                    <span className="ml-2 text-xs text-emerald-700">{tr("admin.shell.leadPricing.current")}</span>
                  )}
                </span>
                <span className="font-mono">{money(r.amount)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
