
CREATE TABLE public.pdf_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pdf_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_categories TO authenticated;
GRANT ALL ON public.pdf_categories TO service_role;
ALTER TABLE public.pdf_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_categories public read" ON public.pdf_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pdf_categories admin all" ON public.pdf_categories FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE public.pdf_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  category_slug text NOT NULL DEFAULT 'checklists',
  collection_slug text,
  tags text[] NOT NULL DEFAULT '{}',
  target_keywords text[] NOT NULL DEFAULT '{}',
  difficulty text NOT NULL DEFAULT 'beginner',
  language text NOT NULL DEFAULT 'en',
  version text NOT NULL DEFAULT '1.0',
  page_count integer NOT NULL DEFAULT 0,
  price_cents integer NOT NULL DEFAULT 0,
  compare_at_cents integer,
  status text NOT NULL DEFAULT 'draft',
  quality_score integer,
  seo_score integer,
  ai_prompt text,
  description text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  whats_included jsonb NOT NULL DEFAULT '[]'::jsonb,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_url text,
  preview_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  og_image_url text,
  social_image_url text,
  alt_text text,
  file_url text,
  file_size_kb integer,
  seo_title text,
  meta_description text,
  canonical_url text,
  related_products text[] NOT NULL DEFAULT '{}',
  related_cities text[] NOT NULL DEFAULT '{}',
  related_articles text[] NOT NULL DEFAULT '{}',
  related_calculators text[] NOT NULL DEFAULT '{}',
  is_featured boolean NOT NULL DEFAULT false,
  is_bestseller boolean NOT NULL DEFAULT false,
  downloads integer NOT NULL DEFAULT 0,
  views integer NOT NULL DEFAULT 0,
  revenue_cents integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pdf_products_status ON public.pdf_products(status, published_at DESC);
CREATE INDEX idx_pdf_products_category ON public.pdf_products(category_slug);
GRANT SELECT ON public.pdf_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_products TO authenticated;
GRANT ALL ON public.pdf_products TO service_role;
ALTER TABLE public.pdf_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_products public read" ON public.pdf_products FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "pdf_products admin all" ON public.pdf_products FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_pdf_products_updated BEFORE UPDATE ON public.pdf_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pdf_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug text NOT NULL,
  title text NOT NULL,
  category_slug text NOT NULL DEFAULT 'checklists',
  brief text,
  stage integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  priority integer NOT NULL DEFAULT 100,
  stage_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  leased_until timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_pdf_jobs_slug ON public.pdf_jobs(product_slug);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_jobs TO authenticated;
GRANT ALL ON public.pdf_jobs TO service_role;
ALTER TABLE public.pdf_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_jobs admin all" ON public.pdf_jobs FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_pdf_jobs_updated BEFORE UPDATE ON public.pdf_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pdf_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  title text NOT NULL,
  category_slug text NOT NULL DEFAULT 'checklists',
  demand_score integer NOT NULL DEFAULT 0,
  difficulty_score integer NOT NULL DEFAULT 0,
  priority integer NOT NULL DEFAULT 0,
  gap_reason text,
  source text NOT NULL DEFAULT 'ai',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pdf_opps_status ON public.pdf_opportunities(status, priority DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_opportunities TO authenticated;
GRANT ALL ON public.pdf_opportunities TO service_role;
ALTER TABLE public.pdf_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_opps admin all" ON public.pdf_opportunities FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE public.pdf_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_favorites TO authenticated;
GRANT ALL ON public.pdf_favorites TO service_role;
ALTER TABLE public.pdf_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_favorites own" ON public.pdf_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.pdf_recent_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_recent_views TO authenticated;
GRANT ALL ON public.pdf_recent_views TO service_role;
ALTER TABLE public.pdf_recent_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_recent_views own" ON public.pdf_recent_views FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.pdf_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  downloaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pdf_downloads_user ON public.pdf_downloads(user_id, downloaded_at DESC);
GRANT SELECT, INSERT ON public.pdf_downloads TO authenticated;
GRANT ALL ON public.pdf_downloads TO service_role;
ALTER TABLE public.pdf_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_downloads own read" ON public.pdf_downloads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_staff());
CREATE POLICY "pdf_downloads own insert" ON public.pdf_downloads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

INSERT INTO public.pdf_categories (slug, name, description, icon, sort_order) VALUES
 ('checklists','Moving Checklists','Step-by-step printable checklists for every stage of a move.','check-square',1),
 ('planners','Planners & Timelines','Week-by-week planners and moving timelines.','calendar',2),
 ('budget','Budget & Cost','Budget worksheets, cost calculators and expense trackers.','wallet',3),
 ('inventory','Inventory & Labels','Inventory sheets, box labels and room tags.','boxes',4),
 ('packing','Packing Guides','Packing techniques, fragile-item guides and supply lists.','package',5),
 ('family','Family & Pets','Moving with kids, seniors and pets.','users',6),
 ('business','Business & Office','Office relocation and commercial move templates.','briefcase',7),
 ('movers','For Moving Companies','Operational templates for professional movers.','truck',8);
