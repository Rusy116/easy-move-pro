-- Deduplicate any existing double library rows before enforcing uniqueness.
DELETE FROM public.customer_purchases a
USING public.customer_purchases b
WHERE a.user_id = b.user_id
  AND a.product_slug IS NOT NULL
  AND a.product_slug = b.product_slug
  AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS customer_purchases_user_slug_uidx
  ON public.customer_purchases (user_id, product_slug)
  WHERE product_slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_claim_my_records()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Mirror every paid order onto the customer's library so purchases made as
  -- a guest are visible after registration.
  INSERT INTO public.customer_purchases
    (user_id, product_slug, title, version, amount_cents, currency, status, purchased_at)
  SELECT DISTINCT ON (o.product_slug)
         v_uid,
         o.product_slug,
         o.product_title,
         '1',
         o.amount_cents,
         o.currency,
         'completed',
         coalesce(o.paid_at, o.created_at)
    FROM public.store_orders o
   WHERE o.user_id = v_uid
     AND o.status = 'paid'
     AND o.product_slug IS NOT NULL
   ORDER BY o.product_slug, o.paid_at DESC NULLS LAST
  ON CONFLICT (user_id, product_slug) WHERE product_slug IS NOT NULL
  DO UPDATE SET status = 'completed', refunded_at = NULL;
  GET DIAGNOSTICS v_library = ROW_COUNT;

  RETURN jsonb_build_object('orders', v_orders, 'quotes', v_quotes, 'library', v_library);
END;
$function$;