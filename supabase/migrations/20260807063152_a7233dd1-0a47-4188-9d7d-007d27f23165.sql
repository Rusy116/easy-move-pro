ALTER TABLE public.pdf_products
  ADD COLUMN content jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN cover_spec jsonb NOT NULL DEFAULT '{}'::jsonb;