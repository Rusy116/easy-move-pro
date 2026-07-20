import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  RefreshCw, Bell, CheckCircle2, LayoutDashboard, Users, DollarSign,
  Inbox, Search, UserRound, Building2, BarChart3,
} from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { PageHeader, StatCard } from "@/components/shell/Chrome";
import { LeadDetailPanel } from "@/components/admin/LeadDetailPanel";
import { BrokerSelect, assignBroker, useBrokers } from "@/components/admin/BrokerSelect";

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

const PAGE_SIZE = 25;

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
  estimated_cubic_feet: number | null;
  status: string;
  quote_number: string | null;
  portal_token: string | null;
  accepted_at: string | null;
  move_date: string | null;
  assigned_broker_id: string | null;
  last_activity_at: string | null;
  details: Record<string, unknown> | null;
  lead_phase: string | null;
  exclusive_expires_at: string | null;
  exclusive_paused_at: string | null;
  exclusive_pause_reason: string | null;
  visibility_mask: Record<string, boolean> | null;
  closed_reason: string | null;
  [key: string]: unknown;
};

function getCustomerName(q: QuoteRow): string {
  const d = q.details as { fullName?: string } | null;
  return d?.fullName?.trim() || "—";
}

type Company = { id: string; name: string };

type Stats = {
  total: number; active: number; accepted: number; won: number; lost: number;
  revenueLow: number; revenueHigh: number;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
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
  const [cityFilter, setCityFilter] = useState<string>("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [brokerFilter, setBrokerFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [selected, setSelected] = useState<QuoteRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignCounts, setAssignCounts] = useState<Record<string, number>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const brokers = useBrokers();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0, active: 0, accepted: 0, won: 0, lost: 0, revenueLow: 0, revenueHigh: 0,
  });

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) { setIsAdmin(false); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.user.id);
      setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
    })();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      const { data } = await supabase.from("moving_companies").select("id,name").order("name");
      setCompanies((data ?? []) as Company[]);
    })();
  }, [isAdmin]);

  const loadStats = useCallback(async () => {
    if (!isAdmin) return;
    const activeStatuses = ["new", "contacted", "scheduled"];
    const [totalR, activeR, acceptedR, wonR, lostR, wonRev] = await Promise.all([
      supabase.from("quotes").select("id", { count: "exact", head: true }),
      supabase.from("quotes").select("id", { count: "exact", head: true }).in("status", activeStatuses),
      supabase.from("quotes").select("id", { count: "exact", head: true }).not("accepted_at", "is", null),
      supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "won"),
      supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "lost"),
      supabase.from("quotes").select("estimated_low,estimated_high").eq("status", "won"),
    ]);
    const rev = (wonRev.data ?? []).reduce(
      (acc, r: { estimated_low: number; estimated_high: number }) => ({
        low: acc.low + Number(r.estimated_low || 0),
        high: acc.high + Number(r.estimated_high || 0),
      }),
      { low: 0, high: 0 },
    );
    setStats({
      total: totalR.count ?? 0,
      active: activeR.count ?? 0,
      accepted: acceptedR.count ?? 0,
      won: wonR.count ?? 0,
      lost: lostR.count ?? 0,
      revenueLow: rev.low,
      revenueHigh: rev.high,
    });
  }, [isAdmin]);

  useEffect(() => { void loadStats(); }, [loadStats]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);

    let restrictQuoteIds: string[] | null = null;
    if (companyFilter !== "all") {
      const { data: asg } = await supabase
        .from("quote_assignments").select("quote_id").eq("company_id", companyFilter);
      restrictQuoteIds = (asg ?? []).map((a) => a.quote_id as string);
      if (restrictQuoteIds.length === 0) {
        setRows([]); setTotal(0); setLoading(false); return;
      }
    }

    let q = supabase
      .from("quotes").select("*", { count: "exact" })
      .order("last_activity_at", { ascending: false, nullsFirst: false });

    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00`);
    if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);
    if (customerName.trim()) q = q.ilike("details->>fullName", `%${customerName.trim()}%`);
    if (cityFilter.trim()) {
      const c = cityFilter.trim();
      q = q.or(`origin_city.ilike.%${c}%,destination_city.ilike.%${c}%`);
    }
    if (restrictQuoteIds) q = q.in("id", restrictQuoteIds);
    if (brokerFilter === "unassigned") q = q.is("assigned_broker_id", null);
    else if (brokerFilter !== "all") q = q.eq("assigned_broker_id", brokerFilter);
    if (search.trim()) {
      const s = search.trim();
      q = q.or(
        `contact_phone.ilike.%${s}%,contact_email.ilike.%${s}%,quote_number.ilike.%${s}%,id.eq.${isUuid(s) ? s : "00000000-0000-0000-0000-000000000000"}`
      );
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    q = q.range(from, to);

    const { data, count, error } = await q;
    if (error) { toast.error(error.message); setLoading(false); return; }
    const list = (data as QuoteRow[]) ?? [];
    setRows(list);
    setTotal(count ?? 0);

    // Fetch assignment counts for visible rows
    if (list.length > 0) {
      const ids = list.map((r) => r.id);
      const { data: asg } = await supabase
        .from("quote_assignments").select("quote_id").in("quote_id", ids);
      const counts: Record<string, number> = {};
      (asg ?? []).forEach((a: { quote_id: string }) => {
        counts[a.quote_id] = (counts[a.quote_id] ?? 0) + 1;
      });
      setAssignCounts(counts);
    } else {
      setAssignCounts({});
    }
    setLoading(false);
  }, [isAdmin, statusFilter, dateFrom, dateTo, customerName, cityFilter, companyFilter, brokerFilter, search, page]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(0); setSelectedIds(new Set()); }, [statusFilter, dateFrom, dateTo, customerName, cityFilter, companyFilter, brokerFilter, search]);

  // Realtime updates
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-quotes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quotes" }, (payload) => {
        const q = payload.new as QuoteRow;
        setRows((prev) => [q, ...prev].slice(0, PAGE_SIZE));
        setTotal((t) => t + 1);
        void loadStats();
        toast.success(`New quote from ${getCustomerName(q)}`);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quotes" }, (payload) => {
        const q = payload.new as QuoteRow;
        setRows((prev) => prev.map((r) => (r.id === q.id ? q : r)));
        setSelected((cur) => (cur?.id === q.id ? q : cur));
        void loadStats();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [isAdmin, loadStats]);

  // Keyboard shortcut "/"
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status → ${status}`);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (selected?.id === id) setSelected({ ...selected, status });
  }

  async function bulkStatus(status: string) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { error } = await supabase.from("quotes").update({ status }).in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success(`${ids.length} lead${ids.length > 1 ? "s" : ""} → ${status}`);
    setRows((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, status } : r)));
    setSelectedIds(new Set());
  }

  async function bulkAssignBroker(brokerId: string | null) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { error } = await supabase.from("quotes").update({ assigned_broker_id: brokerId }).in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success(`${ids.length} lead${ids.length > 1 ? "s" : ""} ${brokerId ? "assigned" : "unassigned"}`);
    setRows((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, assigned_broker_id: brokerId } : r)));
    setSelectedIds(new Set());
  }

  const brokerLabel = useCallback((id: string | null) => {
    if (!id) return null;
    const b = brokers.find((x) => x.id === id);
    return b?.full_name || b?.email || id.slice(0, 8);
  }, [brokers]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(rows.map((r) => r.id)));
  }
  function toggle(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  if (isAdmin === null) {
    return <AdminShell><div className="p-16 text-center text-muted-foreground">Loading…</div></AdminShell>;
  }
  if (!isAdmin) {
    return (
      <AdminShell>
        <section className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-serif text-4xl">Admin access required</h1>
          <p className="mt-4 text-muted-foreground">Your account doesn't have the admin role.</p>
          <Link to="/dashboard" className="mt-6 inline-block text-primary hover:underline">← Back to dashboard</Link>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="min-h-screen bg-gradient-to-b from-sage-soft/30 to-background">
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8 md:py-12">
          <PageHeader
            eyebrow="Admin CRM"
            title="Leads"
            subtitle={
              <span className="inline-flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                </span>
                {total.toLocaleString()} total · live
              </span>
            }
            icon={<LayoutDashboard className="h-5 w-5" />}
            actions={
              <>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link to="/admin/dashboard"><BarChart3 className="mr-1.5 h-4 w-4" />Analytics</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link to="/admin/companies"><Users className="mr-1.5 h-4 w-4" />Companies</Link>
                </Button>
                <NotificationsBell />
                <Button variant="outline" onClick={() => void load()} disabled={loading} size="sm" className="rounded-full">
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </>
            }
          />

          {/* KPI stats */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total" value={stats.total.toLocaleString()} icon={<Inbox className="h-4 w-4" />} />
            <StatCard label="Active" value={stats.active.toLocaleString()} tone="info" hint="new · contacted · scheduled" icon={<Bell className="h-4 w-4" />} />
            <StatCard label="Accepted" value={stats.accepted.toLocaleString()} tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
            <StatCard label="Won" value={stats.won.toLocaleString()} tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
            <StatCard label="Lost" value={stats.lost.toLocaleString()} icon={<Inbox className="h-4 w-4" />} />
            <StatCard
              label="Revenue (won)"
              value={
                stats.won === 0 ? "—"
                  : `$${Math.round(stats.revenueLow / 1000)}k–$${Math.round(stats.revenueHigh / 1000)}k`
              }
              tone="success"
              hint="sum of estimates"
              icon={<DollarSign className="h-4 w-4" />}
            />
          </div>

          {/* Sticky filter bar */}
          <div className="mt-8 sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur border-b border-border">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStatusFilter("all")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                    statusFilter === s
                      ? STATUS_STYLES[s]
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
              <div className="relative ml-auto w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  className="pl-8 h-9"
                  placeholder="Phone, email, quote # ( / )"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" className="h-9" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" className="h-9" />
              <Input placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-9" />
              <Input placeholder="City" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="h-9" />
              <div className="grid grid-cols-2 gap-2">
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Company" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All companies</SelectItem>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={brokerFilter} onValueChange={setBrokerFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Broker" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All brokers</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {brokers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.full_name || b.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5 text-sm">
              <span className="font-medium">{selectedIds.size} selected</span>
              <Select onValueChange={(v) => void bulkStatus(v)}>
                <SelectTrigger className="h-8 w-[160px]"><SelectValue placeholder="Change status…" /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select onValueChange={(v) => void bulkAssignBroker(v === "__none" ? null : v)}>
                <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Assign broker…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Unassigned</SelectItem>
                  {brokers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.full_name || b.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </div>
          )}

          {/* Desktop table */}
          <div className="mt-6 hidden md:block overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={() => toggleAll()} />
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Quote #</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Customer</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Move date</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Route</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Volume</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Estimate</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Broker</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Movers</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((q) => {
                  const isSel = selectedIds.has(q.id);
                  return (
                    <TableRow
                      key={q.id}
                      data-selected={isSel}
                      className="cursor-pointer hover:bg-muted/40 data-[selected=true]:bg-primary/5"
                      onClick={() => setSelected(q)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSel} onCheckedChange={() => toggle(q.id)} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div>{q.quote_number ?? q.id.slice(0, 8)}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <div className="font-medium truncate">{getCustomerName(q)}</div>
                        <div className="text-xs text-muted-foreground truncate">{q.contact_phone ?? q.contact_email ?? ""}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{q.move_date ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        <div>{q.origin_city ?? q.origin_zip}</div>
                        <div className="text-muted-foreground">→ {q.destination_city ?? q.destination_zip}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {q.estimated_cubic_feet ? `${q.estimated_cubic_feet} ft³` : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium">
                        ${Number(q.estimated_low).toLocaleString()}–${Number(q.estimated_high).toLocaleString()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()} className="min-w-[140px]">
                        <BrokerSelect
                          value={q.assigned_broker_id}
                          size="sm"
                          onChange={async (v) => {
                            const ok = await assignBroker(q.id, v);
                            if (ok) setRows((prev) => prev.map((r) => (r.id === q.id ? { ...r, assigned_broker_id: v } : r)));
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {assignCounts[q.id] ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-800">
                            <Building2 className="h-3 w-3" />
                            {assignCounts[q.id]}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select value={q.status} onValueChange={(v) => void updateStatus(q.id, v)}>
                          <SelectTrigger className={`h-7 w-[120px] text-xs capitalize border ${STATUS_STYLES[q.status as Status] ?? ""}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {timeAgo(q.last_activity_at ?? q.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={11} className="p-8 text-center text-muted-foreground">No quotes match your filters.</TableCell></TableRow>
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
                  <div className="min-w-0">
                    <div className="font-medium truncate">{getCustomerName(q)}</div>
                    <div className="text-xs text-muted-foreground truncate font-mono">{q.quote_number ?? q.id.slice(0, 8)}</div>
                  </div>
                  <Badge variant="outline" className={`capitalize ${STATUS_STYLES[q.status as Status] ?? ""}`}>{q.status}</Badge>
                </div>
                <div className="mt-2 text-sm">
                  {(q.origin_city ?? q.origin_zip)} → {(q.destination_city ?? q.destination_zip)}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Move: {q.move_date ?? "—"}</span>
                  <span className="font-medium">${Number(q.estimated_low).toLocaleString()}–${Number(q.estimated_high).toLocaleString()}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <UserRound className="h-3 w-3" />
                  <span>{brokerLabel(q.assigned_broker_id) ?? "Unassigned"}</span>
                  <span>·</span>
                  <span>{timeAgo(q.last_activity_at ?? q.created_at)}</span>
                </div>
              </button>
            ))}
            {rows.length === 0 && !loading && (
              <div className="p-8 text-center text-muted-foreground rounded-2xl border border-border">No quotes.</div>
            )}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page + 1} of {pageCount} · {total.toLocaleString()} leads
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Prev</Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>Next →</Button>
            </div>
          </div>

          <LeadDetailPanel
            quote={selected as never}
            onClose={() => setSelected(null)}
            onStatusChange={updateStatus}
          />
        </section>
      </div>
    </AdminShell>
  );
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
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
      .from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(20);
    setItems((data ?? []) as AdminNotification[]);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin_notifications_stream")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notifications" }, (payload) => {
        const row = payload.new as AdminNotification;
        setItems((prev) => [row, ...prev].slice(0, 20));
        toast.success(row.message);
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [load]);

  const unread = items.filter((n) => !n.read_at).length;

  async function markAllRead() {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from("admin_notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
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
            <button onClick={() => void markAllRead()} className="text-xs text-muted-foreground hover:text-foreground">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</div>
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
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
