-- Helper: can the current user work this lead (admin, or broker on own/unassigned lead)?
CREATE OR REPLACE FUNCTION public.fn_can_work_lead(_quote_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
     OR (
       public.has_role(auth.uid(), 'broker'::public.app_role)
       AND EXISTS (
         SELECT 1 FROM public.quotes q
         WHERE q.id = _quote_id
           AND (q.assigned_broker_id IS NULL OR q.assigned_broker_id = auth.uid())
       )
     );
$$;

GRANT EXECUTE ON FUNCTION public.fn_can_work_lead(uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_communications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_documents TO authenticated;

CREATE POLICY "Brokers manage communications on their leads"
ON public.lead_communications FOR ALL TO authenticated
USING (public.fn_can_work_lead(quote_id))
WITH CHECK (public.fn_can_work_lead(quote_id));

CREATE POLICY "Brokers manage tasks on their leads"
ON public.lead_tasks FOR ALL TO authenticated
USING (public.fn_can_work_lead(quote_id))
WITH CHECK (public.fn_can_work_lead(quote_id));

CREATE POLICY "Brokers manage documents on their leads"
ON public.lead_documents FOR ALL TO authenticated
USING (public.fn_can_work_lead(quote_id))
WITH CHECK (public.fn_can_work_lead(quote_id));