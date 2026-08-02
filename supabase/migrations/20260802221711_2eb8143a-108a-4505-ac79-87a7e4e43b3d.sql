
CREATE TABLE IF NOT EXISTS public.company_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  level integer NOT NULL DEFAULT 1,
  kind text NOT NULL DEFAULT 'claim_expired',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.company_warnings TO authenticated;
GRANT ALL ON public.company_warnings TO service_role;
ALTER TABLE public.company_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read warnings" ON public.company_warnings;
CREATE POLICY "staff read warnings" ON public.company_warnings
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "company reads own warnings" ON public.company_warnings;
CREATE POLICY "company reads own warnings" ON public.company_warnings
  FOR SELECT TO authenticated USING (public.fn_is_company_member(company_id));

DROP TRIGGER IF EXISTS trg_company_warnings_touch ON public.company_warnings;
CREATE TRIGGER trg_company_warnings_touch BEFORE UPDATE ON public.company_warnings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_company_warnings_company ON public.company_warnings(company_id, created_at DESC);

-- Records the next sequential warning for a company.
CREATE OR REPLACE FUNCTION public.fn_issue_company_warning(
  _company_id uuid, _quote_id uuid, _kind text, _reason text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nxt integer;
BEGIN
  IF _company_id IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(MAX(level), 0) + 1 INTO nxt FROM public.company_warnings WHERE company_id = _company_id;
  INSERT INTO public.company_warnings (company_id, quote_id, level, kind, reason)
  VALUES (_company_id, _quote_id, nxt, COALESCE(_kind,'claim_expired'), _reason);

  INSERT INTO public.company_notifications (company_id, type, title, body, quote_id, payload)
  VALUES (_company_id, 'warning', 'Warning #' || nxt,
          COALESCE(_reason, 'A job was removed from your company.'), _quote_id,
          jsonb_build_object('level', nxt, 'kind', _kind));

  IF _quote_id IS NOT NULL THEN
    INSERT INTO public.lead_events (quote_id, company_id, actor_type, event_type, payload)
    VALUES (_quote_id, _company_id, 'system', 'company.warning',
            jsonb_build_object('level', nxt, 'kind', _kind, 'reason', _reason));
  END IF;
  RETURN nxt;
END $$;

-- Core: put a claimed job back on the open marketplace for every eligible company.
CREATE OR REPLACE FUNCTION public.fn_return_job_to_market(
  _quote_id uuid, _reason text, _event text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_now timestamptz := now(); v_co uuid; v_num text;
BEGIN
  SELECT assigned_company_id, quote_number INTO v_co, v_num
    FROM public.quotes WHERE id = _quote_id FOR UPDATE;

  UPDATE public.company_claims
     SET status = 'released', released_at = v_now, updated_at = v_now
   WHERE quote_id = _quote_id AND COALESCE(status,'active') = 'active';

  UPDATE public.quote_assignments
     SET state = 'withdrawn', closed_at = v_now, updated_at = v_now,
         decline_reason = COALESCE(decline_reason, _reason)
   WHERE quote_id = _quote_id AND state IN ('invited','active','quoted','accepted');

  UPDATE public.quotes SET
    job_status = 'open_market',
    lead_phase = 'open_market',
    assigned_company_id = NULL,
    assigned_at = NULL,
    claimed_at = NULL,
    claim_deadline_at = NULL,
    exclusive_assignment_id = NULL,
    exclusive_started_at = NULL,
    exclusive_expires_at = NULL,
    exclusive_paused_at = NULL,
    open_market_opened_at = v_now,
    redistribution_count = COALESCE(redistribution_count, 0) + 1,
    last_activity_at = v_now,
    lead_status = CASE WHEN lead_status IN ('claimed','contacted')
                       THEN 'published'::public.lead_status_enum ELSE lead_status END,
    lead_status_updated_at = v_now
  WHERE id = _quote_id;

  PERFORM public.fn_distribute_lead(_quote_id, COALESCE(_reason, _event));

  IF v_co IS NOT NULL THEN
    PERFORM public.fn_job_log(_quote_id, v_co, _event, 'claimed', 'open_market',
      jsonb_build_object('reason', _reason, 'at', v_now));
  END IF;

  INSERT INTO public.lead_events (quote_id, company_id, actor_type, actor_id, event_type, payload)
  VALUES (_quote_id, v_co, 'system', auth.uid(), 'lead.returned_to_marketplace',
          jsonb_build_object('reason', COALESCE(_reason, _event), 'event', _event));

  PERFORM public.fn_notify_marketplace(_quote_id, 'lead_returned', 'Lead back in marketplace',
    'Lead ' || COALESCE(v_num,'') || ' is available again');

  RETURN v_co;
END $$;

-- Mover releases a job it owns.
CREATE OR REPLACE FUNCTION public.fn_company_release_job(
  _quote_id uuid, _company_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT assigned_company_id INTO v_owner FROM public.quotes WHERE id = _quote_id;
  IF v_owner IS NULL OR v_owner <> _company_id THEN
    RAISE EXCEPTION 'Your company does not own this job';
  END IF;
  IF NOT public.fn_is_company_member(_company_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM public.fn_return_job_to_market(_quote_id, COALESCE(_reason, 'released by company'), 'job_released');
  RETURN jsonb_build_object('ok', true);
END $$;

-- Admin / broker recalls a job from the company that owns it.
CREATE OR REPLACE FUNCTION public.fn_staff_recall_job(
  _quote_id uuid, _reason text DEFAULT NULL, _warn boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_co uuid; v_level integer;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_co := public.fn_return_job_to_market(_quote_id, COALESCE(_reason, 'recalled by platform'), 'job_recalled');
  IF _warn AND v_co IS NOT NULL THEN
    v_level := public.fn_issue_company_warning(v_co, _quote_id, 'recalled',
      COALESCE(_reason, 'This job was recalled by the platform.'));
  END IF;
  RETURN jsonb_build_object('ok', true, 'company_id', v_co, 'warning_level', v_level);
END $$;

-- Timer expiry: return the job AND issue the next warning.
CREATE OR REPLACE FUNCTION public.fn_claim_expiry_tick()
RETURNS TABLE(quote_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_now timestamptz := now(); v_co uuid;
BEGIN
  FOR r IN
    SELECT q.id, q.assigned_company_id, q.quote_number
    FROM public.quotes q
    WHERE q.job_status = 'claimed'
      AND q.claim_deadline_at IS NOT NULL
      AND q.claim_deadline_at <= v_now
  LOOP
    v_co := r.assigned_company_id;
    PERFORM public.fn_return_job_to_market(r.id, '12-hour response timer expired', 'claim_expired');

    UPDATE public.company_claims
      SET status='expired', updated_at=v_now
      WHERE quote_id=r.id AND company_id=v_co AND status='released';

    IF v_co IS NOT NULL THEN
      PERFORM public.fn_issue_company_warning(v_co, r.id, 'claim_expired',
        'You did not contact the customer within 12 hours. Lead '
        || COALESCE(r.quote_number,'') || ' returned to the marketplace.');
    END IF;

    quote_id := r.id;
    RETURN NEXT;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.fn_company_release_job(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_staff_recall_job(uuid, text, boolean) TO authenticated;
