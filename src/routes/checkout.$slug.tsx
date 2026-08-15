import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CoverImage } from "@/components/store/CoverImage";
import { PaymentTestModeBanner } from "@/components/store/PaymentTestModeBanner";
import { getStoreProduct } from "@/lib/pdf-store.functions";
import { createStoreCheckout } from "@/lib/store-checkout.functions";
import { getStripe, getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";
import { money } from "@/lib/pdf-store/catalog";

export const Route = createFileRoute("/checkout/$slug")({
  loader: async ({ params }) => {
    const res = await getStoreProduct({ data: { slug: params.slug } });
    if (!res) throw notFound();
    return { product: res.product };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Checkout — ${loaderData.product.title} — Easy Moving`
          : "Checkout — Easy Moving",
      },
      {
        name: "description",
        content:
          "Secure checkout for Easy Moving printable planners and checklists. No account required — your PDF is emailed instantly.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
  errorComponent: () => (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="font-serif text-xl">Checkout is temporarily unavailable</p>
        <p className="mt-2 text-sm text-muted-foreground">Please refresh in a moment.</p>
      </section>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="font-serif text-xl">Product not found</p>
        <Link to="/products" className="mt-4 inline-block text-sm underline">
          Back to the store
        </Link>
      </section>
    </SiteLayout>
  ),
});

function CheckoutPage() {
  const { product } = Route.useLoaderData();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const canPay = Boolean(firstName.trim()) && emailValid && paymentsConfigured();

  async function startCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!canPay || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createStoreCheckout({
        data: {
          slug: product.slug,
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      setClientSecret(result.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout hideFooter>
      <PaymentTestModeBanner />
      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:py-14">
        <div className="order-2 lg:order-1">
          {!clientSecret ? (
            <form onSubmit={startCheckout} className="card-premium p-6 sm:p-8">
              <h1 className="font-serif text-2xl sm:text-3xl">Checkout</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                No account needed. We email your PDF to the address below.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="email">Email address (required)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your download link is sent here — double-check the spelling.
                  </p>
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

              <Button type="submit" size="lg" className="mt-6 w-full rounded-full" disabled={!canPay || busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                Continue to payment
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Card details are handled by our payment
                provider — never stored by Easy Moving.
              </p>
            </form>
          ) : (
            <div className="card-premium p-2 sm:p-4">
              <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: async () => clientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          )}
        </div>

        <aside className="order-1 lg:order-2">
          <div className="card-premium p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Order summary
            </p>
            <div className="mt-4 flex gap-3">
              <CoverImage
                slug={product.slug}
                title={product.title}
                coverUrl={product.cover_url}
                spec={product.cover_spec}
                className="w-20 shrink-0 overflow-hidden rounded-lg"
              />
              <div className="min-w-0">
                <p className="font-serif text-lg leading-snug">{product.title}</p>
                <p className="text-xs text-muted-foreground">{product.page_count} pages · PDF</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-semibold">{money(product.price_cents)}</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Instant download after payment, plus an emailed copy of your link.
            </p>
          </div>
        </aside>
      </section>
    </SiteLayout>
  );
}
