import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, HelpCircle, Megaphone, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUS_STYLE,
  type LeadStatus,
  requestLeadInfo,
  setLeadStatus,
} from "@/lib/lead-status";

export function LeadStatusBadge({ status }: { status: string | null | undefined }) {
  const s = (status ?? "submitted") as LeadStatus;
  return (
    <Badge variant="outline" className={LEAD_STATUS_STYLE[s] ?? ""}>
      {LEAD_STATUS_LABEL[s] ?? s}
    </Badge>
  );
}

/**
 * Broker workflow actions for a single lead: approve (qualify), reject,
 * request more information, and publish a qualified lead to the marketplace.
 */
export function LeadWorkflowActions({
  quoteId,
  status,
  onChanged,
}: {
  quoteId: string;
  status: string | null | undefined;
  onChanged?: (next: LeadStatus) => void;
}) {
  const current = (status ?? "submitted") as LeadStatus;
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<null | "reject" | "info">(null);
  const [message, setMessage] = useState("");

  async function run(fn: () => Promise<void>, ok: string, next?: LeadStatus) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      if (next) onChanged?.(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const canReview = ["draft", "submitted"].includes(current);
  const canQualify = ["submitted", "under_review"].includes(current);
  const canPublish = current === "qualified";
  const canReject = ["submitted", "under_review", "qualified"].includes(current);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <LeadStatusBadge status={current} />

      {canReview && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            void run(
              () => setLeadStatus(quoteId, "under_review"),
              "Moved to review",
              "under_review",
            )
          }
        >
          Start review
        </Button>
      )}

      {canQualify && (
        <Button
          size="sm"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={busy}
          onClick={() =>
            void run(() => setLeadStatus(quoteId, "qualified"), "Lead approved", "qualified")
          }
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Approve
        </Button>
      )}

      {canPublish && (
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            void run(
              () => setLeadStatus(quoteId, "published"),
              "Published to marketplace",
              "published",
            )
          }
        >
          <Megaphone className="mr-2 h-4 w-4" />
          Publish to marketplace
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => {
          setMessage("");
          setDialog("info");
        }}
      >
        <HelpCircle className="mr-2 h-4 w-4" />
        Request info
      </Button>

      {canReject && (
        <Button
          size="sm"
          variant="outline"
          className="text-rose-700"
          disabled={busy}
          onClick={() => {
            setMessage("");
            setDialog("reject");
          }}
        >
          <ThumbsDown className="mr-2 h-4 w-4" />
          Reject
        </Button>
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "reject" ? "Reject lead" : "Request more information"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            rows={4}
            value={message}
            placeholder={
              dialog === "reject"
                ? "Reason for rejecting this lead"
                : "What additional information is needed from the customer?"
            }
            onChange={(e) => setMessage(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy || !message.trim()}
              onClick={() => {
                const isReject = dialog === "reject";
                void run(
                  () =>
                    isReject
                      ? setLeadStatus(quoteId, "rejected", message.trim())
                      : requestLeadInfo(quoteId, message.trim()),
                  isReject ? "Lead rejected" : "Information requested",
                  isReject ? "rejected" : "under_review",
                ).then(() => setDialog(null));
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
