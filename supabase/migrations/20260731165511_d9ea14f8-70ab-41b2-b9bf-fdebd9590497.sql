CREATE OR REPLACE FUNCTION public.fn_company_claim_job(_quote_id uuid, _company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE prev text; deadline timestamptz := now() + interval '12 hours'; cname text; q public.quotes;
BEGIN
  IF NOT public.fn_is_company_member(_company_id) THEN RAISE EXCEPTION 'Not a member of this company'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.moving_companies WHERE id=_company_id AND COALESCE(status,'approved')='approved' AND COALESCE(suspended,false)=false) THEN
    RAISE EXCEPTION 'Company is not approved';
  END IF;
  SELECT job_status INTO prev FROM public.quotes WHERE id=_quote_id FOR UPDATE;
  IF prev IS NULL THEN RAISE EXCEPTION 'Job not found'; END IF;
  IF prev <> 'open_market' THEN RAISE EXCEPTION 'This job is no longer available'; END IF;

  INSERT INTO public.company_claims(quote_id, company_id, claimed_by, expires_at)
  VALUES (_quote_id, _company_id, auth.uid(), deadline);

  UPDATE public.quotes SET job_status='claimed', assigned_company_id=_company_id, claimed_at=now(),
    assigned_at=now(), claim_deadline_at=deadline, last_activity_at=now(),
    lead_status = CASE WHEN lead_status = 'published' THEN 'claimed'::public.lead_status_enum ELSE lead_status END,
    lead_status_updated_at = now()
  WHERE id=_quote_id
  RETURNING * INTO q;

  PERFORM public.fn_job_log(_quote_id,_company_id,'job_claimed',prev,'claimed', jsonb_build_object('expires_at',deadline));

  SELECT name INTO cname FROM public.moving_companies WHERE id=_company_id;
  INSERT INTO public.lead_events (quote_id, company_id, actor_type, actor_id, event_type, payload)
  VALUES (_quote_id, _company_id, 'mover', auth.uid(), 'lead.claimed',
          jsonb_build_object('company', cname, 'expires_at', deadline));
  PERFORM public.fn_notify_marketplace(
    _quote_id, 'lead_claimed', 'Lead claimed',
    COALESCE(cname,'A company') || ' claimed lead ' || COALESCE(q.quote_number,''), _company_id);

  RETURN jsonb_build_object('ok', true, 'expires_at', deadline);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'This job was just claimed by another company';
END $function$;

CREATE OR REPLACE FUNCTION public.fn_set_lead_status(_quote_id uuid, _status lead_status_enum, _note text DEFAULT NULL::text)
 RETURNS quotes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _q public.quotes;
  _uid uuid := auth.uid();
  _is_staff boolean;
  _is_company boolean := false;
  _allowed public.lead_status_enum[];
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _q FROM public.quotes WHERE id = _quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;

  _is_staff := public.has_role(_uid, 'admin') OR public.has_role(_uid, 'broker');

  IF NOT _is_staff AND _q.assigned_company_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = _uid AND cu.company_id = _q.assigned_company_id
    ) INTO _is_company;
  END IF;

  IF NOT _is_staff AND NOT _is_company THEN
    RAISE EXCEPTION 'Not authorized to change this lead';
  END IF;

  _allowed := CASE _q.lead_status
    WHEN 'draft' THEN ARRAY['submitted','cancelled']
    WHEN 'submitted' THEN ARRAY['under_review','qualified','rejected','cancelled']
    WHEN 'under_review' THEN ARRAY['qualified','rejected','submitted','cancelled']
    WHEN 'qualified' THEN ARRAY['published','under_review','rejected','cancelled']
    WHEN 'published' THEN ARRAY['claimed','qualified','cancelled']
    WHEN 'claimed' THEN ARRAY['contacted','published','cancelled']
    WHEN 'contacted' THEN ARRAY['price_confirmed','cancelled']
    WHEN 'price_confirmed' THEN ARRAY['customer_confirmed','contacted','cancelled']
    WHEN 'customer_confirmed' THEN ARRAY['completed','cancelled']
    WHEN 'completed' THEN ARRAY[]::text[]
    WHEN 'rejected' THEN ARRAY['under_review','submitted']
    WHEN 'cancelled' THEN ARRAY['under_review','submitted']
    ELSE ARRAY[]::text[]
  END::public.lead_status_enum[];

  IF _q.lead_status <> _status AND NOT (_status = ANY(_allowed)) THEN
    RAISE EXCEPTION 'Invalid transition % -> %', _q.lead_status, _status;
  END IF;

  IF _status IN ('under_review','qualified','published','rejected') AND NOT _is_staff THEN
    RAISE EXCEPTION 'Only brokers or admins can perform this transition';
  END IF;

  UPDATE public.quotes SET
    lead_status = _status,
    lead_status_updated_at = now(),
    last_activity_at = now(),
    qualified_at = CASE WHEN _status = 'qualified' THEN now() ELSE qualified_at END,
    qualified_by = CASE WHEN _status = 'qualified' THEN _uid ELSE qualified_by END,
    published_at = CASE WHEN _status = 'published' THEN now() ELSE published_at END,
    job_status = CASE WHEN _status = 'published' THEN 'open_market' ELSE job_status END,
    assigned_company_id = CASE WHEN _status = 'published' THEN NULL ELSE assigned_company_id END,
    claimed_at = CASE WHEN _status = 'published' THEN NULL ELSE claimed_at END,
    claim_deadline_at = CASE WHEN _status = 'published' THEN NULL ELSE claim_deadline_at END,
    lead_phase = CASE WHEN _status = 'published' AND lead_phase = 'unassigned'
                      THEN 'open_market'::public.lead_phase_enum ELSE lead_phase END,
    open_market_opened_at = CASE WHEN _status = 'published' AND open_market_opened_at IS NULL
                                 THEN now() ELSE open_market_opened_at END,
    rejection_reason = CASE WHEN _status = 'rejected' THEN _note ELSE rejection_reason END
  WHERE id = _quote_id
  RETURNING * INTO _q;

  INSERT INTO public.quote_status_history (quote_id, from_status, to_status, changed_by)
  VALUES (_quote_id, _q.status, _status::text, _uid);

  INSERT INTO public.lead_events (quote_id, actor_type, actor_id, event_type, payload)
  VALUES (_quote_id, CASE WHEN _is_staff THEN 'broker' ELSE 'mover' END, _uid,
          'lead_status_changed',
          jsonb_build_object('to', _status::text, 'note', _note));

  IF _status = 'published' THEN
    INSERT INTO public.lead_events (quote_id, actor_type, actor_id, event_type, payload)
    VALUES (_quote_id, 'broker', _uid, 'lead.published', jsonb_build_object('at', now()));
    PERFORM public.fn_notify_marketplace(
      _quote_id, 'lead_published', 'New lead published',
      COALESCE(_q.origin_city,'') || ' → ' || COALESCE(_q.destination_city,'') || ' is available in the marketplace');
  END IF;

  RETURN _q;
END $function$;