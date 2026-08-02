import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, RefreshCw, Search } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeader, SkeletonRows } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AccountDirectory } from "@/components/admin/AccountDirectory";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Easy Moving admin" },
      {
        name: "description",
        content:
          "Customer database and move history: every requested quote, assigned company, booked job and lifetime value.",
      },
    ],
  }),
  component: AdminCustomersPage,
});

type QuoteLite = {
  id: string;
  quote_number: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  details: Record<string, unknown> | null;
  status: string;
  job_status: string;
  lead_phase: string;
  created_at: string;
  move_date: string | null;
  origin_city: string | null;
  origin_state: string | null;
  destination_city: string | null;
  destination_state: string | null;
  final_accepted_price: number | null;
  final_price: number | null;
  estimated_high: number | null;
};

type CustomerAgg = {
  key: string;
  name: string;
  email: string;
  phone: string;
  quotes: QuoteLite[];
  booked: number;
  value: number;
  last: string;
};

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const dt = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-US", { dateStyle: "medium" }) : "—";

function AdminCustomersPage() {
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<QuoteLite[]>([]);
  const [search, setSearch] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select(
          "id,quote_number,contact_email,contact_phone,details,status,job_status,lead_phase,created_at,move_date,origin_city,origin_state,destination_city,destination_state,final_accepted_price,final_price,estimated_high",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      setQuotes((data ?? []) as unknown as QuoteLite[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const customers = useMemo<CustomerAgg[]>(() => {
    const map = new Map<string, CustomerAgg>();
    for (const q of quotes) {
      const details = (q.details ?? {}) as Record<string, unknown>;
      const email = (q.contact_email ?? (details.email as string) ?? "").toLowerCase();
      const phone = q.contact_phone ?? (details.phone as string) ?? "";
      const name =
        (details.full_name as string) ||
        (details.fullName as string) ||
        (details.name as string) ||
        email ||
        phone ||
        "Unnamed customer";
      const key = email || phone || q.id;
      const agg =
        map.get(key) ??
        ({ key, name, email, phone, quotes: [], booked: 0, value: 0, last: q.created_at } as CustomerAgg);
      agg.quotes.push(q);
      const price = q.final_accepted_price ?? q.final_price ?? 0;
      if (price) {
        agg.booked += 1;
        agg.value += price;
      }
      if (new Date(q.created_at) > new Date(agg.last)) agg.last = q.created_at;
      map.set(key, agg);
    }
    const s = search.trim().toLowerCase();
    return [...map.values()]
      .filter(
        (c) =>
          !s ||
          c.name.toLowerCase().includes(s) ||
          c.email.includes(s) ||
          c.phone.toLowerCase().includes(s),
      )
      .sort((a, b) => +new Date(b.last) - +new Date(a.last));
  }, [quotes, search]);

  return (
    <AdminShell>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 md:py-12">
        <PageHeader
          eyebrow="Demand side"
          title="Customers"
          subtitle="Customer database with full quote and move history across the platform."
          icon={<Users className="h-5 w-5" />}
          actions={
            <Button variant="outline" size="sm" className="rounded-full" onClick={load}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
            </Button>
          }
        />

        <div className="mt-6 relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email or phone…"
            className="h-9 rounded-full pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <SkeletonRows n={4} />
          ) : customers.length === 0 ? (
            <div className="card-premium p-12 text-center text-sm text-muted-foreground">
              No customers yet.
            </div>
          ) : (
            customers.map((c) => (
              <article key={c.key} className="card-premium overflow-hidden">
                <button
                  className="flex w-full flex-wrap items-center gap-4 p-4 text-left md:p-5"
                  onClick={() => setOpenKey(openKey === c.key ? null : c.key)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      <Badge variant="outline">{c.quotes.length} quotes</Badge>
                      {c.booked > 0 && (
                        <Badge className="border border-emerald-600/30 bg-emerald-500/10 text-emerald-700">
                          {c.booked} booked
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">
                      {c.email || "no email"}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold">{money(c.value)}</div>
                    <div className="text-xs text-muted-foreground">Last {dt(c.last)}</div>
                  </div>
                </button>

                {openKey === c.key && (
                  <div className="border-t border-border bg-muted/30 p-4 md:p-5">
                    <ul className="space-y-2 text-sm">
                      {c.quotes.map((q) => (
                        <li
                          key={q.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
                        >
                          <span className="font-mono text-xs font-semibold">
                            {q.quote_number ?? q.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="text-muted-foreground">
                            {q.origin_city ?? "—"} → {q.destination_city ?? "—"} · move{" "}
                            {dt(q.move_date)}
                          </span>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {(q.job_status ?? q.status).replace(/_/g, " ")}
                            </Badge>
                            <span className="font-medium">
                              {money(
                                q.final_accepted_price ?? q.final_price ?? q.estimated_high ?? 0,
                              )}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        <h2 className="mt-12 font-serif text-2xl">Customer accounts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Registered customer logins on the platform.
        </p>
        <div className="mt-4">
          <AccountDirectory defaultRole="customer" />
        </div>
      </section>
    </AdminShell>
  );
}
