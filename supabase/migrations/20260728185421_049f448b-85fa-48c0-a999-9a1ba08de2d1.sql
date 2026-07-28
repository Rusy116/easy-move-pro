
-- ---------- quotes: job workflow columns ----------
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS job_status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS qualified_at timestamptz,
  ADD COLUMN IF NOT EXISTS qualified_by uuid,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS claim_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_price numeric,
  ADD COLUMN IF NOT EXISTS final_move_date date,
  ADD COLUMN IF NOT EXISTS arrival_window text,
  ADD COLUMN IF NOT EXISTS crew_size integer,
  ADD COLUMN IF NOT EXISTS final_truck_size text,
  ADD COLUMN IF NOT EXISTS company_notes text,
  ADD COLUMN IF NOT EXISTS final_quote_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_response_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.quotes ADD CONSTRAINT quotes_job_status_chk CHECK (job_status IN (
    'new','qualified','open_market','claimed','contacted','final_quote_sent',
    'accepted','rejected','booked','completed','cancelled','expired'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS quotes_job_status_idx ON public.quotes(job_status);
CREATE INDEX IF NOT EXISTS quotes_assigned_company_idx ON public.quotes(assigned_company_id);

-- ---------- company_users ----------
CREATE TABLE IF NOT EXISTS public.company_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
GRANT SELECT ON public.company_users TO authenticated;
GRANT ALL ON public.company_users TO service_role;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- backfill from legacy company_members
INSERT INTO public.company_users (company_id, user_id, role)
SELECT cm.company_id, cm.user_id, COALESCE(cm.role, 'member')
FROM public.company_members cm
ON CONFLICT (company_id, user_id) DO NOTHING;

-- helper: companies of current user
CREATE OR REPLACE FUNCTION public.fn_my_company_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  UNION
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.fn_is_company_member(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.fn_my_company_ids() c WHERE c = _company_id);
$$;

CREATE POLICY "company_users read own company" ON public.company_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'broker'));

-- ---------- company_claims ----------
CREATE TABLE IF NOT EXISTS public.company_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL UNIQUE REFERENCES public.quotes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
  released_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_claims TO authenticated;
GRANT ALL ON public.company_claims TO service_role;
ALTER TABLE public.company_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claims readable by owner company or staff" ON public.company_claims
  FOR SELECT TO authenticated
  USING (public.fn_is_company_member(company_id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'broker'));

-- ---------- company_activity (audit) ----------
CREATE TABLE IF NOT EXISTS public.company_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_activity TO authenticated;
GRANT ALL ON public.company_activity TO service_role;
ALTER TABLE public.company_activity ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS company_activity_quote_idx ON public.company_activity(quote_id);
CREATE POLICY "activity readable by company or staff" ON public.company_activity
  FOR SELECT TO authenticated
  USING (company_id IS NULL OR public.fn_is_company_member(company_id)
         OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'broker'));

-- ---------- company_notes ----------
CREATE TABLE IF NOT EXISTS public.company_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  author_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_notes TO authenticated;
GRANT ALL ON public.company_notes TO service_role;
ALTER TABLE public.company_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes readable by company or staff" ON public.company_notes
  FOR SELECT TO authenticated
  USING (public.fn_is_company_member(company_id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'broker'));
CREATE POLICY "notes writable by company" ON public.company_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_is_company_member(company_id) AND author_id = auth.uid());
CREATE POLICY "notes editable by author" ON public.company_notes
  FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "notes deletable by author" ON public.company_notes
  FOR DELETE TO authenticated USING (author_id = auth.uid());

-- ---------- company_status_history ----------
CREATE TABLE IF NOT EXISTS public.company_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.moving_companies(id) ON DELETE SET NULL,
  from_status text,
  to_status text NOT NULL,
  actor_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_status_history TO authenticated;
GRANT ALL ON public.company_status_history TO service_role;
ALTER TABLE public.company_status_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS company_status_history_quote_idx ON public.company_status_history(quote_id);
CREATE POLICY "status history readable by company or staff" ON public.company_status_history
  FOR SELECT TO authenticated
  USING (company_id IS NULL OR public.fn_is_company_member(company_id)
         OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'broker'));

-- quotes: movers can read jobs they own
DROP POLICY IF EXISTS "movers read owned jobs" ON public.quotes;
CREATE POLICY "movers read owned jobs" ON public.quotes
  FOR SELECT TO authenticated
  USING (assigned_company_id IS NOT NULL AND public.fn_is_company_member(assigned_company_id));

-- ---------- internal logger ----------
CREATE OR REPLACE FUNCTION public.fn_job_log(_quote_id uuid, _company_id uuid, _action text,
  _from text, _to text, _detail jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.company_activity(quote_id, company_id, actor_id, action, detail)
  VALUES (_quote_id, _company_id, auth.uid(), _action, COALESCE(_detail,'{}'::jsonb));
  IF _to IS NOT NULL THEN
    INSERT INTO public.company_status_history(quote_id, company_id, from_status, to_status, actor_id)
    VALUES (_quote_id, _company_id, _from, _to, auth.uid());
  END IF;
END $$;

-- ---------- broker qualifies a lead ----------
CREATE OR REPLACE FUNCTION public.fn_broker_qualify_lead(_quote_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  UPDATE public.quotes SET job_status='open_market', qualified_at=now(), qualified_by=auth.uid(),
    published_at=now(), lead_phase='open_market', open_market_opened_at=now(), last_activity_at=now()
  WHERE id=_quote_id;
  PERFORM public.fn_job_log(_quote_id, NULL, 'lead_qualified', prev, 'open_market', '{}'::jsonb);
  RETURN jsonb_build_object('ok', true);
END $$;

-- ---------- company claims a job (first come wins) ----------
CREATE OR REPLACE FUNCTION public.fn_company_claim_job(_quote_id uuid, _company_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev text; deadline timestamptz := now() + interval '12 hours';
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
    assigned_at=now(), claim_deadline_at=deadline, last_activity_at=now()
  WHERE id=_quote_id;
  PERFORM public.fn_job_log(_quote_id,_company_id,'job_claimed',prev,'claimed', jsonb_build_object('expires_at',deadline));
  RETURN jsonb_build_object('ok', true, 'expires_at', deadline);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'This job was just claimed by another company';
END $$;

-- ---------- company job updates ----------
CREATE OR REPLACE FUNCTION public.fn_company_update_job(
  _quote_id uuid, _action text, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev text; cid uuid; nxt text;
BEGIN
  SELECT job_status, assigned_company_id INTO prev, cid FROM public.quotes WHERE id=_quote_id FOR UPDATE;
  IF cid IS NULL OR NOT public.fn_is_company_member(cid) THEN RAISE EXCEPTION 'You do not own this job'; END IF;

  IF _action = 'contacted' THEN
    nxt := 'contacted';
    UPDATE public.quotes SET job_status=nxt, contacted_at=now(), last_activity_at=now() WHERE id=_quote_id;
  ELSIF _action = 'send_final_quote' THEN
    nxt := 'final_quote_sent';
    UPDATE public.quotes SET job_status=nxt,
      final_price = COALESCE((_payload->>'final_price')::numeric, final_price),
      final_move_date = COALESCE((_payload->>'final_move_date')::date, final_move_date),
      arrival_window = COALESCE(_payload->>'arrival_window', arrival_window),
      crew_size = COALESCE((_payload->>'crew_size')::int, crew_size),
      final_truck_size = COALESCE(_payload->>'final_truck_size', final_truck_size),
      company_notes = COALESCE(_payload->>'company_notes', company_notes),
      final_quote_sent_at = now(), last_activity_at = now()
    WHERE id=_quote_id;
  ELSIF _action = 'save_details' THEN
    nxt := NULL;
    UPDATE public.quotes SET
      final_price = COALESCE((_payload->>'final_price')::numeric, final_price),
      final_move_date = COALESCE((_payload->>'final_move_date')::date, final_move_date),
      arrival_window = COALESCE(_payload->>'arrival_window', arrival_window),
      crew_size = COALESCE((_payload->>'crew_size')::int, crew_size),
      final_truck_size = COALESCE(_payload->>'final_truck_size', final_truck_size),
      company_notes = COALESCE(_payload->>'company_notes', company_notes),
      last_activity_at = now()
    WHERE id=_quote_id;
  ELSIF _action = 'schedule' THEN
    IF prev NOT IN ('accepted','booked','final_quote_sent') THEN RAISE EXCEPTION 'Customer has not accepted the quote yet'; END IF;
    nxt := 'booked';
    UPDATE public.quotes SET job_status=nxt, last_activity_at=now() WHERE id=_quote_id;
  ELSIF _action = 'complete' THEN
    nxt := 'completed';
    UPDATE public.quotes SET job_status=nxt, last_activity_at=now() WHERE id=_quote_id;
  ELSIF _action = 'cancel' THEN
    nxt := 'cancelled';
    UPDATE public.quotes SET job_status=nxt, last_activity_at=now() WHERE id=_quote_id;
    UPDATE public.company_claims SET status='cancelled', released_at=now(), updated_at=now() WHERE quote_id=_quote_id;
  ELSE
    RAISE EXCEPTION 'Unknown action %', _action;
  END IF;

  PERFORM public.fn_job_log(_quote_id, cid, _action, prev, nxt, COALESCE(_payload,'{}'::jsonb));
  RETURN jsonb_build_object('ok', true, 'status', COALESCE(nxt, prev));
END $$;

-- ---------- available jobs (masked) ----------
CREATE OR REPLACE FUNCTION public.fn_company_available_jobs(_company_id uuid)
RETURNS TABLE (
  id uuid, quote_number text, customer_name text, origin_city text, origin_state text,
  destination_city text, destination_state text, move_date date, distance_miles numeric,
  estimated_cubic_feet numeric, estimated_low numeric, estimated_high numeric,
  move_type text, property_type text, services text[], published_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.quote_number,
    CASE WHEN q.details->>'first_name' IS NOT NULL
      THEN (q.details->>'first_name') || ' ' || COALESCE(LEFT(q.details->>'last_name',1) || '.', '')
      ELSE 'Customer' END,
    q.origin_city, q.origin_state, q.destination_city, q.destination_state,
    q.move_date, q.distance_miles, q.estimated_cubic_feet, q.estimated_low, q.estimated_high,
    q.move_type, q.property_type,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN q.packing THEN 'Packing' END,
      CASE WHEN q.unpacking THEN 'Unpacking' END,
      CASE WHEN q.storage THEN 'Storage' END,
      CASE WHEN q.assembly THEN 'Assembly' END,
      CASE WHEN q.piano THEN 'Piano' END,
      CASE WHEN q.junk_removal THEN 'Junk removal' END,
      CASE WHEN q.appliances THEN 'Appliances' END,
      CASE WHEN q.fragile_items THEN 'Fragile items' END
    ], NULL),
    COALESCE(q.published_at, q.created_at)
  FROM public.quotes q
  WHERE q.job_status = 'open_market'
    AND public.fn_is_company_member(_company_id)
  ORDER BY COALESCE(q.published_at, q.created_at) DESC
  LIMIT 200;
$$;

-- ---------- my jobs (full detail) ----------
CREATE OR REPLACE FUNCTION public.fn_company_my_jobs(_company_id uuid)
RETURNS SETOF public.quotes LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.* FROM public.quotes q
  WHERE q.assigned_company_id = _company_id
    AND public.fn_is_company_member(_company_id)
  ORDER BY q.claimed_at DESC NULLS LAST
  LIMIT 300;
$$;

-- ---------- customer responds to final quote ----------
CREATE OR REPLACE FUNCTION public.fn_customer_respond_final_quote(
  _quote_number text, _token text, _accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; nxt text;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE quote_number=_quote_number AND portal_token=_token FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Quote not found'; END IF;
  IF q.job_status <> 'final_quote_sent' THEN RAISE EXCEPTION 'No final quote awaiting a response'; END IF;
  nxt := CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END;
  UPDATE public.quotes SET job_status=nxt, customer_response_at=now(), last_activity_at=now(),
    accepted_at = CASE WHEN _accept THEN now() ELSE accepted_at END
  WHERE id=q.id;
  PERFORM public.fn_job_log(q.id, q.assigned_company_id,
    CASE WHEN _accept THEN 'customer_accepted_final' ELSE 'customer_rejected_final' END,
    q.job_status, nxt, '{}'::jsonb);
  IF NOT _accept THEN
    UPDATE public.company_claims SET status='rejected', released_at=now(), updated_at=now() WHERE quote_id=q.id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'status', nxt);
END $$;

-- ---------- expire stale claims (12h) ----------
CREATE OR REPLACE FUNCTION public.fn_expire_stale_claims()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer := 0; r record;
BEGIN
  FOR r IN SELECT id, assigned_company_id FROM public.quotes
    WHERE job_status='claimed' AND claim_deadline_at IS NOT NULL AND claim_deadline_at < now()
  LOOP
    UPDATE public.quotes SET job_status='open_market', assigned_company_id=NULL,
      claimed_at=NULL, claim_deadline_at=NULL, published_at=now(), last_activity_at=now()
    WHERE id=r.id;
    UPDATE public.company_claims SET status='expired', released_at=now(), updated_at=now() WHERE quote_id=r.id;
    DELETE FROM public.company_claims WHERE quote_id=r.id AND status='expired';
    PERFORM public.fn_job_log(r.id, r.assigned_company_id,'claim_expired','claimed','open_market','{}'::jsonb);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

GRANT EXECUTE ON FUNCTION public.fn_broker_qualify_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_company_claim_job(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_company_update_job(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_company_available_jobs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_company_my_jobs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_my_company_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_company_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_customer_respond_final_quote(text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_expire_stale_claims() TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.company_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_claims;
