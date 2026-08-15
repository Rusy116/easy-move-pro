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
    if (!data.quoteNumber || !data.token) return { sent: false, reason: "invalid" };
    const { admin, siteOrigin } = await import("@/lib/store/orders.server");
    const { sendEstimateEmail } = await import("@/lib/store/email.server");
    const db = await admin();

    const { data: quote } = await db
      .from("quotes")
      .select(
        "quote_number,portal_token,contact_email,contact_name,estimated_total_low,estimated_total_high",
      )
      .eq("quote_number", data.quoteNumber)
      .maybeSingle();

    if (!quote || !quote.portal_token || quote.portal_token !== data.token) {
      return { sent: false, reason: "not_authorized" };
    }
    if (!quote.contact_email) return { sent: false, reason: "no_email" };

    const usd = (cents: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Number(cents ?? 0));

    const origin = siteOrigin();
    return sendEstimateEmail({
      to: quote.contact_email,
      firstName: String(quote.contact_name ?? "").split(" ")[0] || null,
      amountLabel: `${usd(quote.estimated_total_low)} – ${usd(quote.estimated_total_high)}`,
      quoteNumber: quote.quote_number,
      quoteUrl: `${origin}/portal/${quote.quote_number}?token=${quote.portal_token}`,
      accountUrl: `${origin}/auth?signup=1&email=${encodeURIComponent(quote.contact_email)}`,
    });
  });
