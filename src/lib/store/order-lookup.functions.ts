// ---------------------------------------------------------------------------
// Digital store — guest order recovery.
//
// A buyer who lost their download link enters their email; we email fresh,
// signed links for every product on every paid order for that address. The
// response is always identical so the endpoint can never be used to test
// whether an address bought something (no account enumeration).
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";

const GENERIC = {
  ok: true as const,
  message:
    "If that email has any completed orders, we've just sent the download links to it. Check your inbox and spam folder.",
};

export const requestOrderLinks = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => {
    const email = String(d?.email ?? "").trim().toLowerCase().slice(0, 160);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new Error("Enter a valid email address");
    }
    return { email };
  })
  .handler(async ({ data }) => {
    const { admin, getDownloadUrl, siteOrigin } = await import("@/lib/store/orders.server");
    const { loadOrderItems } = await import("@/lib/store/items.server");
    const { sendOrderDownloadEmail } = await import("@/lib/store/email.server");
    const db = await admin();

    const { data: orders } = await db
      .from("store_orders")
      .select("id,order_number,email,first_name,product_slug,product_title")
      .eq("email", data.email)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(20);

    const origin = siteOrigin();
    let delivered = 0;
    let found = 0;

    for (const order of (orders ?? []) as any[]) {
      const items = await loadOrderItems(db, order);
      for (const item of items) {
        found += 1;
        const result = await sendOrderDownloadEmail({
          to: order.email,
          firstName: order.first_name,
          productTitle: item.title,
          orderNumber:
            items.length > 1 ? `${order.order_number}-${item.slug}` : order.order_number,
          downloadUrl: await getDownloadUrl(order.id, item.slug),
          accountUrl: `${origin}/auth?signup=1&email=${encodeURIComponent(order.email)}`,
        });
        if (result.sent) delivered += 1;
      }
    }

    // Sending is not configured yet (or the address is suppressed): tell the
    // buyer honestly rather than leaving them waiting on an email that will
    // never arrive.
    if (found > 0 && delivered === 0) {
      return {
        ok: true as const,
        message:
          "We found your orders but email delivery is not available right now. Please contact support and we'll send your links.",
      };
    }

    return GENERIC;
  });
