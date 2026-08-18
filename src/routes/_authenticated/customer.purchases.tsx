import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { PageHeader, SectionShell, SkeletonRows } from "@/components/shell/Chrome";
import { getMyOrders, issueLibraryDownload, type MyOrderRow } from "@/lib/store/entitlements.functions";

export const Route = createFileRoute("/_authenticated/customer/purchases")({
  head: () => ({
    meta: [
      { title: "Purchases & Receipts — Easy Moving" },
      {
        name: "description",
        content:
          "Your Easy Moving order history: receipts, payment status and fresh download links for every guide you own.",
      },
      { property: "og:title", content: "Purchases & Receipts — Easy Moving" },
      {
        property: "og:description",
        content: "Review your Easy Moving orders, download receipts and re-download your guides.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PurchasesPage,
});

function money(cents: number, currency: string) {
  return `${(cents / 100).toLocaleString("en-US", { style: "currency", currency: currency || "USD" })}`;
}

const TONE: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  refunded: "bg-amber-100 text-amber-900",
  disputed: "bg-amber-100 text-amber-900",
  failed: "bg-destructive/10 text-destructive",
};

function PurchasesPage() {
  const [rows, setRows] = useState<MyOrderRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void getMyOrders()
      .then((data) => alive && setRows(data))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, []);

  async function download(slug: string | null) {
    if (!slug || busy) return;
    setBusy(slug);
    try {
      const res = await issueLibraryDownload({ data: { productSlug: slug } });
      if ("error" in res) throw new Error(res.error);
      window.open(res.url, "_blank", "noopener");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not prepare your download");
    } finally {
      setBusy(null);
    }
  }

  return (
    <CustomerShell>
      <div className="min-h-screen bg-gradient-to-b from-sage-soft/40 to-background">
        <section className="mx-auto max-w-5xl px-4 sm:px-6 py-10 md:py-14">
          <PageHeader
            eyebrow="Billing"
            title="Purchases & receipts"
            subtitle="Every order placed with this account, with receipts and download links"
            icon={<Receipt className="h-5 w-5" />}
          />

          <div className="mt-6">
            <SectionShell>
              {rows === null ? (
                <SkeletonRows n={3} />
              ) : rows.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-serif text-lg">No purchases yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Orders you place with this email will appear here automatically.
                  </p>
                  <Link to="/products" className="mt-4 inline-block">
                    <Button variant="secondary" className="rounded-full">
                      Browse the store
                    </Button>
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {rows.map((order) => (
                    <li
                      key={order.orderNumber}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{order.productTitle}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {order.orderNumber} ·{" "}
                          {order.purchasedAt
                            ? new Date(order.purchasedAt).toLocaleDateString()
                            : "—"}{" "}
                          · {money(order.amountCents, order.currency)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={TONE[order.status] ?? "bg-muted text-foreground"}>
                          {order.status}
                        </Badge>
                        <Button asChild size="sm" variant="secondary" className="rounded-full">
                          <a href={order.receiptUrl} target="_blank" rel="noopener noreferrer">
                            <Receipt className="mr-1.5 h-3.5 w-3.5" /> Receipt
                          </a>
                        </Button>
                        {order.downloadable && (
                          <Button
                            size="sm"
                            className="rounded-full"
                            disabled={busy === order.productSlug}
                            onClick={() => download(order.productSlug)}
                          >
                            {busy === order.productSlug ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Download
                          </Button>
                        )}
                      </div>
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
