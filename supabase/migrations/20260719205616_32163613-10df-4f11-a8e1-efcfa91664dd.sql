
-- ===== moving_companies =====
CREATE TABLE public.moving_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  dot_number TEXT,
  mc_number TEXT,
  service_states TEXT[] NOT NULL DEFAULT '{}',
  phone TEXT,
  email TEXT,
  rating NUMERIC(3,2),
  license_status TEXT NOT NULL DEFAULT 'pending',
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moving_companies TO authenticated;
GRANT ALL ON public.moving_companies TO service_role;
ALTER TABLE public.moving_companies ENABLE ROW LEVEL SECURITY;

-- ===== company_members =====
CREATE TABLE public.company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Helper: get the company id for the signed-in user (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid() LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.current_user_company_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_company_id() TO authenticated;

-- ===== quote_assignments =====
CREATE TABLE public.quote_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned',
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contacted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quote_id, company_id)
);
CREATE INDEX ON public.quote_assignments(company_id, status);
CREATE INDEX ON public.quote_assignments(quote_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_assignments TO authenticated;
GRANT ALL ON public.quote_assignments TO service_role;
ALTER TABLE public.quote_assignments ENABLE ROW LEVEL SECURITY;

-- ===== updated_at triggers =====
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_moving_companies_touch BEFORE UPDATE ON public.moving_companies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_quote_assignments_touch BEFORE UPDATE ON public.quote_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== RLS: moving_companies =====
CREATE POLICY "Admins manage companies" ON public.moving_companies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Movers view own company" ON public.moving_companies
  FOR SELECT TO authenticated
  USING (id = public.current_user_company_id());

CREATE POLICY "Movers update own company" ON public.moving_companies
  FOR UPDATE TO authenticated
  USING (id = public.current_user_company_id())
  WITH CHECK (id = public.current_user_company_id());

-- ===== RLS: company_members =====
CREATE POLICY "Admins manage members" ON public.company_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "User views own membership" ON public.company_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ===== RLS: quote_assignments =====
CREATE POLICY "Admins manage assignments" ON public.quote_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Company views own assignments" ON public.quote_assignments
  FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id());

CREATE POLICY "Company updates own assignments" ON public.quote_assignments
  FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());

-- ===== Extend quotes RLS: assigned movers can view their assigned quotes =====
CREATE POLICY "Assigned movers view quote" ON public.quotes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_assignments qa
      WHERE qa.quote_id = quotes.id
        AND qa.company_id = public.current_user_company_id()
    )
  );
