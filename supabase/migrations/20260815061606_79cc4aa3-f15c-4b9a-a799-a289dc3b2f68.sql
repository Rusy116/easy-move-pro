
CREATE TABLE public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  first_name text,
  last_name text,
  product_slug text NOT NULL,
  product_title text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  environment text NOT NULL DEFAULT 'sandbox',
  stripe_session_id text UNIQUE,
  stripe_payment_intent text,
  paid_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_orders_email ON public.store_orders (lower(email));
CREATE INDEX idx_store_orders_user ON public.store_orders (user_id);

GRANT SELECT ON public.store_orders TO authenticated;
GRANT ALL ON public.store_orders TO service_role;

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own orders"
  ON public.store_orders FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );

CREATE POLICY "Service role manages orders"
  ON public.store_orders FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_store_orders_updated_at
  BEFORE UPDATE ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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
BEGIN
  IF v_uid IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('orders', 0, 'quotes', 0);
  END IF;

  UPDATE public.store_orders
     SET user_id = v_uid
   WHERE user_id IS NULL AND lower(email) = v_email;
  GET DIAGNOSTICS v_orders = ROW_COUNT;

  UPDATE public.quotes
     SET user_id = v_uid
   WHERE user_id IS NULL AND lower(contact_email) = v_email;
  GET DIAGNOSTICS v_quotes = ROW_COUNT;

  RETURN jsonb_build_object('orders', v_orders, 'quotes', v_quotes);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_claim_my_records() FROM public;
GRANT EXECUTE ON FUNCTION public.fn_claim_my_records() TO authenticated;
