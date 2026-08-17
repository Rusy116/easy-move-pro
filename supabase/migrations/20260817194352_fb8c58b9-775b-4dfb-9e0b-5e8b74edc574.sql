-- Masked marketplace view must no longer depend on a broad table-level SELECT policy.
ALTER VIEW public.mover_lead_view SET (security_invoker = false);
REVOKE ALL ON public.mover_lead_view FROM anon;
GRANT SELECT ON public.mover_lead_view TO authenticated;

-- Remove over-broad mover read paths on the base table (pre-claim full-row PII exposure).
DROP POLICY IF EXISTS "Movers can read entitled leads" ON public.quotes;
DROP POLICY IF EXISTS "Assigned movers view quote" ON public.quotes;
DROP POLICY IF EXISTS "movers read owned jobs" ON public.quotes;

-- Movers may read the raw quote row only once their company has claimed the lead.
CREATE POLICY "Movers read claimed leads"
  ON public.quotes
  FOR SELECT
  TO authenticated
  USING (public.fn_lead_unlocked(id));