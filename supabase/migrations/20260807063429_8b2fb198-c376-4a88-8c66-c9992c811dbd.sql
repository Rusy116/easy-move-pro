ALTER TABLE public.customer_purchases ADD COLUMN product_slug text;
CREATE INDEX idx_customer_purchases_slug ON public.customer_purchases(user_id, product_slug);