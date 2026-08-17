/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return _supabase;
}

async function orderIdForSession(sessionId: string): Promise<string | null> {
  const { data } = await (getSupabase() as any)
    .from("store_orders")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  return data?.id ?? null;
}

async function markFailed(sessionId: string) {
  await (getSupabase() as any)
    .from("store_orders")
    .update({ status: "failed" })
    .eq("stripe_session_id", sessionId)
    .neq("status", "paid");
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  const object = event.data?.object as any;

  switch (event.type) {
    case "checkout.session.completed":
    case "transaction.completed":
    case "checkout.session.async_payment_succeeded": {
      const sessionId = object?.id;
      if (!sessionId) break;
      // Delayed-notification methods stay "unpaid" until settlement.
      if (event.type === "checkout.session.completed" && object?.payment_status === "unpaid") break;
      const orderId = await orderIdForSession(sessionId);
      if (!orderId) break;
      const { fulfilOrder } = await import("@/lib/store/fulfilment.server");
      await fulfilOrder(getSupabase(), orderId, {
        paymentIntent:
          typeof object?.payment_intent === "string" ? object.payment_intent : null,
      });
      break;
    }
    case "charge.refunded":
    case "charge.dispute.created":
    case "charge.dispute.funds_withdrawn": {
      const paymentIntent =
        typeof object?.payment_intent === "string" ? object.payment_intent : null;
      if (!paymentIntent) break;
      // Partial refunds keep the download alive — only a full refund revokes.
      if (event.type === "charge.refunded") {
        const amount = Number(object?.amount ?? 0);
        const refunded = Number(object?.amount_refunded ?? 0);
        if (amount > 0 && refunded > 0 && refunded < amount) break;
      }
      const { revokeOrder } = await import("@/lib/store/fulfilment.server");
      await revokeOrder(
        getSupabase(),
        { paymentIntent },
        event.type === "charge.refunded" ? "refunded" : "disputed",
      );
      break;
    }
    case "charge.dispute.closed": {
      // Dispute resolved in our favour: give the buyer their access back.
      if (object?.status !== "won") break;
      const paymentIntent =
        typeof object?.payment_intent === "string" ? object.payment_intent : null;
      if (!paymentIntent) break;
      const db = getSupabase();
      const { data: order } = (await db
        .from("store_orders")
        .select("id")
        .eq("stripe_payment_intent", paymentIntent)
        .maybeSingle()) as { data: { id: string } | null };
      if (!order?.id) break;
      const { fulfilOrder } = await import("@/lib/store/fulfilment.server");
      await fulfilOrder(db, order.id, { paymentIntent });
      break;
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
    case "transaction.payment_failed": {
      if (object?.id) await markFailed(object.id);
      break;
    }
    default:
      console.log("[payments-webhook] unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("[payments-webhook] invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv as StripeEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[payments-webhook] error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
