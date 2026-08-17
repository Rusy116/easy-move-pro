ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE INDEX IF NOT EXISTS store_orders_payment_intent_idx
  ON public.store_orders (stripe_payment_intent);
CREATE INDEX IF NOT EXISTS store_orders_email_status_idx
  ON public.store_orders (lower(email), status);

ALTER TABLE public.customer_purchases
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;