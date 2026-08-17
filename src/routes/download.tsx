import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, ShieldAlert } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { redeemDownload } from "@/lib/store-checkout.functions";
import type { PdfProduct } from "@/lib/pdf-store/catalog";

export const Route = createFileRoute("/download")({
  validateSearch: (search: Record<string, unknown>): { t?: string } => ({
    t: typeof search["t"] === "string" ? search["t"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your download — Easy Moving" },
      { name: "description", content: "Download the Easy Moving PDF you purchased." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  const { t } = Route.useSearch();
  const [state, setState] = useState<
    { status: "loading" } | { status: "denied" } | { status: "ready"; product: PdfProduct; orderNumber: string }
  >({ status: "loading" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!t) return setState({ status: "denied" });
      try {
        const res = await redeemDownload({ data: { token: t } });
        if (cancelled) return;
        if (!res.ok) return setState({ status: "denied" });
        setState({ status: "ready", product: res.product as PdfProduct, orderNumber: res.orderNumber });
      } catch {
        if (!cancelled) setState({ status: "denied" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const save = useCallback(async () => {
    if (state.status !== "ready" || saving) return;
    setSaving(true);
    try {
      const { buildProductPdf } = await import("@/lib/pdf-store/render-pdf");
      buildProductPdf(state.product).save(`${state.product.slug}.pdf`);
    } finally {
      setSaving(false);
    }
  }, [state, saving]);

  useEffect(() => {
    if (state.status === "ready") void save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        {state.status === "loading" ? (
          <div className="card-premium p-10 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Verifying your download link…</p>
          </div>
        ) : state.status === "denied" ? (
          <div className="card-premium p-10 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-4 font-serif text-2xl">This download link is not valid</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              It may have expired or been altered. Sign in to your account to re-download any
              purchase, or contact us with your order number.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link to="/orders">
                <Button className="rounded-full">Resend my download link</Button>
              </Link>
              <Link to="/auth">
                <Button variant="secondary" className="rounded-full">
                  Sign in
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" className="rounded-full">
                  Contact support
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="card-premium p-10 text-center">
            <h1 className="font-serif text-2xl">{state.product.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Order {state.orderNumber}</p>
            <Button onClick={save} size="lg" className="mt-6 rounded-full" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download PDF
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              The download starts automatically. This link only unlocks this one product.
            </p>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
