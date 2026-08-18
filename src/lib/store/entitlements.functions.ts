// ---------------------------------------------------------------------------
// Digital store — permanent entitlements and receipts.
//
// Emailed download links are deliberately short-lived, but ownership never
// expires: a signed-in customer can always mint a fresh link from their
// library, and every paid order has a receipt.
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function clean(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

export type LibraryLinkResult = { url: string } | { error: string };

/**
 * Mints a fresh download link for a product the signed-in user owns.
 * Ownership is re-checked against the order table on every call, so refunded
 * or disputed purchases stop working immediately.
 */
export const issueLibraryDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productSlug: string }) => {
    const productSlug = clean(d?.productSlug, 100);
    if (!/^[a-z0-9-]+$/.test(productSlug)) throw new Error("Invalid product");
    return { productSlug };
  })
  .handler(async ({ data, context }): Promise<LibraryLinkResult> => {
    const { admin, getDownloadUrl } = await import("@/lib/store/orders.server");
    const db = await admin();

    const { data: itemRows } = await db
      .from("store_order_items")
      .select("order_id,product_slug,store_orders!inner(id,user_id,status,created_at)")
      .eq("product_slug", data.productSlug)
      .eq("store_orders.user_id", context.userId)
      .eq("store_orders.status", "paid")
      .order("created_at", { ascending: false })
      .limit(1);

    let orderId: string | undefined = (itemRows ?? [])[0]?.order_id;

    // Legacy orders (pre line items) still carry the slug on the header.
    if (!orderId) {
      const { data: orders } = await db
        .from("store_orders")
        .select("id")
        .eq("user_id", context.userId)
        .eq("product_slug", data.productSlug)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(1);
      orderId = (orders ?? [])[0]?.id;
    }

    if (!orderId) return { error: "This product is not in your library." };

    return { url: await getDownloadUrl(orderId, data.productSlug) };
  });

export type ReceiptView = {
  orderNumber: string;
  productTitle: string;
  productSlug: string;
  amountCents: number;
  currency: string;
  status: string;
  purchasedAt: string | null;
  email: string;
  buyerName: string;
};

/** Reads one receipt from a signed receipt token (works for guests). */
export const getReceipt = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => ({ token: clean(d?.token, 800) }))
  .handler(async ({ data }): Promise<{ receipt: ReceiptView } | { error: string }> => {
    const { admin, verifyReceiptToken } = await import("@/lib/store/orders.server");
    const claim = await verifyReceiptToken(data.token);
    if (!claim) return { error: "This receipt link is not valid or has expired." };

    const db = await admin();
    const { data: order } = await db
      .from("store_orders")
      .select("*")
      .eq("id", claim.o)
      .maybeSingle();
    if (!order || order.status === "pending") return { error: "Receipt not found." };

    return {
      receipt: {
        orderNumber: order.order_number,
        productTitle: order.product_title,
        productSlug: order.product_slug,
        amountCents: Number(order.amount_cents ?? 0),
        currency: String(order.currency ?? "usd").toUpperCase(),
        status: order.status,
        purchasedAt: order.paid_at ?? order.created_at,
        email: order.email,
        buyerName: [order.first_name, order.last_name].filter(Boolean).join(" "),
      },
    };
  });

export type MyOrderRow = ReceiptView & { receiptUrl: string; downloadable: boolean };

/** Order history for the signed-in customer, each with a receipt link. */
export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyOrderRow[]> => {
    const { admin, signReceiptToken, siteOrigin } = await import("@/lib/store/orders.server");
    const db = await admin();

    const { data: orders } = await db
      .from("store_orders")
      .select("*")
      .eq("user_id", context.userId)
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);

    const origin = siteOrigin();
    const rows: MyOrderRow[] = [];
    for (const order of (orders ?? []) as any[]) {
      rows.push({
        orderNumber: order.order_number,
        productTitle: order.product_title,
        productSlug: order.product_slug,
        amountCents: Number(order.amount_cents ?? 0),
        currency: String(order.currency ?? "usd").toUpperCase(),
        status: order.status,
        purchasedAt: order.paid_at ?? order.created_at,
        email: order.email,
        buyerName: [order.first_name, order.last_name].filter(Boolean).join(" "),
        receiptUrl: `${origin}/receipt?t=${await signReceiptToken(order.id)}`,
        downloadable: order.status === "paid",
      });
    }
    return rows;
  });
