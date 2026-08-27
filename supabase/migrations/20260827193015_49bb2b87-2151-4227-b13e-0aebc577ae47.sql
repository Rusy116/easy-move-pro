CREATE TABLE public.demand_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  query_norm text GENERATED ALWAYS AS (lower(btrim(query))) STORED,
  source text NOT NULL CHECK (source IN ('gsc','dataforseo','internal')),
  collected_at timestamptz NOT NULL,
  window_start date NOT NULL,
  window_end date NOT NULL,
  geo text NOT NULL DEFAULT 'US',
  search_volume integer NULL,
  impressions integer NULL,
  clicks integer NULL,
  ctr numeric NULL,
  avg_position numeric NULL,
  trend_delta_90 numeric NULL,
  cpc_cents integer NULL,
  competition numeric NULL,
  source_reference jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT demand_signals_unique_window UNIQUE (query_norm, source, window_start, geo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_signals TO authenticated;
GRANT ALL ON public.demand_signals TO service_role;

ALTER TABLE public.demand_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage demand signals"
ON public.demand_signals
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_demand_signals_query_norm ON public.demand_signals (query_norm);
CREATE INDEX idx_demand_signals_collected_at ON public.demand_signals (collected_at DESC);

ALTER TABLE public.pdf_opportunities
  ADD COLUMN verification text NOT NULL DEFAULT 'legacy_unverified'
    CHECK (verification IN ('legacy_unverified','real_verified')),
  ADD COLUMN approval text NOT NULL DEFAULT 'not_required'
    CHECK (approval IN ('not_required','pending','approved','rejected','snoozed')),
  ADD COLUMN confidence numeric NULL,
  ADD COLUMN evidence jsonb NULL,
  ADD COLUMN approved_by uuid NULL,
  ADD COLUMN approved_at timestamptz NULL,
  ADD COLUMN snooze_until timestamptz NULL,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER update_pdf_opportunities_updated_at
BEFORE UPDATE ON public.pdf_opportunities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pdf_opportunities_pending_review
  ON public.pdf_opportunities (priority DESC)
  WHERE approval = 'pending';

ALTER TABLE public.pdf_keywords
  ADD COLUMN verification text NOT NULL DEFAULT 'legacy_unverified'
    CHECK (verification IN ('legacy_unverified','real_verified')),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER update_pdf_keywords_updated_at
BEFORE UPDATE ON public.pdf_keywords
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();