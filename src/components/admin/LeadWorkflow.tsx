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
import { useStatusLabel, useT } from "@/i18n";
import {
  LEAD_STATUS_STYLE,
  type LeadStatus,
  requestLeadInfo,
  setLeadStatus,
} from "@/lib/lead-status";

export function LeadStatusBadge({ status }: { status: string | null | undefined }) {
  const statusLabel = useStatusLabel();
  const s = (status ?? "submitted") as LeadStatus;
  return (
    <Badge variant="outline" className={LEAD_STATUS_STYLE[s] ?? ""}>
      {statusLabel("lead", s)}
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
  const tr = useT();
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
      toast.error(e instanceof Error ? e.message : tr("admin.shell.leadWorkflow.actionFailed"));
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
              tr("admin.shell.leadWorkflow.toast.movedToReview"),
              "under_review",
            )
          }
        >
          {tr("admin.shell.leadWorkflow.startReview")}
        </Button>
      )}

      {canQualify && (
        <Button
          size="sm"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={busy}
          onClick={() =>
            void run(
              () => setLeadStatus(quoteId, "qualified"),
              tr("admin.shell.leadWorkflow.toast.approved"),
              "qualified",
            )
          }
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {tr("admin.shell.leadWorkflow.approve")}
        </Button>
      )}

      {canPublish && (
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            void run(
              () => setLeadStatus(quoteId, "published"),
              tr("admin.shell.leadWorkflow.toast.published"),
              "published",
            )
          }
        >
          <Megaphone className="mr-2 h-4 w-4" />
          {tr("admin.shell.leadWorkflow.publishToMarketplace")}
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
        {tr("admin.shell.leadWorkflow.requestInfo")}
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
          {tr("admin.shell.leadWorkflow.reject")}
        </Button>
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "reject"
                ? tr("admin.shell.leadWorkflow.dialog.rejectTitle")
                : tr("admin.shell.leadWorkflow.dialog.requestInfoTitle")}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            rows={4}
            value={message}
            placeholder={
              dialog === "reject"
                ? tr("admin.shell.leadWorkflow.dialog.rejectPlaceholder")
                : tr("admin.shell.leadWorkflow.dialog.requestInfoPlaceholder")
            }
            onChange={(e) => setMessage(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              {tr("admin.shell.leadWorkflow.dialog.cancel")}
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
                  isReject
                    ? tr("admin.shell.leadWorkflow.toast.rejected")
                    : tr("admin.shell.leadWorkflow.toast.infoRequested"),
                  isReject ? "rejected" : "under_review",
                ).then(() => setDialog(null));
              }}
            >
              {tr("admin.shell.leadWorkflow.dialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
