import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyHeader, NoCompanyScreen, useMoverPortal } from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Receipt, Plus, Download, Trash2, DollarSign } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/company/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Company Portal" }] }),
  component: InvoicesPage,
});

type Invoice = {
  id: string; company_id: string; quote_id: string | null; number: string;
  kind: "deposit" | "final" | "extra" | "adjustment";
  status: "draft" | "sent" | "partially_paid" | "paid" | "void" | "overdue";
  customer_name: string | null; customer_email: string | null; customer_phone: string | null;
  subtotal: number; tax_rate: number; tax_amount: number; discount_amount: number;
  total: number; amount_paid: number; currency: string;
  issue_date: string; due_date: string | null; paid_at: string | null; notes: string | null;
  created_at: string;
};
type Item = { id: string; invoice_id: string; description: string; quantity: number; unit_price: number; amount: number; position: number };

const STATUS_COLORS: Record<Invoice["status"], string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-sky-50 text-sky-800 border-sky-300",
  partially_paid: "bg-amber-50 text-amber-800 border-amber-300",
  paid: "bg-emerald-50 text-emerald-800 border-emerald-300",
  void: "bg-rose-50 text-rose-800 border-rose-300",
  overdue: "bg-rose-50 text-rose-800 border-rose-300",
};

function InvoicesPage() {
  const { loading, company, reload } = useMoverPortal();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<"all" | Invoice["status"]>("all");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Invoice | null>(null);

  const load = useCallback(async () => {
    if (!company) return;
    const { data } = await supabase.from("company_invoices").select("*").eq("company_id", company.id).order("created_at", { ascending: false });
    setRows((data as Invoice[] | null) ?? []);
  }, [company]);
  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const total = rows.reduce((s, r) => s + Number(r.total), 0);
    const paid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.total), 0);
    const outstanding = rows.filter((r) => ["sent", "partially_paid", "overdue"].includes(r.status)).reduce((s, r) => s + (Number(r.total) - Number(r.amount_paid)), 0);
    return { total, paid, outstanding, count: rows.length };
  }, [rows]);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  async function markPaid(inv: Invoice) {
    const { error } = await supabase.from("company_invoices").update({
      status: "paid", amount_paid: inv.total, paid_at: new Date().toISOString(),
    }).eq("id", inv.id);
    if (error) toast.error(error.message); else { toast.success("Marked paid"); void load(); }
  }
  async function markSent(inv: Invoice) {
    const { error } = await supabase.from("company_invoices").update({ status: "sent" }).eq("id", inv.id);
    if (error) toast.error(error.message); else { toast.success("Marked sent"); void load(); }
  }
  async function del(inv: Invoice) {
    if (!confirm("Delete this invoice?")) return;
    const { error } = await supabase.from("company_invoices").delete().eq("id", inv.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); void load(); }
  }

  async function downloadPdf(inv: Invoice) {
    const { data: items } = await supabase.from("company_invoice_items").select("*").eq("invoice_id", inv.id).order("position");
    const doc = new jsPDF();
    doc.setFontSize(20); doc.text("INVOICE", 14, 20);
    doc.setFontSize(10);
    doc.text(company?.name ?? "", 14, 30);
    doc.text(`Invoice #: ${inv.number}`, 140, 20);
    doc.text(`Date: ${inv.issue_date}`, 140, 26);
    if (inv.due_date) doc.text(`Due: ${inv.due_date}`, 140, 32);
    doc.text("Bill to:", 14, 46);
    doc.text(inv.customer_name ?? "—", 14, 52);
    if (inv.customer_email) doc.text(inv.customer_email, 14, 58);
    if (inv.customer_phone) doc.text(inv.customer_phone, 14, 64);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      startY: 74,
      head: [["Description", "Qty", "Unit price", "Amount"]],
      body: ((items as Item[] | null) ?? []).map((it) => [it.description, Number(it.quantity).toString(), `$${Number(it.unit_price).toFixed(2)}`, `$${Number(it.amount).toFixed(2)}`]),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.text(`Subtotal: $${Number(inv.subtotal).toFixed(2)}`, 140, finalY);
    doc.text(`Discount: -$${Number(inv.discount_amount).toFixed(2)}`, 140, finalY + 6);
    doc.text(`Tax (${Number(inv.tax_rate).toFixed(2)}%): $${Number(inv.tax_amount).toFixed(2)}`, 140, finalY + 12);
    doc.setFontSize(12);
    doc.text(`Total: $${Number(inv.total).toFixed(2)}`, 140, finalY + 22);
    doc.save(`${inv.number}.pdf`);
  }

  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Invoices", stats.count.toString()],
          ["Total value", `$${stats.total.toLocaleString()}`],
          ["Paid", `$${stats.paid.toLocaleString()}`],
          ["Outstanding", `$${stats.outstanding.toLocaleString()}`],
        ].map(([k, v]) => (
          <div key={k} className="card-premium p-4">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="font-serif text-2xl mt-1">{v}</div>
          </div>
        ))}
      </div>

      <div className="card-premium p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-xl">Invoices</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-border overflow-hidden text-xs">
              {(["all", "draft", "sent", "partially_paid", "paid", "overdue", "void"] as const).map((k) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`px-3 py-1.5 capitalize ${filter === k ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}>
                  {k.replace("_", " ")}
                </button>
              ))}
            </div>
            <Button onClick={() => { setEdit(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />New invoice</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 pr-4">Number</th>
                <th className="py-2 pr-4">Kind</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Issued</th>
                <th className="py-2 pr-4">Due</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">No invoices.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/70">
                  <td className="py-3 pr-4 font-mono text-xs">{r.number}</td>
                  <td className="py-3 pr-4 capitalize">{r.kind}</td>
                  <td className="py-3 pr-4">{r.customer_name ?? "—"}</td>
                  <td className="py-3 pr-4">{r.issue_date}</td>
                  <td className="py-3 pr-4">{r.due_date ?? "—"}</td>
                  <td className="py-3 pr-4 font-semibold">${Number(r.total).toLocaleString()}</td>
                  <td className="py-3 pr-4"><Badge variant="outline" className={`capitalize ${STATUS_COLORS[r.status]}`}>{r.status.replace("_", " ")}</Badge></td>
                  <td className="py-3 flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => void downloadPdf(r)} title="Download PDF"><Download className="h-4 w-4" /></Button>
                    {r.status === "draft" && <Button variant="ghost" size="sm" onClick={() => void markSent(r)}>Send</Button>}
                    {r.status !== "paid" && r.status !== "void" && <Button variant="ghost" size="sm" onClick={() => void markPaid(r)} title="Mark paid"><DollarSign className="h-4 w-4" /></Button>}
                    <Button variant="ghost" size="sm" onClick={() => { setEdit(r); setOpen(true); }}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => void del(r)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && company && (
        <InvoiceDialog
          open={open} onOpenChange={setOpen}
          company={company.id}
          invoice={edit}
          onSaved={() => { void load(); setOpen(false); }}
        />
      )}
    </div>
  );
}

function InvoiceDialog({
  open, onOpenChange, company, invoice, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  company: string; invoice: Invoice | null; onSaved: () => void;
}) {
  const [kind, setKind] = useState<Invoice["kind"]>(invoice?.kind ?? "final");
  const [customerName, setCustomerName] = useState(invoice?.customer_name ?? "");
  const [customerEmail, setCustomerEmail] = useState(invoice?.customer_email ?? "");
  const [customerPhone, setCustomerPhone] = useState(invoice?.customer_phone ?? "");
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? "");
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [taxRate, setTaxRate] = useState(Number(invoice?.tax_rate ?? 0));
  const [discount, setDiscount] = useState(Number(invoice?.discount_amount ?? 0));
  const [items, setItems] = useState<Array<{ description: string; quantity: number; unit_price: number }>>([
    { description: "Moving services", quantity: 1, unit_price: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!invoice) return;
    void (async () => {
      const { data } = await supabase.from("company_invoice_items").select("*").eq("invoice_id", invoice.id).order("position");
      setItems(((data as Item[] | null) ?? []).map((it) => ({ description: it.description, quantity: Number(it.quantity), unit_price: Number(it.unit_price) })));
    })();
  }, [invoice]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxAmount = ((subtotal - discount) * taxRate) / 100;
  const total = subtotal - discount + taxAmount;

  async function save() {
    if (!customerName.trim()) { toast.error("Customer name required"); return; }
    setSaving(true);
    const payload = {
      company_id: company, kind, customer_name: customerName, customer_email: customerEmail || null,
      customer_phone: customerPhone || null, due_date: dueDate || null, notes: notes || null,
      subtotal, tax_rate: taxRate, tax_amount: taxAmount, discount_amount: discount, total,
    };
    let id = invoice?.id;
    if (invoice) {
      const { error } = await supabase.from("company_invoices").update(payload).eq("id", invoice.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("company_invoices").insert({ ...payload, created_by: u.user?.id ?? null }).select().single();
      if (error || !data) { toast.error(error?.message ?? "Failed"); setSaving(false); return; }
      id = data.id;
    }
    if (id) {
      await supabase.from("company_invoice_items").delete().eq("invoice_id", id);
      await supabase.from("company_invoice_items").insert(items.map((it, idx) => ({
        invoice_id: id, company_id: company, description: it.description,
        quantity: it.quantity, unit_price: it.unit_price, amount: it.quantity * it.unit_price, position: idx,
      })));
    }
    setSaving(false);
    toast.success(invoice ? "Invoice updated" : "Invoice created");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{invoice ? `Edit ${invoice.number}` : "New invoice"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Kind</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={kind} onChange={(e) => setKind(e.target.value as Invoice["kind"])}>
                <option value="deposit">Deposit</option><option value="final">Final</option><option value="extra">Extra charges</option><option value="adjustment">Adjustment</option>
              </select>
            </div>
            <div className="space-y-1.5"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Customer name</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button size="sm" variant="outline" onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0 }])}><Plus className="h-3.5 w-3.5 mr-1" />Add row</Button>
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-6" placeholder="Description" value={it.description} onChange={(e) => setItems((a) => a.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} />
                <Input className="col-span-2" type="number" min={0} step="0.01" placeholder="Qty" value={it.quantity} onChange={(e) => setItems((a) => a.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))} />
                <Input className="col-span-3" type="number" min={0} step="0.01" placeholder="Unit price" value={it.unit_price} onChange={(e) => setItems((a) => a.map((x, i) => i === idx ? { ...x, unit_price: Number(e.target.value) } : x))} />
                <Button className="col-span-1" size="sm" variant="ghost" onClick={() => setItems((a) => a.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Discount ($)</Label><Input type="number" min={0} step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label>Tax rate (%)</Label><Input type="number" min={0} step="0.01" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} /></div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>-${discount.toFixed(2)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Tax ({taxRate}%)</span><span>${taxAmount.toFixed(2)}</span></div>
            <div className="flex justify-between font-serif text-lg pt-2 border-t border-border"><span>Total</span><span>${total.toFixed(2)}</span></div>
          </div>

          <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save invoice"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
