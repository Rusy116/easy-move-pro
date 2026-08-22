import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";

export function PaymentTestModeBanner() {
  if (!paymentsConfigured()) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        Checkout is not configured yet. Complete payment go-live to accept real payments.
      </div>
    );
  }
  if (getStripeEnvironment() === "sandbox") {
    return (
      <div className="w-full border-b border-ochre/40 bg-ochre/10 px-4 py-2 text-center text-sm text-foreground">
        Test mode — payments made here are not real. Use card 4242 4242 4242 4242.
      </div>
    );
  }
  return null;
}
