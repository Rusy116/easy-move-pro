CREATE OR REPLACE FUNCTION public.fn_company_log_view(_quote_id uuid, _company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fn_is_company_member(_company_id) THEN RETURN; END IF;

  -- Always stamp the distribution record so admin "viewed" counters stay accurate.
  UPDATE public.lead_distributions
    SET viewed_at = COALESCE(viewed_at, now()), updated_at = now()
    WHERE quote_id = _quote_id AND company_id = _company_id AND revoked_at IS NULL;

  IF EXISTS (
    SELECT 1 FROM public.company_activity
    WHERE quote_id = _quote_id AND company_id = _company_id AND action = 'viewed'
      AND created_at > now() - interval '10 minutes'
  ) THEN RETURN; END IF;

  INSERT INTO public.company_activity (quote_id, company_id, actor_id, action, detail)
  VALUES (_quote_id, _company_id, auth.uid(), 'viewed', jsonb_build_object('at', now()));
END;
$$;