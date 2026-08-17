import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, Loader2, Mail, UserPlus, XCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { getCheckoutStatus, type OrderStatusResult } from "@/lib/store-checkout.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { money } from "@/lib/pdf-store/catalog";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search["session_id"] === "string" ? search["session_id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Order confirmation — Easy Moving" },
      { name: "description", content: "Your Easy Moving download is ready." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id: sessionId } = Route.useSearch();
  const [state, setState] = useState<OrderStatusResult | null>(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId) {
      setState({ status: "unknown" });
      return;
    }
    (async () => {
      try {
        const result = await getCheckoutStatus({
          data: { sessionId, environment: getStripeEnvironment() },
        });
        if (cancelled) return;
        setState(result);
        if (!("error" in result) && result.status === "pending" && tries < 8) {
          setTimeout(() => setTries((t) => t + 1), 2000);
        }
      } catch {
        if (!cancelled) setState({ error: "We could not load your order." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, tries]);

  const paid = state && !("error" in state) && state.status === "paid";
  const failed = state && !("error" in state) && state.status === "failed";

  return (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
        {!state ? (
          <div className="card-premium p-10 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Confirming your payment…</p>
          </div>
        ) : "error" in state ? (
          <div className="card-premium p-10 text-center">
            <XCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-4 font-serif text-xl">{state.error}</p>
            <Link to="/products" className="mt-4 inline-block text-sm underline">
              Back to the store
            </Link>
          </div>
        ) : failed ? (
          <div className="card-premium p-10 text-center">
            <XCircle className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-4 font-serif text-2xl">Payment was not completed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              No charge was made. You can try again at any time.
            </p>
            <Link to="/products" className="mt-5 inline-block">
              <Button className="rounded-full">Back to the store</Button>
            </Link>
          </div>
        ) : !paid ? (
          <div className="card-premium p-10 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            <h1 className="mt-4 font-serif text-xl">Finalising your order…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This takes a few seconds. Your receipt and download link are on the way to{" "}
              {state.email ?? "your inbox"}.
            </p>
          </div>
        ) : (
          <div className="card-premium p-8 sm:p-10">
            <CheckCircle2 className="h-9 w-9 text-sage" />
            <h1 className="mt-4 font-serif text-3xl">Thank you for your purchase!</h1>
            <p className="mt-2 text-muted-foreground">
              Your digital moving document is ready.
            </p>

            <div className="mt-6 rounded-xl border border-border/60 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Product</span>
                <span className="text-right font-medium">{state.productTitle}</span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="text-muted-foreground">Order number</span>
                <span className="font-mono">{state.orderNumber}</span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="text-muted-foreground">Paid</span>
                <span>{money(state.amountCents ?? 0)}</span>
              </div>
            </div>

            {state.downloadUrl && (
              <Button asChild size="lg" className="mt-6 w-full rounded-full">
                <a href={state.downloadUrl}>
                  <Download className="mr-2 h-4 w-4" /> Download your PDF
                </a>
              </Button>
            )}

            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {state.emailSent
                ? `We also emailed your download link to ${state.email}.`
                : `Keep this page open to download now — your emailed copy is being sent to ${state.email}.`}
            </p>

            {state.receiptUrl && (
              <Button asChild variant="outline" size="lg" className="mt-3 w-full rounded-full">
                <a href={state.receiptUrl}>View receipt</a>
              </Button>
            )}

            <p className="mt-2 text-xs text-muted-foreground">
              Lost this link later?{" "}
              <Link to="/orders" className="underline">
                Resend it to your email
              </Link>
              .
            </p>

            <div className="mt-8 rounded-xl bg-sage-soft/50 p-5">
              <p className="font-serif text-lg">Create your free account</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Optional — it keeps every purchase, download and moving estimate in one place.
              </p>
              <a
                href={`/auth?signup=1&email=${encodeURIComponent(state.email ?? "")}`}
                className="mt-3 inline-block"
              >
                <Button variant="secondary" className="rounded-full">
                  <UserPlus className="mr-2 h-4 w-4" /> Create your free account
                </Button>
              </a>
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
