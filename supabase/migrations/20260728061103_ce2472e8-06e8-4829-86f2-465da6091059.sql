
-- Brokers work the lead pipeline; administrators keep unrestricted access.
DROP POLICY IF EXISTS "Staff can view all quotes" ON public.quotes;
CREATE POLICY "Staff can view all quotes" ON public.quotes
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can update quotes" ON public.quotes;
CREATE POLICY "Staff can update quotes" ON public.quotes
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can view quote notes" ON public.quote_notes;
CREATE POLICY "Staff can view quote notes" ON public.quote_notes
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can add quote notes" ON public.quote_notes;
CREATE POLICY "Staff can add quote notes" ON public.quote_notes
  FOR INSERT TO authenticated WITH CHECK (public.is_staff() AND author_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view status history" ON public.quote_status_history;
CREATE POLICY "Staff can view status history" ON public.quote_status_history
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can view lead events" ON public.lead_events;
CREATE POLICY "Staff can view lead events" ON public.lead_events
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can view assignments" ON public.quote_assignments;
CREATE POLICY "Staff can view assignments" ON public.quote_assignments
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can view companies" ON public.moving_companies;
CREATE POLICY "Staff can view companies" ON public.moving_companies
  FOR SELECT TO authenticated USING (public.is_staff());
