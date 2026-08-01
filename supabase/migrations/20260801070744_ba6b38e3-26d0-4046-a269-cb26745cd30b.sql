-- Core claim routine shared by every claim entry point
CREATE OR REPLACE FUNCTION public.fn_claim_lead_core(_quote_id uuid, _company_id uuid)
RETURNS public.quote_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prev text; prev_phase public.lead_phase_enum;
  deadline timestamptz := now() + interval '12 hours';
  cname text; q public.quotes; a public.quote_assignments;
BEGIN
  IF _company_id IS NULL THEN RAISE EXCEPTION 'No company for this user'; END IF;
  IF NOT public.fn_is_company_member(_company_id) THEN RAISE EXCEPTION 'Not a member of this company'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.moving_companies
    WHERE id = _company_id
      AND COALESCE(status,'approved') = 'approved'
      AND COALESCE(suspended,false) = false
  ) THEN
    RAISE EXCEPTION 'Company is not approved';
  END IF;

  SELECT job_status, lead_phase INTO prev, prev_phase
    FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF prev IS NULL AND prev_phase IS NULL THEN RAISE EXCEPTION 'Job not found'; END IF;

  -- Already claimed by this company: return the existing assignment (idempotent)
  IF public.fn_lead_claimed_by_company(_quote_id, _company_id) THEN
    SELECT * INTO a FROM public.quote_assignments
      WHERE quote_id = _quote_id AND company_id = _company_id
      ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN RETURN a; END IF;
  ELSIF COALESCE(prev,'') <> 'open_market' AND COALESCE(prev_phase::text,'') <> 'open_market' THEN
    RAISE EXCEPTION 'This job is no longer available';
  END IF;

  INSERT INTO public.company_claims(quote_id, company_id, claimed_by, expires_at)
  VALUES (_quote_id, _company_id, auth.uid(), deadline)
  ON CONFLICT DO NOTHING;

  UPDATE public.quotes SET
    job_status = 'claimed',
    lead_phase = 'closed',
    assigned_company_id = _company_id,
    claimed_at = COALESCE(claimed_at, now()),
    assigned_at = COALESCE(assigned_at, now()),
    claim_deadline_at = deadline,
    last_activity_at = now(),
    lead_status = CASE WHEN lead_status = 'published' THEN 'claimed'::public.lead_status_enum ELSE lead_status END,
    lead_status_updated_at = now()
  WHERE id = _quote_id
  RETURNING * INTO q;

  -- Mirror into the assignment model so both portals read the same state
  SELECT * INTO a FROM public.quote_assignments
    WHERE quote_id = _quote_id AND company_id = _company_id
    ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    UPDATE public.quote_assignments
      SET state = 'accepted', sla_due_at = deadline, viewed_at = COALESCE(viewed_at, now())
      WHERE id = a.id
      RETURNING * INTO a;
  ELSE
    INSERT INTO public.quote_assignments (quote_id, company_id, is_exclusive, state, invited_at, viewed_at, sla_due_at)
      VALUES (_quote_id, _company_id, false, 'accepted', now(), now(), deadline)
      RETURNING * INTO a;
  END IF;

  -- Any competing assignment loses the lead
  UPDATE public.quote_assignments
    SET state = 'lost', closed_at = now()
    WHERE quote_id = _quote_id AND company_id <> _company_id
      AND state IN ('invited','active','quoted');

  PERFORM public.fn_job_log(_quote_id, _company_id, 'job_claimed', prev, 'claimed',
    jsonb_build_object('expires_at', deadline));

  SELECT name INTO cname FROM public.moving_companies WHERE id = _company_id;
  INSERT INTO public.lead_events (quote_id, company_id, actor_type, actor_id, event_type, payload)
  VALUES (_quote_id, _company_id, 'mover', auth.uid(), 'lead.claimed',
          jsonb_build_object('company', cname, 'expires_at', deadline));
  PERFORM public.fn_notify_marketplace(
    _quote_id, 'lead_claimed', 'Lead claimed',
    COALESCE(cname,'A company') || ' claimed lead ' || COALESCE(q.quote_number,''), _company_id);

  RETURN a;
END $function$;

GRANT EXECUTE ON FUNCTION public.fn_claim_lead_core(uuid, uuid) TO authenticated, service_role;

-- Marketplace claim (company workspace)
CREATE OR REPLACE FUNCTION public.fn_company_claim_job(_quote_id uuid, _company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE a public.quote_assignments;
BEGIN
  a := public.fn_claim_lead_core(_quote_id, _company_id);
  RETURN jsonb_build_object('ok', true, 'expires_at', a.sla_due_at, 'assignment_id', a.id);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'This job was just claimed by another company';
END $function$;

-- Partner portal claim
CREATE OR REPLACE FUNCTION public.fn_mover_claim_open_market(_quote_id uuid)
RETURNS public.quote_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_co uuid;
BEGIN
  v_co := public.fn_current_mover_company();
  IF v_co IS NULL THEN RAISE EXCEPTION 'not a mover'; END IF;
  RETURN public.fn_claim_lead_core(_quote_id, v_co);
END $function$;

-- Live updates for assignment changes
ALTER TABLE public.quote_assignments REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_assignments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;