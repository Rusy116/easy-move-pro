ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS job_services jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_job_status_chk;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_job_status_chk CHECK (job_status = ANY (ARRAY[
  'new','qualified','open_market','claimed','contacted','survey_scheduled','survey_completed',
  'final_quote_sent','accepted','estimate_accepted','scheduled','in_progress','rejected','booked',
  'completed','cancelled','declined','expired'
]));

CREATE TABLE IF NOT EXISTS public.company_job_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  due_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_job_tasks TO authenticated;
GRANT ALL ON public.company_job_tasks TO service_role;
ALTER TABLE public.company_job_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage their job tasks" ON public.company_job_tasks
  FOR ALL TO authenticated
  USING (public.fn_is_company_member(company_id) OR public.is_admin())
  WITH CHECK (public.fn_is_company_member(company_id) OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.company_contact_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('call','sms','email')),
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound','inbound')),
  summary text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_contact_log TO authenticated;
GRANT ALL ON public.company_contact_log TO service_role;
ALTER TABLE public.company_contact_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage their contact log" ON public.company_contact_log
  FOR ALL TO authenticated
  USING (public.fn_is_company_member(company_id) OR public.is_admin())
  WITH CHECK (public.fn_is_company_member(company_id) OR public.is_admin());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_company_job_tasks_updated_at BEFORE UPDATE ON public.company_job_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_company_contact_log_updated_at BEFORE UPDATE ON public.company_contact_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_company_job_tasks_quote ON public.company_job_tasks(quote_id);
CREATE INDEX IF NOT EXISTS idx_company_contact_log_quote ON public.company_contact_log(quote_id);

CREATE OR REPLACE FUNCTION public.fn_company_update_job(_quote_id uuid, _action text, _payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE prev text; cid uuid; nxt text;
BEGIN
  SELECT job_status, assigned_company_id INTO prev, cid FROM public.quotes WHERE id=_quote_id FOR UPDATE;
  IF cid IS NULL OR NOT public.fn_is_company_member(cid) THEN RAISE EXCEPTION 'You do not own this job'; END IF;
  IF NOT public.fn_lead_claimed_by_company(_quote_id, cid) THEN
    RAISE EXCEPTION 'You must claim this job before updating it or sending a final quote';
  END IF;

  -- Shared editable fields on every action
  UPDATE public.quotes SET
    final_price = COALESCE((_payload->>'final_price')::numeric, final_price),
    final_move_date = COALESCE((_payload->>'final_move_date')::date, final_move_date),
    arrival_window = COALESCE(_payload->>'arrival_window', arrival_window),
    crew_size = COALESCE((_payload->>'crew_size')::int, crew_size),
    final_truck_size = COALESCE(_payload->>'final_truck_size', final_truck_size),
    company_notes = COALESCE(_payload->>'company_notes', company_notes),
    job_services = COALESCE(_payload->'job_services', job_services),
    last_activity_at = now()
  WHERE id = _quote_id;

  IF _action = 'contacted' THEN
    nxt := 'contacted';
    UPDATE public.quotes SET job_status=nxt, contacted_at=COALESCE(contacted_at, now()) WHERE id=_quote_id;
  ELSIF _action = 'survey_scheduled' THEN
    nxt := 'survey_scheduled';
    UPDATE public.quotes SET job_status=nxt WHERE id=_quote_id;
  ELSIF _action = 'survey_completed' THEN
    nxt := 'survey_completed';
    UPDATE public.quotes SET job_status=nxt WHERE id=_quote_id;
  ELSIF _action = 'send_final_quote' THEN
    nxt := 'final_quote_sent';
    UPDATE public.quotes SET job_status=nxt, final_quote_sent_at=now() WHERE id=_quote_id;
  ELSIF _action = 'estimate_accepted' THEN
    nxt := 'estimate_accepted';
    UPDATE public.quotes SET job_status=nxt, customer_response_at=now() WHERE id=_quote_id;
  ELSIF _action = 'schedule' THEN
    nxt := 'scheduled';
    UPDATE public.quotes SET job_status=nxt, scheduled_at=now() WHERE id=_quote_id;
  ELSIF _action = 'start_move' THEN
    nxt := 'in_progress';
    UPDATE public.quotes SET job_status=nxt WHERE id=_quote_id;
  ELSIF _action = 'save_details' THEN
    nxt := NULL;
  ELSIF _action = 'complete' THEN
    nxt := 'completed';
    UPDATE public.quotes SET job_status=nxt, completed_at=now() WHERE id=_quote_id;
  ELSIF _action = 'cancel' THEN
    nxt := 'cancelled';
    UPDATE public.quotes SET job_status=nxt, cancelled_at=now() WHERE id=_quote_id;
  ELSE
    RAISE EXCEPTION 'Unknown action %', _action;
  END IF;

  PERFORM public.fn_job_log(_quote_id, cid, _action, prev, COALESCE(nxt, prev), _payload);
  RETURN jsonb_build_object('ok', true, 'status', COALESCE(nxt, prev));
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_company_decline_job(_quote_id uuid, _company_id uuid, _reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_owner uuid;
BEGIN
  SELECT assigned_company_id INTO v_owner FROM public.quotes WHERE id = _quote_id;
  IF v_owner IS NULL OR v_owner <> _company_id THEN
    RAISE EXCEPTION 'Your company does not own this job';
  END IF;
  IF NOT public.fn_is_company_member(_company_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.quotes SET declined_at = now() WHERE id = _quote_id;
  PERFORM public.fn_return_job_to_market(_quote_id, COALESCE(_reason, 'declined by company'), 'job_declined');
  RETURN jsonb_build_object('ok', true);
END $function$;