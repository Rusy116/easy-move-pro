CREATE TABLE public.usa_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL DEFAULT 'US',
  city_slug text NOT NULL,
  city_name text NOT NULL,
  state_name text NOT NULL,
  state_code text NOT NULL,
  county text,
  latitude numeric,
  longitude numeric,
  population integer NOT NULL DEFAULT 0,
  timezone text,
  zip_codes text[] NOT NULL DEFAULT '{}',
  area_codes text[] NOT NULL DEFAULT '{}',
  nearby_cities jsonb NOT NULL DEFAULT '[]'::jsonb,
  demand_score integer NOT NULL DEFAULT 0,
  seo_priority integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  pipeline_status text NOT NULL DEFAULT 'queued',
  calculator_status text NOT NULL DEFAULT 'pending',
  seo_page_status text NOT NULL DEFAULT 'pending',
  calculator_slug text,
  seo_slug text,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  last_published_at timestamptz,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usa_cities_unique_city UNIQUE (country, city_slug, state_code)
);

CREATE INDEX idx_usa_cities_status ON public.usa_cities (pipeline_status);
CREATE INDEX idx_usa_cities_priority ON public.usa_cities (seo_priority DESC, population DESC);
CREATE INDEX idx_usa_cities_state ON public.usa_cities (state_code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usa_cities TO authenticated;
GRANT ALL ON public.usa_cities TO service_role;
ALTER TABLE public.usa_cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage usa_cities" ON public.usa_cities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_usa_cities_updated_at BEFORE UPDATE ON public.usa_cities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.usa_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'usa',
  state_code text,
  requested integer NOT NULL DEFAULT 0,
  cursor integer NOT NULL DEFAULT 0,
  imported integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  processed integer NOT NULL DEFAULT 0,
  completed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  avg_ms integer NOT NULL DEFAULT 0,
  last_error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usa_import_runs TO authenticated;
GRANT ALL ON public.usa_import_runs TO service_role;
ALTER TABLE public.usa_import_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage usa_import_runs" ON public.usa_import_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_usa_import_runs_updated_at BEFORE UPDATE ON public.usa_import_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();