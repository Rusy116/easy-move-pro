-- ============ Price revisions ============
CREATE TABLE public.company_price_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  revision integer NOT NULL DEFAULT 1,
  previous_price numeric,
  new_price numeric NOT NULL,
  deposit_amount numeric,
  additional_charges numeric NOT NULL DEFAULT 0,
  reason text,
  notes text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  kind text NOT NULL DEFAULT 'revision',
  status text NOT NULL DEFAULT 'applied',
  requested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.company_price_revisions TO authenticated;
GRANT ALL ON public.company_price_revisions TO service_role;
ALTER TABLE public.company_price_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members read own price revisions"
ON public.company_price_revisions FOR SELECT TO authenticated
USING (public.fn_is_company_member(company_id) OR public.is_staff());

CREATE POLICY "Company members add price revisions"
ON public.company_price_revisions FOR INSERT TO authenticated
WITH CHECK (public.fn_is_company_member(company_id));

CREATE TRIGGER trg_price_revisions_touch
BEFORE UPDATE ON public.company_price_revisions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_price_revisions_quote ON public.company_price_revisions(quote_id);
CREATE INDEX idx_price_revisions_company ON public.company_price_revisions(company_id, created_at DESC);

-- ============ Commissions ============
CREATE TABLE public.company_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  base_price numeric NOT NULL,
  rate numeric NOT NULL DEFAULT 0.10,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_id, company_id)
);

GRANT SELECT ON public.company_commissions TO authenticated;
GRANT ALL ON public.company_commissions TO service_role;
ALTER TABLE public.company_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members read own commissions"
ON public.company_commissions FOR SELECT TO authenticated
USING (public.fn_is_company_member(company_id) OR public.is_staff());

CREATE POLICY "Staff manage commissions"
ON public.company_commissions FOR UPDATE TO authenticated
USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER trg_commissions_touch
BEFORE UPDATE ON public.company_commissions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_commissions_company ON public.company_commissions(company_id, status);

-- ============ Confirm final price (locks it) ============
CREATE OR REPLACE FUNCTION public.fn_company_confirm_final_price(
  _quote_id uuid,
  _company_id uuid,
  _final_price numeric,
  _deposit numeric DEFAULT NULL,
  _additional numeric DEFAULT 0,
  _notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  q public.quotes;
  total numeric;
  rate numeric := 0.10;
BEGIN
  IF NOT (public.fn_is_company_member(_company_id) OR public.is_staff()) THEN
    RAISE EXCEPTION 'Not a member of this company';
  END IF;

  SELECT * INTO q FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF q.assigned_company_id IS DISTINCT FROM _company_id THEN
    RAISE EXCEPTION 'This lead is not assigned to your company';
  END IF;
  IF q.lead_status = 'price_confirmed'::lead_status_enum
     OR q.lead_status = 'customer_confirmed'::lead_status_enum
     OR q.lead_status = 'completed'::lead_status_enum THEN
    RAISE EXCEPTION 'Price is already locked — request a price revision instead';
  END IF;

  total := COALESCE(_final_price, 0) + COALESCE(_additional, 0);

  UPDATE public.quotes
     SET final_price = total,
         company_notes = COALESCE(_notes, company_notes),
         final_quote_sent_at = now(),
         job_status = 'final_quote_sent',
         lead_status = 'price_confirmed'::lead_status_enum,
         lead_status_updated_at = now()
   WHERE id = _quote_id;

  INSERT INTO public.company_price_revisions (
    quote_id, company_id, revision, previous_price, new_price,
    deposit_amount, additional_charges, reason, notes, kind, requested_by
  ) VALUES (
    _quote_id, _company_id, 1, q.final_price, total,
    _deposit, COALESCE(_additional, 0), 'Initial final price', _notes, 'initial', auth.uid()
  );

  INSERT INTO public.company_commissions (quote_id, company_id, base_price, rate, amount)
  VALUES (_quote_id, _company_id, total, rate, ROUND(total * rate, 2))
  ON CONFLICT (quote_id, company_id)
  DO UPDATE SET base_price = EXCLUDED.base_price, amount = EXCLUDED.amount, updated_at = now();

  PERFORM public.fn_job_log(_quote_id, _company_id, 'price_confirmed', q.job_status, 'final_quote_sent',
    jsonb_build_object('final_price', total, 'deposit', _deposit, 'additional', _additional));

  PERFORM public.fn_notify_marketplace(_quote_id, 'price_confirmed', 'Final price confirmed',
    'The moving company confirmed a final price of $' || ROUND(total)::text, _company_id);

  RETURN jsonb_build_object('ok', true, 'final_price', total);
END;
$$;

-- ============ Price revision request (history preserved) ============
CREATE OR REPLACE FUNCTION public.fn_company_request_price_revision(
  _quote_id uuid,
  _company_id uuid,
  _new_price numeric,
  _reason text,
  _notes text DEFAULT NULL,
  _attachments jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  q public.quotes;
  next_rev integer;
BEGIN
  IF NOT (public.fn_is_company_member(_company_id) OR public.is_staff()) THEN
    RAISE EXCEPTION 'Not a member of this company';
  END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required for a price revision';
  END IF;

  SELECT * INTO q FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF q.assigned_company_id IS DISTINCT FROM _company_id THEN
    RAISE EXCEPTION 'This lead is not assigned to your company';
  END IF;

  SELECT COALESCE(MAX(revision), 0) + 1 INTO next_rev
    FROM public.company_price_revisions WHERE quote_id = _quote_id;

  INSERT INTO public.company_price_revisions (
    quote_id, company_id, revision, previous_price, new_price,
    reason, notes, attachments, kind, status, requested_by
  ) VALUES (
    _quote_id, _company_id, next_rev, q.final_price, _new_price,
    _reason, _notes, COALESCE(_attachments, '[]'::jsonb), 'revision', 'applied', auth.uid()
  );

  UPDATE public.quotes
     SET final_price = _new_price,
         final_quote_sent_at = now(),
         lead_status = 'price_confirmed'::lead_status_enum,
         lead_status_updated_at = now()
   WHERE id = _quote_id;

  UPDATE public.company_commissions
     SET base_price = _new_price, amount = ROUND(_new_price * rate, 2), updated_at = now()
   WHERE quote_id = _quote_id AND company_id = _company_id;

  PERFORM public.fn_job_log(_quote_id, _company_id, 'price_revised', NULL, NULL,
    jsonb_build_object('revision', next_rev, 'previous_price', q.final_price,
                       'new_price', _new_price, 'reason', _reason));

  PERFORM public.fn_notify_marketplace(_quote_id, 'price_revised', 'Price revision submitted',
    'Revision #' || next_rev || ': $' || ROUND(_new_price)::text || ' — ' || _reason, _company_id);

  RETURN jsonb_build_object('ok', true, 'revision', next_rev);
END;
$$;

-- ============ Mark move completed ============
CREATE OR REPLACE FUNCTION public.fn_company_complete_move(
  _quote_id uuid,
  _company_id uuid,
  _notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE q public.quotes;
BEGIN
  IF NOT (public.fn_is_company_member(_company_id) OR public.is_staff()) THEN
    RAISE EXCEPTION 'Not a member of this company';
  END IF;

  SELECT * INTO q FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF q.assigned_company_id IS DISTINCT FROM _company_id THEN
    RAISE EXCEPTION 'This lead is not assigned to your company';
  END IF;

  UPDATE public.quotes
     SET job_status = 'completed',
         lead_status = 'completed'::lead_status_enum,
         lead_status_updated_at = now(),
         company_notes = COALESCE(_notes, company_notes)
   WHERE id = _quote_id;

  PERFORM public.fn_job_log(_quote_id, _company_id, 'complete', q.job_status, 'completed',
    jsonb_build_object('notes', _notes));

  PERFORM public.fn_notify_marketplace(_quote_id, 'move_completed', 'Move completed',
    'The move has been marked completed. A review request is now available.', _company_id);

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_company_confirm_final_price(uuid, uuid, numeric, numeric, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_company_request_price_revision(uuid, uuid, numeric, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_company_complete_move(uuid, uuid, text) FROM anon;