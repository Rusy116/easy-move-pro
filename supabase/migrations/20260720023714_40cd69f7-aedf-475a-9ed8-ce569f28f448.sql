CREATE TYPE public.partner_application_status AS ENUM ('draft','submitted','reviewing','approved','rejected');

CREATE TABLE public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.partner_application_status NOT NULL DEFAULT 'submitted',
  company_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  website text,
  years_in_business integer,
  usdot_number text,
  mc_number text,
  insurance_carrier text,
  insurance_policy text,
  service_states text[] DEFAULT '{}',
  service_cities text[] DEFAULT '{}',
  service_radius_miles integer,
  trucks_count integer,
  crew_size integer,
  services_offered text[] DEFAULT '{}',
  source text DEFAULT 'seo_partners',
  utm jsonb DEFAULT '{}'::jsonb,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.partner_applications TO authenticated;
GRANT INSERT ON public.partner_applications TO anon;
GRANT ALL ON public.partner_applications TO service_role;

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit application" ON public.partner_applications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Owner can view own application" ON public.partner_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Owner can update own application" ON public.partner_applications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage applications" ON public.partner_applications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.tg_partner_apps_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_partner_applications_updated_at
  BEFORE UPDATE ON public.partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_partner_apps_touch();

CREATE INDEX idx_partner_apps_status ON public.partner_applications(status, created_at DESC);
CREATE INDEX idx_partner_apps_user ON public.partner_applications(user_id);