// ---------------------------------------------------------------------------
// Digital store — order line items.
//
// An order can contain several products (cart checkout). Older orders predate
// the line-item table, so every read falls back to the order header.
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface OrderItem {
  slug: string;
  title: string;
  amountCents: number;
}

/** Every product an order paid for, oldest-first. */
export async function loadOrderItems(db: any, order: any): Promise<OrderItem[]> {
  const { data } = await db
    .from("store_order_items")
    .select("product_slug,product_title,amount_cents")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as any[];
  if (rows.length) {
    return rows.map((r) => ({
      slug: r.product_slug,
      title: r.product_title,
      amountCents: Number(r.amount_cents ?? 0),
    }));
  }

  return order?.product_slug
    ? [
        {
          slug: order.product_slug,
          title: order.product_title ?? order.product_slug,
          amountCents: Number(order.amount_cents ?? 0),
        },
      ]
    : [];
}

/** True when the order actually paid for this slug. */
export async function orderIncludes(db: any, order: any, slug: string): Promise<boolean> {
  const items = await loadOrderItems(db, order);
  return items.some((i) => i.slug === slug);
}
