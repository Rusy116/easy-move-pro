const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        Checkout is not configured yet. Complete payment go-live to accept real payments.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-ochre/40 bg-ochre/10 px-4 py-2 text-center text-sm text-foreground">
        Test mode — payments made here are not real. Use card 4242 4242 4242 4242.
      </div>
    );
  }
  return null;
}
