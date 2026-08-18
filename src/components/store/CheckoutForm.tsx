import { useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Download, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStoreCheckout, claimFreeProducts, type CheckoutItemView } from "@/lib/store-checkout.functions";
import { getStripe, getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";
import { clearCart } from "@/lib/store/cart";

export interface CheckoutLine {
  slug: string;
  title: string;
  priceCents: number;
}

/**
 * One form for every purchase path: paid items open Stripe's embedded
 * checkout, free lead magnets are delivered straight away against the same
 * email capture (no account required).
 */
export function CheckoutForm({
  lines,
  fromCart,
  onStarted,
}: {
  lines: CheckoutLine[];
  fromCart?: boolean;
  /** Fired the moment checkout starts so the parent can freeze the line items. */
  onStarted?: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [freeItems, setFreeItems] = useState<CheckoutItemView[] | null>(null);
  const [freeEmailSent, setFreeEmailSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = lines.reduce((sum, l) => sum + Number(l.priceCents ?? 0), 0);
  const isFree = total === 0;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const canSubmit = emailValid && (isFree || (Boolean(firstName.trim()) && paymentsConfigured()));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy || !lines.length) return;
    setBusy(true);
    setError(null);
    // Freeze the parent's line items: the cart may be emptied later (only ever
    // after a successful payment) and must not unmount the live Stripe form.
    onStarted?.();
    try {
      const slugs = lines.map((l) => l.slug);
      if (isFree) {
        const result = await claimFreeProducts({
          data: { slugs, email: email.trim(), firstName: firstName.trim() },
        });
        if ("error" in result) throw new Error(result.error);
        setFreeItems(result.items);
        setFreeEmailSent(result.emailSent);
        if (fromCart) clearCart();
        return;
      }
      const result = await createStoreCheckout({
        data: {
          slugs,
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      if (fromCart) clearCart();
      setClientSecret(result.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
    } finally {
      setBusy(false);
    }
  }

  if (freeItems) {
    return (
      <div className="card-premium p-6 sm:p-8">
        <h1 className="font-serif text-2xl sm:text-3xl">Your download is ready</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {freeEmailSent
            ? `We also emailed a copy of your link to ${email.trim()}.`
            : "Download it now — keep this page open until your file is saved."}
        </p>
        <div className="mt-6 space-y-3">
          {freeItems.map((item) => (
            <Button key={item.slug} asChild size="lg" className="w-full rounded-full">
              <a href={item.downloadUrl ?? "#"}>
                <Download className="mr-2 h-4 w-4" /> {item.title}
              </a>
            </Button>
          ))}
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Create a free account with this email and every download stays in your library.
        </p>
      </div>
    );
  }

  if (clientSecret) {
    return (
      <div className="card-premium p-2 sm:p-4">
        <EmbeddedCheckoutProvider
          stripe={getStripe()}
          options={{ fetchClientSecret: async () => clientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card-premium p-6 sm:p-8">
      <h1 className="font-serif text-2xl sm:text-3xl">{isFree ? "Get your free PDF" : "Checkout"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        No account needed. We email your PDF to the address below.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First name{isFree ? " (optional)" : ""}</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            required={!isFree}
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

      <Button type="submit" size="lg" className="mt-6 w-full rounded-full" disabled={!canSubmit || busy}>
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : isFree ? (
          <Download className="mr-2 h-4 w-4" />
        ) : (
          <Lock className="mr-2 h-4 w-4" />
        )}
        {isFree ? "Send my free PDF" : "Continue to payment"}
      </Button>
      {!isFree && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Card details are handled by our payment provider —
          never stored by Easy Moving.
        </p>
      )}
    </form>
  );
}
