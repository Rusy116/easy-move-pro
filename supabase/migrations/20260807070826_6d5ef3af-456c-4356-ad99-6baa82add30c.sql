ALTER TABLE public.pdf_products
  ADD COLUMN IF NOT EXISTS is_lead_magnet boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_tier text,
  ADD COLUMN IF NOT EXISTS cover_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS cover_prompt text;

CREATE INDEX IF NOT EXISTS pdf_products_status_price_idx ON public.pdf_products (status, price_cents);
CREATE INDEX IF NOT EXISTS pdf_products_cover_status_idx ON public.pdf_products (cover_status);
