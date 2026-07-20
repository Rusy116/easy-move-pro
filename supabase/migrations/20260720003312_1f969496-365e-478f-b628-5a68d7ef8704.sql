
-- =========================================================================
-- Phase 1: Lead Assignment Engine — schema foundation
-- =========================================================================

-- 1. Enums --------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.lead_phase_enum AS ENUM ('unassigned','exclusive','open_market','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.assignment_state_enum AS ENUM
    ('invited','active','quoted','accepted','won','lost','declined','withdrawn','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_closed_reason_enum AS ENUM
    ('won','lost','cancelled','duplicate','invalid','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. quotes — additive columns -----------------------------------------
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS lead_phase public.lead_phase_enum NOT NULL DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS exclusive_assignment_id uuid,
  ADD COLUMN IF NOT EXISTS exclusive_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS exclusive_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS exclusive_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS exclusive_pause_reason text,
  ADD COLUMN IF NOT EXISTS open_market_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_reason public.lead_closed_reason_enum,
  ADD COLUMN IF NOT EXISTS visibility_mask jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS quotes_lead_phase_idx           ON public.quotes(lead_phase);
CREATE INDEX IF NOT EXISTS quotes_exclusive_expires_at_idx ON public.quotes(exclusive_expires_at)
  WHERE lead_phase = 'exclusive';
CREATE INDEX IF NOT EXISTS quotes_open_market_opened_idx   ON public.quotes(open_market_opened_at);

-- 3. quote_assignments — restructure -----------------------------------
ALTER TABLE public.quote_assignments
  ADD COLUMN IF NOT EXISTS state public.assignment_state_enum NOT NULL DEFAULT 'invited',
  ADD COLUMN IF NOT EXISTS invited_at    timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS viewed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS contacted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS quoted_at     timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at   timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS sla_due_at    timestamptz,
  ADD COLUMN IF NOT EXISTS is_exclusive  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quoted_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS decline_reason text,
  ADD COLUMN IF NOT EXISTS override_mask jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS qa_state_idx        ON public.quote_assignments(state);
CREATE INDEX IF NOT EXISTS qa_sla_due_idx      ON public.quote_assignments(sla_due_at)
  WHERE state IN ('invited','active');
CREATE INDEX IF NOT EXISTS qa_company_state_idx ON public.quote_assignments(company_id, state);

-- 4. moving_companies — extend -----------------------------------------
ALTER TABLE public.moving_companies
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_states text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dot_number text,
  ADD COLUMN IF NOT EXISTS mc_number  text,
  ADD COLUMN IF NOT EXISTS license_status text;

CREATE INDEX IF NOT EXISTS mc_approved_active_idx ON public.moving_companies(approved) WHERE suspended = false;

-- 5. lead_events (new) --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id      uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.quote_assignments(id) ON DELETE SET NULL,
  actor_type    text NOT NULL CHECK (actor_type IN ('system','broker','mover','customer')),
  actor_id      uuid,
  actor_email   text,
  company_id    uuid REFERENCES public.moving_companies(id) ON DELETE SET NULL,
  event_type    text NOT NULL,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.lead_events TO authenticated;
GRANT ALL ON public.lead_events TO service_role;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS lead_events_quote_id_idx      ON public.lead_events(quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_events_assignment_id_idx ON public.lead_events(assignment_id);
CREATE INDEX IF NOT EXISTS lead_events_company_id_idx    ON public.lead_events(company_id);
CREATE INDEX IF NOT EXISTS lead_events_type_idx          ON public.lead_events(event_type);

CREATE POLICY "Admins manage lead_events"
  ON public.lead_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Movers read their company events"
  ON public.lead_events FOR SELECT TO authenticated
  USING (
    company_id IS NOT NULL
    AND company_id = public.current_user_company_id()
  );

CREATE POLICY "Movers read public events on assigned leads"
  ON public.lead_events FOR SELECT TO authenticated
  USING (
    is_public = true
    AND EXISTS (
      SELECT 1 FROM public.quote_assignments qa
      WHERE qa.quote_id = lead_events.quote_id
        AND qa.company_id = public.current_user_company_id()
    )
  );

-- 6. estimate_revisions (new) ------------------------------------------
CREATE TABLE IF NOT EXISTS public.estimate_revisions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.quote_assignments(id) ON DELETE CASCADE,
  quote_id      uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  company_id    uuid NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  revision      int  NOT NULL DEFAULT 1,
  amount        numeric(12,2) NOT NULL,
  currency      text NOT NULL DEFAULT 'USD',
  valid_until   timestamptz,
  breakdown     jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes         text,
  submitted_by  uuid,
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  is_current    boolean NOT NULL DEFAULT true,
  UNIQUE (assignment_id, revision)
);
GRANT SELECT, INSERT, UPDATE ON public.estimate_revisions TO authenticated;
GRANT ALL ON public.estimate_revisions TO service_role;
ALTER TABLE public.estimate_revisions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS er_quote_idx      ON public.estimate_revisions(quote_id);
CREATE INDEX IF NOT EXISTS er_assignment_idx ON public.estimate_revisions(assignment_id);
CREATE INDEX IF NOT EXISTS er_company_idx    ON public.estimate_revisions(company_id);

CREATE POLICY "Admins manage estimate_revisions"
  ON public.estimate_revisions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Movers read own estimates"
  ON public.estimate_revisions FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id());

CREATE POLICY "Movers insert own estimates"
  ON public.estimate_revisions FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_user_company_id());

CREATE POLICY "Movers update own estimates"
  ON public.estimate_revisions FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());

-- 7. audit_log (new) ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid,
  actor_email  text,
  actor_role   text,
  action       text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    uuid,
  quote_id     uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  reason       text,
  before       jsonb,
  after        jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS audit_quote_idx  ON public.audit_log(quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_action_idx ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS audit_actor_idx  ON public.audit_log(actor_id);

CREATE POLICY "Admins read audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert audit_log"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. sla_policies (new) -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sla_policies (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     text NOT NULL UNIQUE,
  exclusive_window_minutes int  NOT NULL DEFAULT 720, -- 12h
  reminder_minutes         int[] NOT NULL DEFAULT ARRAY[60,180,660]::int[],
  is_default               boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sla_policies TO authenticated;
GRANT ALL ON public.sla_policies TO service_role;
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone authenticated reads sla_policies"
  ON public.sla_policies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage sla_policies"
  ON public.sla_policies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.sla_policies (name, exclusive_window_minutes, is_default)
VALUES ('default-12h', 720, true)
ON CONFLICT (name) DO NOTHING;

-- 9. updated_at trigger for sla_policies -------------------------------
DROP TRIGGER IF EXISTS trg_sla_policies_touch ON public.sla_policies;
CREATE TRIGGER trg_sla_policies_touch
  BEFORE UPDATE ON public.sla_policies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 10. quotes.exclusive_assignment_id FK (deferred, after column exists on qa)
ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_exclusive_assignment_id_fkey;
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_exclusive_assignment_id_fkey
  FOREIGN KEY (exclusive_assignment_id)
  REFERENCES public.quote_assignments(id) ON DELETE SET NULL;
