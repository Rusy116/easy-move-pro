import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, DollarSign, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  CANCELLATION_REASONS,
  cancelMove,
  confirmMove,
  money,
  type CustomerMove,
} from "@/lib/customer-portal";

export function FinalPriceCard({ move, onChanged }: { move: CustomerMove; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const canConfirm = move.lead_status === "price_confirmed";
  const canCancel = !["completed", "cancelled", "rejected"].includes(move.lead_status);
  const confirmed = ["customer_confirmed", "completed"].includes(move.lead_status);

  const services = [
    move.packing && "Packing",
    move.unpacking && "Unpacking",
    move.storage && "Storage",
    move.assembly && "Furniture assembly",
    move.junk_removal && "Junk removal",
  ].filter(Boolean) as string[];

  async function handleConfirm() {
    setBusy(true);
    try {
      await confirmMove(move.id);
      toast.success("Move confirmed", {
        description: "Your moving company has been notified.",
      });
      onChanged();
    } catch (e) {
      toast.error("Could not confirm", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Final move price
          </div>
          <div className="mt-1 font-serif text-4xl font-medium tabular-nums text-gradient-brand">
            {move.final_price != null
              ? money(move.final_price)
              : `${money(move.estimated_low)} – ${money(move.estimated_high)}`}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {move.final_price != null
              ? "Confirmed by your moving company"
              : "Broker estimate — final price pending"}
          </div>
        </div>
        {confirmed ? (
          <Badge className="border border-emerald-600/30 bg-emerald-500/10 text-emerald-700">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmed
          </Badge>
        ) : move.lead_status === "cancelled" ? (
          <Badge className="border border-rose-600/30 bg-rose-500/10 text-rose-700">
            <XCircle className="mr-1 h-3 w-3" /> Cancelled
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Included services
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {services.length === 0 ? (
              <span className="text-sm text-muted-foreground">Standard moving service</span>
            ) : (
              services.map((s) => (
                <Badge key={s} variant="outline" className="rounded-full">
                  {s}
                </Badge>
              ))
            )}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Move details
          </div>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>
              Date: {move.final_move_date ?? move.move_date ?? "To be scheduled"}
              {move.arrival_window ? ` · ${move.arrival_window}` : ""}
            </li>
            <li>Crew: {move.crew_size ? `${move.crew_size} movers` : "—"}</li>
            <li>Truck: {move.final_truck_size ?? "—"}</li>
          </ul>
        </div>
      </div>

      {move.company_notes && (
        <div className="rounded-2xl bg-muted/50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Notes from your mover
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm">{move.company_notes}</p>
        </div>
      )}

      {move.cancellation_reason && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <strong>Cancelled:</strong> {move.cancellation_reason}
          {move.cancellation_note ? ` — ${move.cancellation_note}` : ""}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <Button className="rounded-full" disabled={!canConfirm || busy} onClick={handleConfirm}>
          {busy ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <DollarSign className="mr-1.5 h-4 w-4" />
          )}
          {confirmed ? "Move confirmed" : "Confirm move"}
        </Button>
        {canCancel && (
          <Button variant="outline" className="rounded-full" onClick={() => setCancelOpen(true)}>
            Cancel move
          </Button>
        )}
      </div>

      <CancelMoveDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        quoteId={move.id}
        onCancelled={onChanged}
      />
    </div>
  );
}

export function CancelMoveDialog({
  open,
  onOpenChange,
  quoteId,
  onCancelled,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quoteId: string;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await cancelMove(quoteId, reason, note);
      toast.success("Move cancelled", {
        description: "Your broker and moving company have been notified.",
      });
      onOpenChange(false);
      onCancelled();
    } catch (e) {
      toast.error("Could not cancel", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Cancel this move</DialogTitle>
          <DialogDescription>
            Tell us why so we can improve. Your broker, moving company and our team are notified
            automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
            {CANCELLATION_REASONS.map((r) => (
              <div key={r} className="flex items-center gap-2">
                <RadioGroupItem value={r} id={`reason-${r}`} />
                <Label htmlFor={`reason-${r}`} className="font-normal">
                  {r}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div>
            <Label htmlFor="cancel-note">Anything else? (optional)</Label>
            <Textarea
              id="cancel-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-1.5"
              placeholder="Add details for your broker"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep my move
          </Button>
          <Button variant="destructive" disabled={busy} onClick={submit}>
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Cancel move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
