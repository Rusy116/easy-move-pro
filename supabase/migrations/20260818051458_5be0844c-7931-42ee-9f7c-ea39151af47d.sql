CREATE OR REPLACE FUNCTION public.guard_moving_company_vetting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  privileged boolean;
BEGIN
  privileged := (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role))
                OR current_setting('role', true) = 'service_role'
                OR current_setting('request.jwt.claim.role', true) = 'service_role'
                OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role';

  IF NOT COALESCE(privileged, false) THEN
    NEW.approved         := OLD.approved;
    NEW.suspended        := OLD.suspended;
    NEW.status           := OLD.status;
    NEW.license_status   := OLD.license_status;
    NEW.rating           := OLD.rating;
    NEW.active           := OLD.active;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.reviewed_at      := OLD.reviewed_at;
    NEW.reviewed_by      := OLD.reviewed_by;
    NEW.notes            := OLD.notes;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_moving_company_vetting() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_moving_company_vetting ON public.moving_companies;
CREATE TRIGGER trg_guard_moving_company_vetting
BEFORE UPDATE ON public.moving_companies
FOR EACH ROW EXECUTE FUNCTION public.guard_moving_company_vetting();

-- Keep the mover policy row-scoped and explicit about not escaping their own company.
DROP POLICY IF EXISTS "Movers update own company" ON public.moving_companies;
CREATE POLICY "Movers update own company"
ON public.moving_companies
FOR UPDATE
TO authenticated
USING (id = public.current_user_company_id())
WITH CHECK (id = public.current_user_company_id());