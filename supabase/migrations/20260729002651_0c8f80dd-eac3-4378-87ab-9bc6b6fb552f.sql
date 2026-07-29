
-- 1) Publish: qualified -> published must open the job to the marketplace + notify
CREATE OR REPLACE FUNCTION public.fn_notify_marketplace(_quote_id uuid, _type text, _title text, _body text, _company_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, quote_id, message) VALUES (_type, _quote_id, _title || ' — ' || _body);
  IF _company_id IS NOT NULL THEN
    INSERT INTO public.company_notifications (company_id, type, title, body, quote_id)
    VALUES (_company_id, _type, _title, _body, _quote_id);
  ELSE
    INSERT INTO public.company_notifications (company_id, type, title, body, quote_id)
    SELECT c.id, _type, _title, _body, _quote_id FROM public.moving_companies c
    WHERE COALESCE(c.status,'approved') = 'approved' AND COALESCE(c.suspended,false) = false;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_set_lead_status(_quote_id uuid, _status lead_status_enum, _note text DEFAULT NULL::text)
 RETURNS quotes LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
    -- Marketplace engine: publishing opens the job to all approved companies
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
  VALUES (_quote_id, CASE WHEN _is_staff THEN 'broker' ELSE 'company' END, _uid,
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

-- 2) Claim: also advance the lead lifecycle + notify
CREATE OR REPLACE FUNCTION public.fn_company_claim_job(_quote_id uuid, _company_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
  VALUES (_quote_id, _company_id, 'company', auth.uid(), 'lead.claimed',
          jsonb_build_object('company', cname, 'expires_at', deadline));
  PERFORM public.fn_notify_marketplace(
    _quote_id, 'lead_claimed', 'Lead claimed',
    COALESCE(cname,'A company') || ' claimed lead ' || COALESCE(q.quote_number,''), _company_id);

  RETURN jsonb_build_object('ok', true, 'expires_at', deadline);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'This job was just claimed by another company';
END $function$;

-- 3) Exclusive-window expiry: return unprogressed claims to the marketplace
CREATE OR REPLACE FUNCTION public.fn_claim_expiry_tick()
 RETURNS TABLE(quote_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r record; v_now timestamptz := now();
BEGIN
  FOR r IN
    SELECT q.id, q.assigned_company_id, q.quote_number
    FROM public.quotes q
    WHERE q.job_status = 'claimed'
      AND q.claim_deadline_at IS NOT NULL
      AND q.claim_deadline_at <= v_now
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.company_claims
      SET status='expired', released_at=v_now, updated_at=v_now
      WHERE quote_id=r.id AND company_id=r.assigned_company_id AND COALESCE(status,'active')='active';

    UPDATE public.quotes SET
      job_status='open_market',
      assigned_company_id=NULL,
      claimed_at=NULL,
      claim_deadline_at=NULL,
      last_activity_at=v_now,
      lead_status = CASE WHEN lead_status = 'claimed' THEN 'published'::public.lead_status_enum ELSE lead_status END,
      lead_status_updated_at = v_now,
      open_market_opened_at = v_now
    WHERE id = r.id;

    PERFORM public.fn_job_log(r.id, r.assigned_company_id, 'claim_expired', 'claimed', 'open_market',
      jsonb_build_object('at', v_now));

    INSERT INTO public.lead_events (quote_id, company_id, actor_type, event_type, payload)
    VALUES (r.id, r.assigned_company_id, 'system', 'lead.claim_expired', jsonb_build_object('at', v_now)),
           (r.id, NULL, 'system', 'lead.returned_to_marketplace', jsonb_build_object('reason','claim_expired'));

    PERFORM public.fn_notify_marketplace(r.id, 'claim_expired', 'Claim expired',
      'Lead ' || COALESCE(r.quote_number,'') || ' returned to the marketplace', r.assigned_company_id);
    PERFORM public.fn_notify_marketplace(r.id, 'lead_returned', 'Lead back in marketplace',
      'Lead ' || COALESCE(r.quote_number,'') || ' is available again');

    quote_id := r.id;
    RETURN NEXT;
  END LOOP;
END $function$;

-- 4) Audit "viewed"
CREATE OR REPLACE FUNCTION public.fn_company_log_view(_quote_id uuid, _company_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.fn_is_company_member(_company_id) THEN RETURN; END IF;
  IF EXISTS (
    SELECT 1 FROM public.company_activity
    WHERE quote_id=_quote_id AND company_id=_company_id AND action='viewed'
      AND created_at > now() - interval '10 minutes'
  ) THEN RETURN; END IF;
  INSERT INTO public.company_activity (quote_id, company_id, actor_id, action, detail)
  VALUES (_quote_id, _company_id, auth.uid(), 'viewed', jsonb_build_object('at', now()));
END $function$;

-- 5) Expired claims for a company
CREATE OR REPLACE FUNCTION public.fn_company_expired_claims(_company_id uuid)
 RETURNS TABLE(quote_id uuid, quote_number text, origin_city text, origin_state text,
               destination_city text, destination_state text, move_date date,
               claimed_at timestamptz, expires_at timestamptz, job_status text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT c.quote_id, q.quote_number, q.origin_city, q.origin_state, q.destination_city,
         q.destination_state, q.move_date, c.claimed_at, c.expires_at, q.job_status
  FROM public.company_claims c
  JOIN public.quotes q ON q.id = c.quote_id
  WHERE c.company_id = _company_id
    AND public.fn_is_company_member(_company_id)
    AND (c.status = 'expired' OR (c.status = 'active' AND c.expires_at < now() AND q.assigned_company_id IS DISTINCT FROM _company_id))
  ORDER BY c.expires_at DESC
  LIMIT 200;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_claim_expiry_tick() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_company_log_view(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_company_expired_claims(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_notify_marketplace(uuid, text, text, text, uuid) FROM anon, authenticated;
