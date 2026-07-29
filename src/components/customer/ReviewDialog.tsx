import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { submitReview } from "@/lib/customer-portal";

function Stars({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${label}: ${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
            className="p-0.5"
          >
            <Star
              className={
                n <= value
                  ? "h-5 w-5 fill-amber-400 text-amber-400"
                  : "h-5 w-5 text-muted-foreground/40"
              }
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewDialog({
  open,
  onOpenChange,
  quoteId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quoteId: string;
  onSaved: () => void;
}) {
  const [professionalism, setProfessionalism] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [punctuality, setPunctuality] = useState(5);
  const [overall, setOverall] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await submitReview({
        quoteId,
        professionalism,
        communication,
        punctuality,
        overall,
        title,
        body,
      });
      toast.success("Thanks for your review!");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error("Could not save review", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Rate your move</DialogTitle>
          <DialogDescription>
            Your feedback helps other customers choose the right mover.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Stars label="Professionalism" value={professionalism} onChange={setProfessionalism} />
          <Stars label="Communication" value={communication} onChange={setCommunication} />
          <Stars label="Punctuality" value={punctuality} onChange={setPunctuality} />
          <Stars label="Overall experience" value={overall} onChange={setOverall} />

          <div>
            <Label htmlFor="review-title">Headline</Label>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5"
              placeholder="Smooth, on-time move"
            />
          </div>
          <div>
            <Label htmlFor="review-body">Your review</Label>
            <Textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="mt-1.5"
              placeholder="Tell us how it went"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button disabled={busy} onClick={submit}>
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Submit review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
