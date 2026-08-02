import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

const GROUP_LABEL: Record<string, string> = {
  labor: "Labor",
  truck: "Truck",
  fuel: "Fuel surcharge",
  access: "Access (stairs / elevator / carry)",
  packing: "Packing & materials",
  specialty: "Specialty handling",
  storage: "Storage",
  shuttle: "Shuttle",
  discount: "Discounts",
};

function sumGroup(lines: Line[], group: string) {
  return lines.filter((l) => l.group === group).reduce((s, l) => s + Number(l.amount || 0), 0);
}

function matchLine(lines: Line[], re: RegExp) {
  return lines
    .filter((l) => re.test(l.label.toLowerCase()))
    .reduce((s, l) => s + Number(l.amount || 0), 0);
}

export function PricingSection({ q }: { q: LeadQuote }) {
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
        <Section title="Estimates">
          <Row
            label="AI / system estimate"
            value={`${money(q.estimated_low)} – ${money(q.estimated_high)}`}
          />
          <Row
            label="Broker estimate"
            value={
              current?.broker_estimate_low || current?.broker_estimate_high
                ? `${money(current?.broker_estimate_low)} – ${money(current?.broker_estimate_high)}`
                : null
            }
          />
          <Row label="Minimum" value={money(q.estimated_low)} />
          <Row label="Maximum" value={money(q.estimated_high)} />
          <Row label="Company estimate" value={money(current?.company_estimate ?? current?.amount)} />
          <Row
            label="Final quote"
            value={money(current?.final_accepted_price ?? q.final_accepted_price ?? q.final_price)}
          />
        </Section>

        <Section title="Cost components">
          <Row label="Fuel surcharge" value={money(fuel)} />
          <Row label="Packing" value={money(packing)} />
          <Row label="Materials" value={money(materials)} />
          <Row label="Storage" value={money(storage)} />
          <Row label="Shuttle" value={money(shuttle)} />
          <Row label="Long carry" value={money(longCarry)} />
          <Row label="Stairs" value={money(stairs)} />
          <Row label="Elevator" value={money(elevator)} />
          <Row label="Discounts" value={discounts ? money(discounts) : "—"} />
        </Section>
      </div>

      <Section title="Full breakdown">
        {lines.length === 0 ? (
          <Empty>No pricing breakdown stored on this lead.</Empty>
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
        <Section title="Estimate revisions">
          <ul className="text-sm">
            {revs.map((r) => (
              <li key={r.id} className="flex justify-between border-b border-border py-1.5 last:border-0">
                <span>
                  Rev {r.revision} · <span className="capitalize">{r.status ?? "draft"}</span>
                  {r.is_current && <span className="ml-2 text-xs text-emerald-700">current</span>}
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
