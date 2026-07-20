import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CompanyHeader, LeadDetailDialog, NoCompanyScreen, useMoverPortal, type MergedLead,
} from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Search, Phone, Mail, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/customers")({
  head: () => ({ meta: [{ title: "Customers — Company Portal" }] }),
  component: CustomersPage,
});

type Customer = {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  cities: string[];
  moves: MergedLead[];
  lifetimeValue: number;
  lastMove: string | null;
};

function CustomersPage() {
  const { loading, company, merged, reload, canClaim } = useMoverPortal();
  const [q, setQ] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [openLead, setOpenLead] = useState<MergedLead | null>(null);

  const customers = useMemo<Customer[]>(() => {
    const map = new Map<string, Customer>();
    for (const r of merged) {
      if (!r.assignment) continue;
      const l = r.lead;
      const key = (l.contact_email || l.contact_phone || l.full_name || l.id).toLowerCase();
      let c = map.get(key);
      if (!c) {
        c = {
          key,
          name: l.full_name ?? "Customer (contact hidden)",
          phone: l.contact_phone,
          email: l.contact_email,
          cities: [],
          moves: [],
          lifetimeValue: 0,
          lastMove: null,
        };
        map.set(key, c);
      }
      c.moves.push(r);
      const city = l.origin_city ?? l.origin_zip;
      if (city && !c.cities.includes(city)) c.cities.push(city);
      if (r.assignment.state === "won" || r.assignment.state === "accepted") {
        c.lifetimeValue += Number(r.assignment.quoted_amount ?? l.estimated_high);
      }
      const when = l.move_date ?? l.created_at;
      if (!c.lastMove || new Date(when) > new Date(c.lastMove)) c.lastMove = when;
      if (!c.phone && l.contact_phone) c.phone = l.contact_phone;
      if (!c.email && l.contact_email) c.email = l.contact_email;
      if (c.name.startsWith("Customer") && l.full_name) c.name = l.full_name;
    }
    return [...map.values()].sort((a, b) => (b.lastMove ?? "").localeCompare(a.lastMove ?? ""));
  }, [merged]);

  const filtered = useMemo(() => {
    if (!q.trim()) return customers;
    const n = q.toLowerCase();
    return customers.filter((c) =>
      c.name.toLowerCase().includes(n) ||
      (c.email ?? "").toLowerCase().includes(n) ||
      (c.phone ?? "").includes(n) ||
      c.cities.join(" ").toLowerCase().includes(n),
    );
  }, [customers, q]);

  const selected = selectedKey ? customers.find((c) => c.key === selectedKey) ?? null : null;

  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="card-premium p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-xl">Customers</h2>
            <span className="text-sm text-muted-foreground">({customers.length})</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, email, phone, city…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
                No customers match.
              </div>
            )}
            {filtered.map((c) => (
              <button
                key={c.key}
                onClick={() => setSelectedKey(c.key)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedKey === c.key ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.email ?? c.phone ?? "—"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold">${c.lifetimeValue.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">{c.moves.length} move{c.moves.length === 1 ? "" : "s"}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card-premium p-5">
          {!selected ? (
            <div className="grid place-items-center h-full min-h-[300px] text-sm text-muted-foreground">
              Select a customer to view their profile, previous moves, and notes.
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="font-serif text-2xl">{selected.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {selected.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{selected.phone}</span>}
                  {selected.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{selected.email}</span>}
                  {selected.cities.length > 0 && (
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{selected.cities.join(", ")}</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.phone && <Button size="sm" variant="outline" asChild><a href={`tel:${selected.phone}`}><Phone className="mr-1.5 h-4 w-4" />Call</a></Button>}
                  {selected.email && <Button size="sm" variant="outline" asChild><a href={`mailto:${selected.email}`}><Mail className="mr-1.5 h-4 w-4" />Email</a></Button>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Lifetime value</div>
                  <div className="font-serif text-xl">${selected.lifetimeValue.toLocaleString()}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Total moves</div>
                  <div className="font-serif text-xl">{selected.moves.length}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Last activity</div>
                  <div className="font-serif text-xl">{selected.lastMove ? new Date(selected.lastMove).toLocaleDateString() : "—"}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Timeline</div>
                <div className="space-y-2">
                  {selected.moves.map((r) => {
                    const a = r.assignment!;
                    return (
                      <button
                        key={r.lead.id}
                        onClick={() => setOpenLead(r)}
                        className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs text-muted-foreground">{r.lead.quote_number ?? r.lead.id.slice(0, 8)}</span>
                              <Badge variant="outline" className="capitalize">{a.state}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {(r.lead.origin_city ?? r.lead.origin_zip)} → {(r.lead.destination_city ?? r.lead.destination_zip)} · {r.lead.move_date ?? "TBD"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-serif text-lg">
                              ${Number(a.quoted_amount ?? r.lead.estimated_high).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {openLead && (
        <LeadDetailDialog
          merged={openLead}
          onClose={() => setOpenLead(null)}
          onReload={reload}
          onEstimate={() => {}}
          canClaim={canClaim}
        />
      )}
    </div>
  );
}
