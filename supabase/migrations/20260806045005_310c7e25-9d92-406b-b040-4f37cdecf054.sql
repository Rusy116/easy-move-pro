CREATE TABLE public.city_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  city text NOT NULL,
  state_code text NOT NULL,
  state_name text NOT NULL,
  county text,
  population integer,
  timezone text,
  zip_codes text[] NOT NULL DEFAULT '{}',
  neighborhoods text[] NOT NULL DEFAULT '{}',
  nearby_cities jsonb NOT NULL DEFAULT '[]'::jsonb,
  highways text[] NOT NULL DEFAULT '{}',
  facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  word_count integer NOT NULL DEFAULT 0,
  seo_score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  source text NOT NULL DEFAULT 'ai',
  error text,
  run_id uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_city_landing_status ON public.city_landing_pages (status);
CREATE INDEX idx_city_landing_state ON public.city_landing_pages (state_code);
CREATE INDEX idx_city_landing_created ON public.city_landing_pages (created_at DESC);

GRANT SELECT ON public.city_landing_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.city_landing_pages TO authenticated;
GRANT ALL ON public.city_landing_pages TO service_role;

ALTER TABLE public.city_landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published city pages are public"
  ON public.city_landing_pages FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Admins manage city pages"
  ON public.city_landing_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.city_landing_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  state_code text,
  city_slugs text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'running',
  cursor integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  generated integer NOT NULL DEFAULT 0,
  published integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  last_error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.city_landing_runs TO authenticated;
GRANT ALL ON public.city_landing_runs TO service_role;

ALTER TABLE public.city_landing_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage city landing runs"
  ON public.city_landing_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_city_landing_pages_updated
  BEFORE UPDATE ON public.city_landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_city_landing_runs_updated
  BEFORE UPDATE ON public.city_landing_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_agents (key, name, description, category, status, enabled, sort_order, priority, capabilities, queue, version)
VALUES (
  'city_landing_agent',
  'City Landing & Calculator Agent',
  'Generates SEO city landing pages with the embedded Easy Moving calculator for every US city.',
  'seo',
  'idle',
  true,
  20,
  4,
  ARRAY['city.generate_page','city.generate_state','city.generate_usa','city.seo_validate','city.publish'],
  'city_landing',
  '1.0.0'
)
ON CONFLICT (key) DO NOTHING;