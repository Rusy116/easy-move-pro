CREATE TABLE IF NOT EXISTS public.store_download_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_download_tokens_order_idx ON public.store_download_tokens(order_id);

GRANT ALL ON public.store_download_tokens TO service_role;

ALTER TABLE public.store_download_tokens ENABLE ROW LEVEL SECURITY;