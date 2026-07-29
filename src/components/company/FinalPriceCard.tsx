import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, History, Loader2, Lock, Paperclip, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate, money, timeAgo, type MyJob } from "@/lib/company-jobs";
import {
  completeMove, confirmFinalPrice, isPriceLocked, requestPriceRevision,
  usePriceRevisions,
} from "@/lib/company-crm";

/**
 * Final price confirmation + append-only revision history.
 * Once confirmed the price is locked; changes go through a revision request.
 */
export function FinalPriceCard({
  job,
  companyId,
  onChanged,
}: {
  job: MyJob;
  companyId: string;
  onChanged: () => void;
}) {
  const { revisions } = usePriceRevisions(job.id);
  const locked = isPriceLocked(job.lead_status);

  const [price, setPrice] = useState(job.final_price != null ? String(job.final_price) : "");
  const [deposit, setDeposit] = useState("");
  const [additional, setAdditional] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  async function confirm() {
    const value = Number(price);
    if (!value || value <= 0) {
      toast.error("Enter a final move price.");
      return;
    }
    setPending("confirm");
    const { error } = await confirmFinalPrice({
      quoteId: job.id,
      companyId,
      finalPrice: value,
      deposit: deposit ? Number(deposit) : null,
      additional: additional ? Number(additional) : 0,
      notes: notes || null,
    });
    setPending(null);
    if (error) return void toast.error(error.message || "Could not confirm the price.");
    toast.success("Final price confirmed and locked. Customer and broker notified.");
    onChanged();
  }

  async function finish() {
    setPending("complete");
    const { error } = await completeMove({ quoteId: job.id, companyId });
    setPending(null);
    if (error) return void toast.error(error.message || "Could not complete the move.");
    toast.success("Move marked completed. The customer can now leave a review.");
    onChanged();
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Final price</h2>
        {locked && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <Lock className="h-3 w-3" /> Price locked
          </span>
        )}
      </div>

      {locked ? (
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Confirmed price
            </div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">{money(job.final_price)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Locked on {formatDate(job.final_quote_sent_at)} — edits require a price revision.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PriceRevisionDialog job={job} companyId={companyId} onChanged={onChanged} />
            {job.job_status !== "completed" && (
              <Button className="rounded-full" disabled={pending !== null} onClick={finish}>
                {pending === "complete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Mark move completed
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="fp_price">Final move price ($)</Label>
              <Input id="fp_price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="fp_deposit">Deposit (optional)</Label>
              <Input id="fp_deposit" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="fp_extra">Additional charges</Label>
              <Input id="fp_extra" inputMode="decimal" value={additional} onChange={(e) => setAdditional(e.target.value)} className="mt-1.5" />
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor="fp_notes">Internal notes</Label>
              <Textarea id="fp_notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <Button className="mt-4 rounded-full" disabled={pending !== null} onClick={confirm}>
            {pending === "confirm" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            Confirm final price
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Confirming locks the price, notifies the customer and broker, and creates a pending commission record.
          </p>
        </>
      )}

      {revisions.length > 0 && (
        <div className="mt-6 border-t border-border pt-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <History className="h-4 w-4" /> Price history
          </h3>
          <ol className="mt-3 space-y-3">
            {revisions.map((r) => (
              <li key={r.id} className="rounded-xl border border-border/70 bg-muted/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    #{r.revision} · {money(r.previous_price)} → {money(r.new_price)}
                  </span>
                  <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                </div>
                {r.reason && <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>}
                {r.notes && <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p>}
                {Array.isArray(r.attachments) && r.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(r.attachments as Array<{ name?: string; url?: string }>).map((a, i) => (
                      <a
                        key={i}
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] hover:bg-muted"
                      >
                        <Paperclip className="h-3 w-3" /> {a.name ?? "Attachment"}
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function PriceRevisionDialog({
  job,
  companyId,
  onChanged,
}: {
  job: MyJob;
  companyId: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const value = Number(newPrice);
    if (!value || value <= 0) return void toast.error("Enter the new price.");
    if (!reason.trim()) return void toast.error("A reason is required.");
    setSaving(true);
    const { error } = await requestPriceRevision({
      quoteId: job.id,
      companyId,
      newPrice: value,
      reason: reason.trim(),
      notes: notes || null,
      attachments: attachment.trim() ? [{ name: "Attachment", url: attachment.trim() }] : [],
    });
    setSaving(false);
    if (error) return void toast.error(error.message || "Could not file the revision.");
    toast.success("Price revision recorded. Previous prices are preserved.");
    setOpen(false);
    setNewPrice(""); setReason(""); setNotes(""); setAttachment("");
    onChanged();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <PencilLine className="mr-2 h-4 w-4" /> Request price revision
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request price revision</DialogTitle>
          <DialogDescription>
            The current price of {money(job.final_price)} stays in the history — nothing is overwritten.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="rev_price">New price ($)</Label>
            <Input id="rev_price" inputMode="decimal" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="rev_reason">Reason</Label>
            <Input id="rev_reason" placeholder="Extra items added at pickup" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="rev_notes">Notes</Label>
            <Textarea id="rev_notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="rev_file">Attachment link (optional)</Label>
            <Input id="rev_file" placeholder="https://…" value={attachment} onChange={(e) => setAttachment(e.target.value)} className="mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit revision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
