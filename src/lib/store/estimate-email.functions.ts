// ---------------------------------------------------------------------------
// Calculator lead follow-up email.
//
// Fire-and-forget from the calculator once a quote is saved. The email address
// is never trusted from the client for lookup: the quote is resolved by number
// + portal token, and we email the address stored on that quote.
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";

export const sendCalculatorEstimateEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { quoteNumber: string; token: string }) => ({
    quoteNumber: String(d.quoteNumber ?? "").trim().slice(0, 60),
    token: String(d.token ?? "").trim().slice(0, 200),
  }))
  .handler(async ({ data }): Promise<{ sent: boolean; reason?: string }> => {
    const { logDelivery } = await import("@/lib/notify/deliveries.server");
    // Every early exit is audited too — a moving request must never fail to
    // email the customer without a visible trace.
    const skip = async (reason: string, recipient = "") => {
      console.warn(`[estimate] email skipped for ${data.quoteNumber || "(no quote)"}: ${reason}`);
      await logDelivery({
        channel: "email",
        template: "moving-estimate",
        recipient: recipient || "unknown@unknown",
        status: "skipped",
        reason,
        refType: "quote",
        idempotencyKey: `moving-estimate-${data.quoteNumber}`,
      });
      return { sent: false, reason };
    };

    if (!data.quoteNumber || !data.token) return skip("invalid");
    const { admin, siteOrigin } = await import("@/lib/store/orders.server");
    const { sendEstimateEmail } = await import("@/lib/store/email.server");
    const db = await admin();

    const { data: quote, error: quoteError } = await db
      .from("quotes")
      .select(
        "id,quote_number,portal_token,contact_email,contact_phone,details,estimated_low,estimated_high," +
          "origin_city,origin_state,origin_zip,destination_city,destination_state,destination_zip," +
          "move_date,move_size,bedrooms,distance_miles,packing,unpacking,storage,assembly,junk_removal," +
          "estimate_email_sent_at",
      )
      .eq("quote_number", data.quoteNumber)
      .maybeSingle();

    if (!quote || !quote.portal_token || quote.portal_token !== data.token) {
      return { sent: false, reason: "not_authorized" };
    }
    if (!quote.contact_email) return { sent: false, reason: "no_email" };
    // Guard against duplicate sends (double submit, client retry, re-render).
    if (quote.estimate_email_sent_at) return { sent: false, reason: "already_sent" };

    const usd = (cents: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Number(cents ?? 0));

    const place = (city?: string | null, state?: string | null, zip?: string | null) =>
      [[city, state].filter(Boolean).join(", "), zip].filter(Boolean).join(" ") || null;

    const services = [
      quote.packing ? "Packing" : null,
      quote.unpacking ? "Unpacking" : null,
      quote.storage ? "Storage" : null,
      quote.assembly ? "Furniture assembly" : null,
      quote.junk_removal ? "Junk removal" : null,
    ].filter(Boolean) as string[];

    const moveDateLabel = quote.move_date
      ? new Date(`${quote.move_date}T00:00:00`).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;

    const origin = siteOrigin();
    let result: { sent: boolean; reason?: string };
    try {
      result = await sendEstimateEmail({
        to: quote.contact_email,
        firstName: String((quote.details as any)?.fullName ?? "").split(" ")[0] || null,
        fullName: String((quote.details as any)?.fullName ?? "") || null,
        amountLabel: `${usd(quote.estimated_low)} – ${usd(quote.estimated_high)}`,
        quoteNumber: quote.quote_number,
        originLabel: place(quote.origin_city, quote.origin_state, quote.origin_zip),
        destinationLabel: place(
          quote.destination_city,
          quote.destination_state,
          quote.destination_zip,
        ),
        moveDateLabel,
        moveSizeLabel:
          quote.move_size ??
          (quote.bedrooms ? `${quote.bedrooms} bedroom${quote.bedrooms > 1 ? "s" : ""}` : null),
        distanceLabel: quote.distance_miles
          ? `${Math.round(Number(quote.distance_miles))} miles`
          : null,
        servicesLabel: services.length ? services.join(", ") : null,
        quoteUrl: `${origin}/portal/${quote.quote_number}?token=${quote.portal_token}`,
        accountUrl: `${origin}/auth?signup=1&email=${encodeURIComponent(quote.contact_email)}`,
        loginUrl: `${origin}/auth`,
      });
    } catch (err) {
      result = { sent: false, reason: err instanceof Error ? err.message : "send_failed" };
    }

    if (result.sent) {
      await db
        .from("quotes")
        .update({ estimate_email_sent_at: new Date().toISOString() })
        .eq("id", quote.id);
    }

    // Existing internal admin notification stream (same table the Admin leads
    // workspace already subscribes to) — a new moving request shows up live.
    try {
      await db.from("admin_notifications").insert({
        type: "new_moving_request",
        quote_id: quote.id,
        message: `New moving request ${quote.quote_number} from ${
          String((quote.details as any)?.fullName ?? "a customer")
        }`,
      });
    } catch (error) {
      console.error("[estimate] admin notification failed:", error);
    }

    // Audit the delivery attempt so support can see whether the customer was
    // ever emailed, and re-send from the same server function if not.
    const { data: row } = await db
      .from("quotes")
      .select("id")
      .eq("quote_number", data.quoteNumber)
      .maybeSingle();
    if (row?.id) {
      await db.from("lead_events").insert({
        quote_id: row.id,
        actor_type: "system",
        event_type: result.sent ? "estimate_email_sent" : "estimate_email_failed",
        payload: { to: quote.contact_email, reason: result.reason ?? null },
        is_public: false,
      });
    }
    // Transactional confirmation text to the number the customer entered on
    // their own request. Never sent to any other party.
    if (quote.contact_phone) {
      try {
        const { sendSms } = await import("@/lib/notify/sms.server");
        await sendSms({
          template: "quote-received",
          to: quote.contact_phone,
          data: {
            quoteNumber: quote.quote_number,
            amountLabel: `${usd(quote.estimated_low)} - ${usd(quote.estimated_high)}`,
          },
          refType: "quote",
          refId: row?.id ?? null,
          idempotencyKey: `quote-received-${quote.quote_number}`,
        });
      } catch (error) {
        console.error("[estimate] confirmation SMS failed:", error);
      }
    }

    return result;
  });
