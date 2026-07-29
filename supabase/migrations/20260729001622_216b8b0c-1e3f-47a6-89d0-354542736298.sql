
DO $$ BEGIN
  CREATE TYPE public.lead_status_enum AS ENUM (
    'draft','submitted','under_review','qualified','published','claimed',
    'contacted','price_confirmed','customer_confirmed','completed','rejected','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS lead_status public.lead_status_enum NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS lead_status_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS info_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Backfill from existing state
UPDATE public.quotes SET lead_status = CASE
  WHEN status IN ('cancelled') THEN 'cancelled'::public.lead_status_enum
  WHEN status IN ('lost') THEN 'rejected'::public.lead_status_enum
  WHEN status IN ('won') THEN 'completed'::public.lead_status_enum
  WHEN assigned_company_id IS NOT NULL OR claimed_at IS NOT NULL THEN 'claimed'::public.lead_status_enum
  WHEN lead_phase = 'open_market' OR published_at IS NOT NULL THEN 'published'::public.lead_status_enum
  WHEN qualified_at IS NOT NULL THEN 'qualified'::public.lead_status_enum
  ELSE 'submitted'::public.lead_status_enum
END;

CREATE INDEX IF NOT EXISTS quotes_lead_status_idx ON public.quotes (lead_status, created_at DESC);

CREATE OR REPLACE FUNCTION public.fn_set_lead_status(
  _quote_id uuid,
  _status public.lead_status_enum,
  _note text DEFAULT NULL
) RETURNS public.quotes
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

  -- Allowed transitions
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

  RETURN _q;
END $$;

GRANT EXECUTE ON FUNCTION public.fn_set_lead_status(uuid, public.lead_status_enum, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_request_lead_info(_quote_id uuid, _message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'admin') OR public.has_role(_uid,'broker')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.quotes
    SET info_requested_at = now(),
        lead_status = CASE WHEN lead_status IN ('submitted','qualified') THEN 'under_review'::public.lead_status_enum ELSE lead_status END,
        last_activity_at = now()
    WHERE id = _quote_id;

  INSERT INTO public.quote_notes (quote_id, author_id, body)
  VALUES (_quote_id, _uid, 'Information requested: ' || COALESCE(_message, ''));

  INSERT INTO public.lead_events (quote_id, actor_type, actor_id, event_type, payload)
  VALUES (_quote_id, 'broker', _uid, 'info_requested', jsonb_build_object('message', _message));
END $$;

GRANT EXECUTE ON FUNCTION public.fn_request_lead_info(uuid, text) TO authenticated;
