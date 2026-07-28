ALTER TABLE public.moving_companies
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS owner_first_name text,
  ADD COLUMN IF NOT EXISTS owner_last_name text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_zip text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS insurance_carrier text,
  ADD COLUMN IF NOT EXISTS insurance_policy text,
  ADD COLUMN IF NOT EXISTS insurance_expires date,
  ADD COLUMN IF NOT EXISTS fleet_size integer,
  ADD COLUMN IF NOT EXISTS movers_count integer,
  ADD COLUMN IF NOT EXISTS service_cities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS services_offered text[] NOT NULL DEFAULT '{}';

DO $$ BEGIN
  ALTER TABLE public.moving_companies
    ADD CONSTRAINT moving_companies_status_chk
    CHECK (status IN ('pending','approved','rejected','suspended'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.moving_companies
SET status = CASE
  WHEN suspended THEN 'suspended'
  WHEN approved THEN 'approved'
  ELSE 'pending' END;

CREATE OR REPLACE FUNCTION public.sync_company_status_flags()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.approved := (NEW.status = 'approved');
  NEW.suspended := (NEW.status = 'suspended');
  NEW.active := (NEW.status <> 'rejected');
  IF NEW.status = 'approved' THEN NEW.license_status := 'active'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_company_status_flags ON public.moving_companies;
CREATE TRIGGER trg_sync_company_status_flags
BEFORE INSERT OR UPDATE ON public.moving_companies
FOR EACH ROW EXECUTE FUNCTION public.sync_company_status_flags();

CREATE POLICY "company-docs admin read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'company-documents' AND public.is_admin());

CREATE POLICY "company-docs admin manage"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'company-documents' AND public.is_admin())
WITH CHECK (bucket_id = 'company-documents' AND public.is_admin());