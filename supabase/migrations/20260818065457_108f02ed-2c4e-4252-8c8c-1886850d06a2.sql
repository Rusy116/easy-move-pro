-- 1. Line items for store orders
CREATE TABLE public.store_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_slug TEXT NOT NULL,
  product_title TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (order_id, product_slug)
);

-- 2. Grants (all access runs through trusted server code / service role)
GRANT ALL ON public.store_order_items TO service_role;

-- 3. RLS
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;

-- 4. Policies: no client role may read or write directly.
CREATE POLICY "Staff read store order items"
  ON public.store_order_items
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_store_order_items_order ON public.store_order_items(order_id);
CREATE INDEX idx_store_order_items_slug ON public.store_order_items(product_slug);

CREATE TRIGGER trg_store_order_items_updated_at
  BEFORE UPDATE ON public.store_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Backfill existing orders as single-line orders
INSERT INTO public.store_order_items (order_id, product_slug, product_title, amount_cents, created_at)
SELECT o.id, o.product_slug, coalesce(o.product_title, o.product_slug), coalesce(o.amount_cents, 0), o.created_at
  FROM public.store_orders o
 WHERE o.product_slug IS NOT NULL
ON CONFLICT (order_id, product_slug) DO NOTHING;

-- 6. Claim routine now mirrors every line item into the library
CREATE OR REPLACE FUNCTION public.fn_claim_my_records()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce((auth.jwt() ->> 'email'), ''));
  v_orders int := 0;
  v_quotes int := 0;
  v_library int := 0;
BEGIN
  IF v_uid IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('orders', 0, 'quotes', 0, 'library', 0);
  END IF;

  UPDATE public.store_orders
     SET user_id = v_uid
   WHERE user_id IS NULL AND lower(email) = v_email;
  GET DIAGNOSTICS v_orders = ROW_COUNT;

  UPDATE public.quotes
     SET user_id = v_uid
   WHERE user_id IS NULL AND lower(contact_email) = v_email;
  GET DIAGNOSTICS v_quotes = ROW_COUNT;

  INSERT INTO public.customer_purchases
    (user_id, product_slug, title, version, amount_cents, currency, status, purchased_at)
  SELECT DISTINCT ON (i.product_slug)
         v_uid,
         i.product_slug,
         i.product_title,
         '1',
         i.amount_cents,
         o.currency,
         'completed',
         coalesce(o.paid_at, o.created_at)
    FROM public.store_orders o
    JOIN public.store_order_items i ON i.order_id = o.id
   WHERE o.user_id = v_uid
     AND o.status = 'paid'
   ORDER BY i.product_slug, o.paid_at DESC NULLS LAST
  ON CONFLICT (user_id, product_slug) WHERE product_slug IS NOT NULL
  DO UPDATE SET status = 'completed', refunded_at = NULL;
  GET DIAGNOSTICS v_library = ROW_COUNT;

  RETURN jsonb_build_object('orders', v_orders, 'quotes', v_quotes, 'library', v_library);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_claim_my_records() FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_claim_my_records() TO authenticated;