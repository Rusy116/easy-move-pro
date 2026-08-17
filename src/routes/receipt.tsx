import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Loader2, ReceiptText, ShieldAlert } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { getReceipt, type ReceiptView } from "@/lib/store/entitlements.functions";
import { money } from "@/lib/pdf-store/catalog";

export const Route = createFileRoute("/receipt")({
  validateSearch: (search: Record<string, unknown>): { t?: string } => ({
    t: typeof search["t"] === "string" ? search["t"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Purchase receipt — Easy Moving" },
      { name: "description", content: "Your Easy Moving purchase receipt." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReceiptPage,
});

async function downloadReceiptPdf(r: ReceiptView) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const left = 56;
  let y = 72;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Easy Moving", left, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("easymove.pro", left, (y += 18));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Receipt", left, (y += 44));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const rows: [string, string][] = [
    ["Order number", r.orderNumber],
    ["Date", r.purchasedAt ? new Date(r.purchasedAt).toLocaleString() : "—"],
    ["Billed to", `${r.buyerName || "Customer"} (${r.email})`],
    ["Item", r.productTitle],
    ["Status", r.status === "paid" ? "Paid" : r.status],
    ["Total", `${money(r.amountCents)} ${r.currency}`],
  ];
  for (const [label, value] of rows) {
    y += 24;
    doc.setTextColor(120);
    doc.text(label, left, y);
    doc.setTextColor(20);
    doc.text(String(value), left + 150, y);
  }

  doc.setTextColor(130);
  doc.setFontSize(9);
  doc.text(
    "Digital product — delivered as a downloadable PDF. Thank you for your purchase.",
    left,
    y + 48,
  );
  doc.save(`easy-moving-receipt-${r.orderNumber}.pdf`);
}

function ReceiptPage() {
  const { t } = Route.useSearch();
  const [state, setState] = useState<
    { status: "loading" } | { status: "error"; message: string } | { status: "ok"; receipt: ReceiptView }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!t) {
        setState({ status: "error", message: "This receipt link is missing its token." });
        return;
      }
      try {
        const res = await getReceipt({ data: { token: t } });
        if (cancelled) return;
        setState("error" in res ? { status: "error", message: res.error } : { status: "ok", receipt: res.receipt });
      } catch {
        if (!cancelled) setState({ status: "error", message: "We could not load this receipt." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-xl px-4 py-16 sm:px-6 sm:py-24">
        {state.status === "loading" ? (
          <div className="card-premium p-10 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : state.status === "error" ? (
          <div className="card-premium p-10 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-4 font-serif text-2xl">{state.message}</h1>
            <Link to="/orders" className="mt-4 inline-block text-sm underline">
              Find my orders
            </Link>
          </div>
        ) : (
          <div className="card-premium p-8 sm:p-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ReceiptText className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">Receipt</span>
            </div>
            <h1 className="mt-3 font-serif text-3xl">{state.receipt.productTitle}</h1>

            <dl className="mt-6 space-y-3 text-sm">
              {(
                [
                  ["Order number", state.receipt.orderNumber],
                  [
                    "Date",
                    state.receipt.purchasedAt
                      ? new Date(state.receipt.purchasedAt).toLocaleString()
                      : "—",
                  ],
                  [
                    "Billed to",
                    `${state.receipt.buyerName || "Customer"} · ${state.receipt.email}`,
                  ],
                  [
                    "Status",
                    state.receipt.status === "paid" ? "Paid" : state.receipt.status,
                  ],
                  ["Total", `${money(state.receipt.amountCents)} ${state.receipt.currency}`],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-6 border-b border-border/50 pb-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>

            <Button
              className="mt-6 w-full rounded-full"
              onClick={() => void downloadReceiptPdf(state.receipt)}
            >
              <Download className="mr-2 h-4 w-4" /> Download receipt (PDF)
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Need the product again?{" "}
              <Link to="/orders" className="underline">
                Resend my download link
              </Link>
            </p>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
