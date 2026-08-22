import { loadStripe, type Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";

// A live key always wins over a test key, whichever variable carries it. The
// committed .env.production ships the sandbox token, so production deployments
// override it by setting a pk_live_ value on either variable at build time.
const candidates = [
  import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN,
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
].filter((v): v is string => typeof v === "string" && v.length > 0);

const clientToken: string | undefined =
  candidates.find((v) => v.startsWith("pk_live_")) ??
  candidates.find((v) => v.startsWith("pk_test_")) ??
  candidates[0];

function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Payments are not configured for this build. Complete payment go-live to enable production checkout.",
  );
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

export function paymentsConfigured(): boolean {
  return Boolean(clientToken?.startsWith("pk_test_") || clientToken?.startsWith("pk_live_"));
}
