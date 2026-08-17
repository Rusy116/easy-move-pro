DROP POLICY IF EXISTS "activity readable by company or staff" ON public.company_activity;
CREATE POLICY "activity readable by company or staff"
ON public.company_activity FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'broker'::app_role)
  OR (company_id IS NOT NULL AND public.fn_is_company_member(company_id))
  OR (quote_id IS NOT NULL AND public.fn_owns_quote(quote_id))
);

DROP POLICY IF EXISTS "status history readable by company or staff" ON public.company_status_history;
CREATE POLICY "status history readable by company or staff"
ON public.company_status_history FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'broker'::app_role)
  OR (company_id IS NOT NULL AND public.fn_is_company_member(company_id))
  OR (quote_id IS NOT NULL AND public.fn_owns_quote(quote_id))
);