import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Phone, Mail, Clock, StickyNote, RefreshCw, Bell, CheckCircle2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  quote_number: string | null;
  portal_token: string | null;
  accepted_at: string | null;
  details: Record<string, unknown> | null;
  [key: string]: unknown;
};

type Note = {
  id: string;
  quote_id: string;
  body: string;
  author_email: string | null;
  created_at: string;
};

type HistoryEntry = {
  id: string;
  quote_id: string;
  from_status: string | null;
  to_status: string;
  changed_by_email: string | null;
  created_at: string;
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
      q = q.or(
        `contact_phone.ilike.%${s}%,contact_email.ilike.%${s}%,id.eq.${isUuid(s) ? s : "00000000-0000-0000-0000-000000000000"}`
      );
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    q = q.range(from, to);

    const { data, count, error } = await q;
    if (error) toast.error(error.message);
    else {
      setRows((data as QuoteRow[]) ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [isAdmin, statusFilter, dateFrom, dateTo, customerName, search, page]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(0); }, [statusFilter, dateFrom, dateTo, customerName, search]);

  // Realtime: new quotes and status updates appear instantly
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-quotes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "quotes" },
        (payload) => {
          const q = payload.new as QuoteRow;
          setRows((prev) => [q, ...prev].slice(0, PAGE_SIZE));
          setTotal((t) => t + 1);
          toast.success(`New quote from ${getCustomerName(q)}`);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quotes" },
        (payload) => {
          const q = payload.new as QuoteRow;
          setRows((prev) => prev.map((r) => (r.id === q.id ? q : r)));
          setSelected((cur) => (cur?.id === q.id ? q : cur));
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [isAdmin]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status → ${status}`);
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
            Your account doesn't have the admin role.
          </p>
          <Link to="/dashboard" className="mt-6 inline-block text-primary hover:underline">← Back to dashboard</Link>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8 md:py-12">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-ochre">Admin CRM</span>
            <h1 className="mt-2 font-serif text-3xl md:text-4xl font-medium">Quotes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {total.toLocaleString()} total · live updates on
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Status">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="From date">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </Field>
          <Field label="To date">
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </Field>
          <Field label="Customer name">
            <Input placeholder="e.g. Alex" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </Field>
          <Field label="Phone / email / ID">
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
        </div>

        {/* Desktop table */}
        <div className="mt-6 hidden md:block overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Estimate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((q) => (
                <TableRow key={q.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(q)}>
                  <TableCell className="font-mono text-xs">{q.quote_number ?? q.id.slice(0, 8)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(q.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">{getCustomerName(q)}</TableCell>
                  <TableCell>{q.contact_phone ?? "—"}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{q.contact_email ?? "—"}</TableCell>
                  <TableCell>{q.origin_city ?? q.origin_zip}</TableCell>
                  <TableCell>{q.destination_city ?? q.destination_zip}</TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    ${Number(q.estimated_low).toLocaleString()}–${Number(q.estimated_high).toLocaleString()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select value={q.status} onValueChange={(v) => void updateStatus(q.id, v)}>
                      <SelectTrigger className={`h-8 w-[130px] capitalize border ${STATUS_STYLES[q.status as Status] ?? ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !loading && (
                <TableRow><TableCell colSpan={9} className="p-8 text-center text-muted-foreground">No quotes.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="mt-6 grid gap-3 md:hidden">
          {rows.map((q) => (
            <button
              key={q.id}
              onClick={() => setSelected(q)}
              className="text-left rounded-2xl border border-border bg-card p-4 active:scale-[0.99] transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{getCustomerName(q)}</div>
                <Badge variant="outline" className={`capitalize ${STATUS_STYLES[q.status as Status] ?? ""}`}>{q.status}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {new Date(q.created_at).toLocaleString()}
              </div>
              <div className="mt-2 text-sm">
                {(q.origin_city ?? q.origin_zip)} → {(q.destination_city ?? q.destination_zip)}
              </div>
              <div className="mt-1 text-sm font-medium">
                ${Number(q.estimated_low).toLocaleString()}–${Number(q.estimated_high).toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">{q.contact_phone} · {q.contact_email}</div>
            </button>
          ))}
          {rows.length === 0 && !loading && (
            <div className="p-8 text-center text-muted-foreground rounded-2xl border border-border">No quotes.</div>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Page {page + 1} of {pageCount}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Prev</Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>Next →</Button>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
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
  const [notes, setNotes] = useState<Note[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!quote) return;
    void (async () => {
      const [{ data: n }, { data: h }] = await Promise.all([
        supabase.from("quote_notes").select("*").eq("quote_id", quote.id).order("created_at", { ascending: false }),
        supabase.from("quote_status_history").select("*").eq("quote_id", quote.id).order("created_at", { ascending: false }),
      ]);
      setNotes((n as Note[]) ?? []);
      setHistory((h as HistoryEntry[]) ?? []);
    })();

    // Realtime for open quote
    const channel = supabase
      .channel(`quote-${quote.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quote_notes", filter: `quote_id=eq.${quote.id}` },
        (p) => setNotes((prev) => [p.new as Note, ...prev]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quote_status_history", filter: `quote_id=eq.${quote.id}` },
        (p) => setHistory((prev) => [p.new as HistoryEntry, ...prev]))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [quote?.id]);

  const breakdown = useMemo(() => {
    if (!quote) return [] as Array<{ label: string; amount: number }>;
    return ((quote as unknown as { breakdown?: Array<{ label: string; amount: number }> }).breakdown ?? []);
  }, [quote]);

  if (!quote) return null;
  const details = (quote.details as Record<string, unknown> | null) ?? {};
  const inventory = (quote as unknown as { inventory?: Array<{ id: string; quantity: number }> }).inventory ?? [];

  async function addNote() {
    if (!quote || !newNote.trim()) return;
    setSavingNote(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("quote_notes").insert({
      quote_id: quote.id,
      body: newNote.trim(),
      author_id: userData.user?.id ?? null,
      author_email: userData.user?.email ?? null,
    });
    setSavingNote(false);
    if (error) { toast.error(error.message); return; }
    setNewNote("");
    toast.success("Note added");
  }

  const phone = quote.contact_phone ?? "";
  const email = quote.contact_email ?? "";

  return (
    <Dialog open={!!quote} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span>{getCustomerName(quote)}</span>
            <span className="font-mono text-xs text-muted-foreground">{quote.quote_number ?? quote.id.slice(0, 8)}</span>
            <Badge variant="outline" className={`capitalize ${STATUS_STYLES[quote.status as Status] ?? ""}`}>
              {quote.status}
            </Badge>
            {quote.accepted_at && (
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-600/30">Accepted</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" disabled={!phone}>
            <a href={phone ? `tel:${phone}` : undefined}><Phone className="mr-2 h-4 w-4" />Call</a>
          </Button>
          <Button asChild size="sm" variant="outline" disabled={!email}>
            <a href={email ? `mailto:${email}?subject=Your%20Easy%20Moving%20Quote%20${quote.quote_number ?? quote.id.slice(0,8)}` : undefined}>
              <Mail className="mr-2 h-4 w-4" />Email
            </a>
          </Button>
          {quote.quote_number && quote.portal_token && (
            <Button asChild size="sm" variant="outline">
              <a href={`/portal/${quote.quote_number}?token=${quote.portal_token}`} target="_blank" rel="noreferrer">
                Open Portal
              </a>
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={quote.status} onValueChange={(v) => void onStatusChange(quote.id, v)}>
              <SelectTrigger className="w-[160px] capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Estimate */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 p-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Estimated cost</div>
          <div className="mt-1 font-serif text-3xl font-medium">
            ${Number(quote.estimated_low).toLocaleString()} – ${Number(quote.estimated_high).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {(quote as unknown as { num_movers?: number }).num_movers} movers ·
            {" "}{(quote as unknown as { labor_hours?: number }).labor_hours}h ·
            {" "}{(quote as unknown as { truck_size?: string }).truck_size} truck ·
            {" "}{(quote as unknown as { distance_miles?: number }).distance_miles} mi
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Section title="Customer">
            <Row label="Name" value={getCustomerName(quote)} />
            <Row label="Email" value={email} />
            <Row label="Phone" value={phone} />
            <Row label="Contact method" value={details.contactMethod as string} />
            <Row label="Best time" value={details.contactTime as string} />
          </Section>
          <Section title="Move">
            <Row label="Date" value={(quote as unknown as { move_date?: string }).move_date} />
            <Row label="Time" value={(quote as unknown as { preferred_time?: string }).preferred_time} />
            <Row label="Property" value={(quote as unknown as { property_type?: string }).property_type} />
            <Row label="Type" value={(quote as unknown as { move_type?: string }).move_type} />
            <Row label="Insurance" value={(quote as unknown as { insurance_tier?: string }).insurance_tier} />
          </Section>
          <Section title="Origin">
            <Row label="ZIP" value={quote.origin_zip} />
            <Row label="City" value={quote.origin_city} />
            <Row label="Address" value={(quote as unknown as { origin_address?: string }).origin_address} />
            <Row label="Floor" value={(quote as unknown as { origin_stairs?: number }).origin_stairs} />
            <Row label="Elevator" value={fmtBool((quote as unknown as { origin_elevator?: boolean }).origin_elevator)} />
          </Section>
          <Section title="Destination">
            <Row label="ZIP" value={quote.destination_zip} />
            <Row label="City" value={quote.destination_city} />
            <Row label="Address" value={(quote as unknown as { destination_address?: string }).destination_address} />
            <Row label="Floor" value={(quote as unknown as { destination_stairs?: number }).destination_stairs} />
            <Row label="Elevator" value={fmtBool((quote as unknown as { destination_elevator?: boolean }).destination_elevator)} />
          </Section>
        </div>

        {breakdown.length > 0 && (
          <Section title="Price breakdown">
            <ul className="text-sm">
              {breakdown.map((b, i) => (
                <li key={i} className="flex justify-between border-b border-border py-1.5">
                  <span>{b.label}</span>
                  <span className="font-mono">${Number(b.amount).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {inventory.length > 0 && (
          <Section title={`Inventory (${inventory.length})`}>
            <ul className="text-sm grid grid-cols-2 md:grid-cols-3 gap-1">
              {inventory.map((it, i) => (
                <li key={i} className="text-muted-foreground">
                  <span className="text-foreground font-medium">{it.quantity}×</span> {it.id}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Notes */}
        <Section title={<><StickyNote className="inline h-4 w-4 mr-1" />Notes ({notes.length})</>}>
          <div className="space-y-2">
            <Textarea
              placeholder="Add a note about this quote…"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={2}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={addNote} disabled={savingNote || !newNote.trim()}>
                {savingNote ? "Saving…" : "Add note"}
              </Button>
            </div>
            <div className="space-y-2 mt-2">
              {notes.map((n) => (
                <div key={n.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>{n.author_email ?? "admin"}</span>
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              )}
            </div>
          </div>
        </Section>

        {/* Timeline */}
        <Section title={<><Clock className="inline h-4 w-4 mr-1" />Status timeline</>}>
          <ol className="relative border-l border-border ml-2 space-y-3">
            {history.map((h) => (
              <li key={h.id} className="ml-4">
                <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary border border-background" />
                <div className="text-sm">
                  <span className="capitalize font-medium">{h.to_status}</span>
                  {h.from_status && <span className="text-muted-foreground"> ← {h.from_status}</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleString()}
                  {h.changed_by_email && ` · ${h.changed_by_email}`}
                </div>
              </li>
            ))}
            {history.length === 0 && (
              <li className="ml-4 text-sm text-muted-foreground">No changes recorded.</li>
            )}
          </ol>
        </Section>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: unknown }) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : typeof value === "boolean" ? (value ? "Yes" : "No")
      : String(value);
  return (
    <div className="flex justify-between gap-4 text-sm py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{display}</span>
    </div>
  );
}

function fmtBool(v: unknown) {
  return v === true ? "Yes" : v === false ? "No" : "—";
}

type AdminNotification = {
  id: string;
  type: string;
  quote_id: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
};

function NotificationsBell() {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data ?? []) as AdminNotification[]);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin_notifications_stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => {
          const row = payload.new as AdminNotification;
          setItems((prev) => [row, ...prev].slice(0, 20));
          toast.success(row.message);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [load]);

  const unread = items.filter((n) => !n.read_at).length;

  async function markAllRead() {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase
      .from("admin_notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold text-white">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="text-sm font-semibold">Notifications</div>
          {unread > 0 && (
            <button
              onClick={() => void markAllRead()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-2 border-b border-border/60 px-4 py-3 text-sm last:border-0 ${
                  n.read_at ? "opacity-60" : ""
                }`}
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{n.message}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
