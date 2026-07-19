import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Easy Moving" }] }),
  component: AdminPage,
});

const STATUSES = ["new", "contacted", "scheduled", "won", "lost", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_STYLES: Record<Status, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-300",
  contacted: "bg-amber-100 text-amber-800 border-amber-300",
  scheduled: "bg-purple-100 text-purple-800 border-purple-300",
  won: "bg-emerald-100 text-emerald-800 border-emerald-300",
  lost: "bg-rose-100 text-rose-800 border-rose-300",
  cancelled: "bg-neutral-200 text-neutral-700 border-neutral-300",
};

const PAGE_SIZE = 20;

type QuoteRow = {
  id: string;
  created_at: string;
  contact_phone: string | null;
  contact_email: string | null;
  origin_city: string | null;
  destination_city: string | null;
  origin_zip: string;
  destination_zip: string;
  estimated_low: number;
  estimated_high: number;
  status: string;
  details: Record<string, unknown> | null;
  [key: string]: unknown;
};

function getCustomerName(q: QuoteRow): string {
  const d = q.details as { fullName?: string } | null;
  return d?.fullName?.trim() || "—";
}

function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [selected, setSelected] = useState<QuoteRow | null>(null);

  // Auth check
  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) { setIsAdmin(false); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.user.id);
      setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
    })();
  }, []);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    let q = supabase
      .from("quotes")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00`);
    if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);
    if (customerName.trim()) {
      q = q.ilike("details->>fullName", `%${customerName.trim()}%`);
    }
    if (search.trim()) {
      const s = search.trim();
      // Search phone / email / id
      q = q.or(
        `contact_phone.ilike.%${s}%,contact_email.ilike.%${s}%,id.eq.${isUuid(s) ? s : "00000000-0000-0000-0000-000000000000"}`
      );
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    q = q.range(from, to);

    const { data, count, error } = await q;
    if (error) {
      toast.error(error.message);
    } else {
      setRows((data as QuoteRow[]) ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [isAdmin, statusFilter, dateFrom, dateTo, customerName, search, page]);

  useEffect(() => { void load(); }, [load]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [statusFilter, dateFrom, dateTo, customerName, search]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status updated to ${status}`);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (selected?.id === id) setSelected({ ...selected, status });
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (isAdmin === null) {
    return <SiteLayout><div className="p-16 text-center text-muted-foreground">Loading…</div></SiteLayout>;
  }
  if (!isAdmin) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-serif text-4xl">Admin access required</h1>
          <p className="mt-4 text-muted-foreground">
            Your account doesn't have the admin role. Contact the site owner to be granted access.
          </p>
          <Link to="/dashboard" className="mt-6 inline-block text-primary hover:underline">← Back to dashboard</Link>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-ochre">Admin</span>
            <h1 className="mt-2 font-serif text-4xl font-medium">Quotes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {total.toLocaleString()} total {total === 1 ? "quote" : "quotes"}
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-5">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">From date</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">To date</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Customer name</label>
            <Input placeholder="e.g. Alex" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Search phone / email / ID</label>
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="mt-1" />
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote ID</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Estimate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((q) => (
                <TableRow key={q.id} className="cursor-pointer" onClick={() => setSelected(q)}>
                  <TableCell className="font-mono text-xs">{q.id.slice(0, 8)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(q.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>{getCustomerName(q)}</TableCell>
                  <TableCell>{q.contact_phone ?? "—"}</TableCell>
                  <TableCell>{q.contact_email ?? "—"}</TableCell>
                  <TableCell>{q.origin_city ?? q.origin_zip}</TableCell>
                  <TableCell>{q.destination_city ?? q.destination_zip}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    ${Number(q.estimated_low).toLocaleString()}–${Number(q.estimated_high).toLocaleString()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select value={q.status} onValueChange={(v) => void updateStatus(q.id, v)}>
                      <SelectTrigger className={`h-8 w-[130px] capitalize border ${STATUS_STYLES[q.status as Status] ?? ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => setSelected(q)}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={10} className="p-8 text-center text-muted-foreground">
                    No quotes match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page + 1} of {pageCount}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              ← Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>
              Next →
            </Button>
          </div>
        </div>

        <QuoteDetailDialog
          quote={selected}
          onClose={() => setSelected(null)}
          onStatusChange={updateStatus}
        />
      </section>
    </SiteLayout>
  );
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function QuoteDetailDialog({
  quote,
  onClose,
  onStatusChange,
}: {
  quote: QuoteRow | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void | Promise<void>;
}) {
  const entries = useMemo(() => {
    if (!quote) return [] as [string, unknown][];
    return Object.entries(quote).filter(([k]) => k !== "details" && k !== "breakdown" && k !== "inventory");
  }, [quote]);

  if (!quote) return null;
  const details = (quote.details as Record<string, unknown> | null) ?? {};
  const inventory = (quote as unknown as { inventory?: Array<{ id: string; quantity: number }> }).inventory ?? [];
  const breakdown = (quote as unknown as { breakdown?: Array<{ label: string; amount: number }> }).breakdown ?? [];

  return (
    <Dialog open={!!quote} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Quote <span className="font-mono text-sm text-muted-foreground">{quote.id}</span>
            <Badge variant="outline" className={`capitalize ${STATUS_STYLES[quote.status as Status] ?? ""}`}>
              {quote.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Change status:</span>
          <Select value={quote.status} onValueChange={(v) => void onStatusChange(quote.id, v)}>
            <SelectTrigger className="w-[160px] capitalize"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Section title="Customer">
            <Field label="Name" value={getCustomerName(quote)} />
            <Field label="Email" value={quote.contact_email} />
            <Field label="Phone" value={quote.contact_phone} />
            <Field label="Contact method" value={details.contactMethod as string} />
            <Field label="Best time to contact" value={details.contactTime as string} />
          </Section>
          <Section title="Move">
            <Field label="Move date" value={(quote as unknown as { move_date?: string }).move_date} />
            <Field label="Preferred time" value={(quote as unknown as { preferred_time?: string }).preferred_time} />
            <Field label="Property type" value={(quote as unknown as { property_type?: string }).property_type} />
            <Field label="Move type" value={(quote as unknown as { move_type?: string }).move_type} />
            <Field label="Distance (mi)" value={(quote as unknown as { distance_miles?: number }).distance_miles} />
          </Section>
          <Section title="Origin">
            <Field label="ZIP" value={quote.origin_zip} />
            <Field label="City" value={quote.origin_city} />
            <Field label="State" value={(quote as unknown as { origin_state?: string }).origin_state} />
            <Field label="Address" value={(quote as unknown as { origin_address?: string }).origin_address} />
            <Field label="Street" value={details.originStreet as string} />
            <Field label="House #" value={details.originHouseNumber as string} />
          </Section>
          <Section title="Destination">
            <Field label="ZIP" value={quote.destination_zip} />
            <Field label="City" value={quote.destination_city} />
            <Field label="State" value={(quote as unknown as { destination_state?: string }).destination_state} />
            <Field label="Address" value={(quote as unknown as { destination_address?: string }).destination_address} />
            <Field label="Street" value={details.destinationStreet as string} />
            <Field label="House #" value={details.destinationHouseNumber as string} />
          </Section>
          <Section title="Estimate">
            <Field label="Low" value={`$${Number(quote.estimated_low).toLocaleString()}`} />
            <Field label="High" value={`$${Number(quote.estimated_high).toLocaleString()}`} />
            <Field
              label="Cubic feet"
              value={(quote as unknown as { estimated_cubic_feet?: number }).estimated_cubic_feet}
            />
            <Field
              label="Weight (lbs)"
              value={(quote as unknown as { estimated_weight_lbs?: number }).estimated_weight_lbs}
            />
            <Field label="Truck" value={(quote as unknown as { truck_size?: string }).truck_size} />
            <Field label="Movers" value={(quote as unknown as { num_movers?: number }).num_movers} />
            <Field label="Labor hours" value={(quote as unknown as { labor_hours?: number }).labor_hours} />
            <Field label="Insurance" value={(quote as unknown as { insurance_tier?: string }).insurance_tier} />
          </Section>
          <Section title="Services & Access">
            <Field label="Packing" value={fmtBool(quote.packing)} />
            <Field label="Unpacking" value={fmtBool((quote as unknown as { unpacking?: boolean }).unpacking)} />
            <Field label="Storage" value={fmtBool(quote.storage)} />
            <Field label="Assembly" value={fmtBool(quote.assembly)} />
            <Field label="Junk removal" value={fmtBool((quote as unknown as { junk_removal?: boolean }).junk_removal)} />
            <Field label="Piano" value={fmtBool((quote as unknown as { piano?: boolean }).piano)} />
            <Field label="Safe" value={fmtBool((quote as unknown as { safe?: boolean }).safe)} />
            <Field label="Appliances" value={fmtBool((quote as unknown as { appliances?: boolean }).appliances)} />
            <Field label="Fragile" value={fmtBool((quote as unknown as { fragile_items?: boolean }).fragile_items)} />
            <Field label="Origin floor" value={(quote as unknown as { origin_stairs?: number }).origin_stairs} />
            <Field label="Dest floor" value={(quote as unknown as { destination_stairs?: number }).destination_stairs} />
            <Field label="Origin elevator" value={fmtBool((quote as unknown as { origin_elevator?: boolean }).origin_elevator)} />
            <Field label="Dest elevator" value={fmtBool((quote as unknown as { destination_elevator?: boolean }).destination_elevator)} />
            <Field label="Origin long carry" value={fmtBool((quote as unknown as { origin_long_carry?: boolean }).origin_long_carry)} />
            <Field label="Dest long carry" value={fmtBool((quote as unknown as { destination_long_carry?: boolean }).destination_long_carry)} />
          </Section>
        </div>

        {inventory.length > 0 && (
          <Section title={`Inventory (${inventory.length} items)`}>
            <ul className="text-sm grid grid-cols-2 md:grid-cols-3 gap-1">
              {inventory.map((it, i) => (
                <li key={i} className="text-muted-foreground">
                  <span className="text-foreground font-medium">{it.quantity}×</span> {it.id}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {(quote as unknown as { inventory_notes?: string }).inventory_notes && (
          <Section title="Additional information">
            <p className="text-sm whitespace-pre-wrap">
              {(quote as unknown as { inventory_notes?: string }).inventory_notes}
            </p>
          </Section>
        )}

        {breakdown.length > 0 && (
          <Section title="Price breakdown">
            <ul className="text-sm">
              {breakdown.map((b, i) => (
                <li key={i} className="flex justify-between border-b border-border py-1">
                  <span>{b.label}</span>
                  <span className="font-mono">${Number(b.amount).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground">Raw record</summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
            {JSON.stringify({ ...quote, details, inventory, breakdown }, null, 2)}
          </pre>
        </details>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : typeof value === "boolean"
      ? value ? "Yes" : "No"
      : String(value);
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{display}</span>
    </div>
  );
}

function fmtBool(v: unknown) {
  return v === true ? "Yes" : v === false ? "No" : "—";
}
