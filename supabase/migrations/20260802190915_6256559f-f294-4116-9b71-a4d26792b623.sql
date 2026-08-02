-- 1. New quotes must NOT auto-distribute to the marketplace.
CREATE OR REPLACE FUNCTION public.tg_quote_distribute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_lead_event(NEW.id, 'lead.created', 'system',
    jsonb_build_object('quote_number', NEW.quote_number));

  BEGIN
    INSERT INTO public.admin_notifications (type, quote_id, message)
    VALUES ('lead_submitted', NEW.id,
            'New quote ' || COALESCE(NEW.quote_number, '') || ' submitted — ' ||
            COALESCE(NEW.origin_city, '?') || ' → ' || COALESCE(NEW.destination_city, '?'));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NULL;
END;
$$;

-- 2. Qualify marks the lead qualified only; publishing stays a separate step.
CREATE OR REPLACE FUNCTION public.fn_broker_qualify_lead(_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE prev text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'broker')) THEN
    RAISE EXCEPTION 'Only brokers can qualify leads';
  END IF;

  SELECT job_status INTO prev FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF prev IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF prev NOT IN ('new','qualified','expired','cancelled') THEN
    RAISE EXCEPTION 'Lead is already in the marketplace or claimed';
  END IF;

  UPDATE public.quotes SET
    job_status   = 'qualified',
    lead_status  = 'qualified',
    lead_status_updated_at = now(),
    qualified_at = now(),
    qualified_by = auth.uid(),
    last_activity_at = now()
  WHERE id = _quote_id;

  PERFORM public.fn_job_log(_quote_id, NULL, 'lead_qualified', prev, 'qualified', '{}'::jsonb);
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 3. Publishing distributes to eligible companies only.
CREATE OR REPLACE FUNCTION public.fn_set_lead_status(
  _quote_id uuid,
  _status public.lead_status_enum,
  _note text DEFAULT NULL
)
RETURNS public.quotes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _q public.quotes;
  _uid uuid := auth.uid();
  _is_staff boolean;
  _is_company boolean := false;
  _allowed public.lead_status_enum[];
  _matched integer := 0;
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
    job_status = CASE
                   WHEN _status = 'published' THEN 'open_market'
                   WHEN _status = 'qualified' AND job_status = 'new' THEN 'qualified'
                   ELSE job_status END,
    published_at = CASE WHEN _status = 'published' THEN now() ELSE published_at END,
    assigned_company_id = CASE WHEN _status = 'published' THEN NULL ELSE assigned_company_id END,
    claimed_at = CASE WHEN _status = 'published' THEN NULL ELSE claimed_at END,
    claim_deadline_at = CASE WHEN _status = 'published' THEN NULL ELSE claim_deadline_at END,
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
    -- Distribute to eligible companies only (state / city / zip / approval rules)
    _matched := public.fn_distribute_lead(_quote_id, 'published');

    INSERT INTO public.lead_events (quote_id, actor_type, actor_id, event_type, payload)
    VALUES (_quote_id, 'broker', _uid, 'lead.published',
            jsonb_build_object('at', now(), 'companies', _matched));

    BEGIN
      INSERT INTO public.admin_notifications (type, quote_id, message)
      VALUES ('lead_published', _quote_id,
              'Lead ' || COALESCE(_q.quote_number,'') || ' published to ' || _matched || ' companies');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    SELECT * INTO _q FROM public.quotes WHERE id = _quote_id;
  END IF;

  RETURN _q;
END;
$$;