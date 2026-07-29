import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { PageHeader, SectionShell, SkeletonRows } from "@/components/shell/Chrome";
import {
  getDocumentUrl,
  useMoveDocuments,
  useMyMoves,
  type MoveDocument,
} from "@/lib/customer-portal";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/customer/documents")({
  head: () => ({
    meta: [
      { title: "Move Documents — Easy Moving" },
      {
        name: "description",
        content: "View and download your estimate, move summary and mover attachments.",
      },
    ],
  }),
  component: CustomerDocumentsPage,
});

function CustomerDocumentsPage() {
  const { activeMove: move, loading } = useMyMoves();
  const { docs, loading: loadingDocs } = useMoveDocuments(move?.id ?? null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function open(doc: MoveDocument) {
    setBusyId(doc.id);
    try {
      const url = await getDocumentUrl(doc);
      if (!url) {
        toast.error("This document isn't available for download yet.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setBusyId(null);
    }
  }

  const portalHref =
    move?.quote_number && move?.portal_token
      ? `/portal/${move.quote_number}?token=${move.portal_token}`
      : null;

  return (
    <CustomerShell>
      <div className="min-h-screen bg-gradient-to-b from-sage-soft/40 to-background">
        <section className="mx-auto max-w-5xl px-4 sm:px-6 py-10 md:py-14">
          <PageHeader
            eyebrow="Documents"
            title="Your move paperwork"
            subtitle="Estimates, summaries and files shared by your moving company"
            icon={<FileText className="h-5 w-5" />}
          />

          <div className="mt-6 space-y-4">
            <SectionShell title="Estimate & summary">
              {loading ? (
                <SkeletonRows n={1} />
              ) : !move ? (
                <p className="text-sm text-muted-foreground">No move yet.</p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-4">
                  <div>
                    <div className="text-sm font-medium">
                      Moving estimate {move.quote_number ?? ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(move.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {portalHref ? (
                    <Button asChild size="sm" variant="secondary" className="rounded-full">
                      <a href={portalHref}>
                        <Download className="mr-1.5 h-4 w-4" /> Open estimate
                      </a>
                    </Button>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </div>
              )}
            </SectionShell>

            <SectionShell title="Files from your moving company">
              {loadingDocs ? (
                <SkeletonRows n={2} />
              ) : docs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No documents have been shared with you yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {docs.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-4"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{d.name}</div>
                        <div className="text-xs text-muted-foreground">
                          <span className="capitalize">{d.kind.replace(/_/g, " ")}</span> ·{" "}
                          {new Date(d.created_at).toLocaleDateString()}
                          {d.size_bytes
                            ? ` · ${Math.round(Number(d.size_bytes) / 1024)} KB`
                            : ""}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-full"
                        disabled={busyId === d.id}
                        onClick={() => open(d)}
                      >
                        {busyId === d.id ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-1.5 h-4 w-4" />
                        )}
                        Download
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionShell>
          </div>
        </section>
      </div>
    </CustomerShell>
  );
}
