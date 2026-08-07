
CREATE TABLE IF NOT EXISTS public.pdf_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'seed',
  cluster TEXT,
  category_slug TEXT,
  intent TEXT NOT NULL DEFAULT 'informational',
  seasonality TEXT NOT NULL DEFAULT 'evergreen',
  volume_score INT NOT NULL DEFAULT 0,
  difficulty_score INT NOT NULL DEFAULT 0,
  opportunity_score INT NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pdf_keywords_keyword_key ON public.pdf_keywords (lower(keyword));
GRANT ALL ON public.pdf_keywords TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_keywords TO authenticated;
ALTER TABLE public.pdf_keywords ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage pdf keywords" ON public.pdf_keywords;
CREATE POLICY "Admins manage pdf keywords" ON public.pdf_keywords FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.pdf_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_slug)
);
GRANT ALL ON public.pdf_reviews TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_reviews TO authenticated;
GRANT SELECT ON public.pdf_reviews TO anon;
ALTER TABLE public.pdf_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Approved reviews are public" ON public.pdf_reviews;
CREATE POLICY "Approved reviews are public" ON public.pdf_reviews FOR SELECT TO anon, authenticated
  USING (status = 'approved');
DROP POLICY IF EXISTS "Users manage own reviews" ON public.pdf_reviews;
CREATE POLICY "Users manage own reviews" ON public.pdf_reviews FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.pdf_worker_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger TEXT NOT NULL DEFAULT 'manual',
  processed INT NOT NULL DEFAULT 0,
  published INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  discovered INT NOT NULL DEFAULT 0,
  improved INT NOT NULL DEFAULT 0,
  duration_ms INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.pdf_worker_runs TO service_role;
GRANT SELECT ON public.pdf_worker_runs TO authenticated;
ALTER TABLE public.pdf_worker_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read pdf worker runs" ON public.pdf_worker_runs;
CREATE POLICY "Admins read pdf worker runs" ON public.pdf_worker_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.pdf_publish_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_slug TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.pdf_publish_log TO service_role;
GRANT SELECT ON public.pdf_publish_log TO authenticated;
ALTER TABLE public.pdf_publish_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read pdf publish log" ON public.pdf_publish_log;
CREATE POLICY "Admins read pdf publish log" ON public.pdf_publish_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.pdf_factory_settings (
  id INT NOT NULL PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  autopilot BOOLEAN NOT NULL DEFAULT false,
  daily_target INT NOT NULL DEFAULT 10,
  batch_size INT NOT NULL DEFAULT 2,
  min_seo_score INT NOT NULL DEFAULT 95,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.pdf_factory_settings TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.pdf_factory_settings TO authenticated;
ALTER TABLE public.pdf_factory_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage pdf factory settings" ON public.pdf_factory_settings;
CREATE POLICY "Admins manage pdf factory settings" ON public.pdf_factory_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.pdf_factory_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.pdf_products
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impressions INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bundle_slugs TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS improvement_notes TEXT,
  ADD COLUMN IF NOT EXISTS last_improved_at TIMESTAMPTZ;
