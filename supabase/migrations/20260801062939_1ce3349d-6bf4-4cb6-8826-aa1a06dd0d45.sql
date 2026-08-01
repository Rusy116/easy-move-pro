-- 1. Estimate revision lifecycle + financials -------------------------------
ALTER TABLE public.estimate_revisions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS sent_to_email text,
  ADD COLUMN IF NOT EXISTS broker_estimate_low numeric,
  ADD COLUMN IF NOT EXISTS broker_estimate_high numeric,
  ADD COLUMN IF NOT EXISTS company_estimate numeric,
  ADD COLUMN IF NOT EXISTS final_accepted_price numeric,
  ADD COLUMN IF NOT EXISTS commission_rate numeric NOT NULL DEFAULT 0.25,
  ADD COLUMN IF NOT EXISTS broker_commission numeric,
  ADD COLUMN IF NOT EXISTS gross_profit numeric,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE public.estimate_revisions
    ADD CONSTRAINT estimate_revisions_status_chk
    CHECK (status IN ('draft','sent','viewed','accepted','rejected','superseded'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS final_accepted_price numeric,
  ADD COLUMN IF NOT EXISTS gross_profit numeric,
  ADD COLUMN IF NOT EXISTS broker_commission numeric,
  ADD COLUMN IF NOT EXISTS accepted_estimate_id uuid;

-- 2. Customers ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  user_id uuid,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  full_name text,
  email text,
  phone text,
  origin_address text,
  destination_address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_company_quote_uidx
  ON public.customers(company_id, quote_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers company access" ON public.customers;
CREATE POLICY "customers company access" ON public.customers
  FOR ALL TO authenticated
  USING (public.fn_is_company_member(company_id) OR public.is_staff())
  WITH CHECK (public.fn_is_company_member(company_id) OR public.is_staff());

DROP POLICY IF EXISTS "customers self read" ON public.customers;
CREATE POLICY "customers self read" ON public.customers
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 3. Jobs --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number text NOT NULL,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  estimate_revision_id uuid REFERENCES public.estimate_revisions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'scheduled',
  scheduled_date date,
  arrival_window text,
  crew_size int,
  truck_size text,
  final_price numeric NOT NULL DEFAULT 0,
  broker_commission numeric NOT NULL DEFAULT 0,
  gross_profit numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_quote_uidx ON public.jobs(quote_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jobs company access" ON public.jobs;
CREATE POLICY "jobs company access" ON public.jobs
  FOR ALL TO authenticated
  USING (public.fn_is_company_member(company_id) OR public.is_staff())
  WITH CHECK (public.fn_is_company_member(company_id) OR public.is_staff());

DROP POLICY IF EXISTS "jobs customer read" ON public.jobs;
CREATE POLICY "jobs customer read" ON public.jobs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = jobs.quote_id AND q.user_id = auth.uid()));

-- 4. Bills of lading ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bills_of_lading (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'issued',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS bol_job_uidx ON public.bills_of_lading(job_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills_of_lading TO authenticated;
GRANT ALL ON public.bills_of_lading TO service_role;
ALTER TABLE public.bills_of_lading ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bol company access" ON public.bills_of_lading;
CREATE POLICY "bol company access" ON public.bills_of_lading
  FOR ALL TO authenticated
  USING (public.fn_is_company_member(company_id) OR public.is_staff())
  WITH CHECK (public.fn_is_company_member(company_id) OR public.is_staff());

DROP POLICY IF EXISTS "bol customer read" ON public.bills_of_lading;
CREATE POLICY "bol customer read" ON public.bills_of_lading
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = bills_of_lading.quote_id AND q.user_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_customers_updated ON public.customers;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_jobs_updated ON public.jobs;
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_bol_updated ON public.bills_of_lading;
CREATE TRIGGER trg_bol_updated BEFORE UPDATE ON public.bills_of_lading
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Broker notification helper ---------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notify_broker(_quote_id uuid, _type text, _message text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.admin_notifications (quote_id, type, message)
  VALUES (_quote_id, _type, _message);
END $$;

-- 6. Save draft --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_estimate_save_draft(
  _assignment_id uuid,
  _amount numeric,
  _breakdown jsonb DEFAULT '{}'::jsonb,
  _notes text DEFAULT NULL,
  _valid_until timestamptz DEFAULT NULL,
  _revision_id uuid DEFAULT NULL
) RETURNS public.estimate_revisions
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.quote_assignments; q public.quotes; rev public.estimate_revisions; nxt int;
BEGIN
  SELECT * INTO a FROM public.quote_assignments WHERE id = _assignment_id;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF NOT (public.fn_is_company_member(a.company_id) OR public.is_staff()) THEN
    RAISE EXCEPTION 'Not a member of this company';
  END IF;
  IF NOT (public.is_staff() OR public.fn_lead_claimed_by_company(a.quote_id, a.company_id)) THEN
    RAISE EXCEPTION 'You must claim this lead before building an estimate';
  END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 1000000 THEN
    RAISE EXCEPTION 'Estimate total must be between $1 and $1,000,000';
  END IF;
  SELECT * INTO q FROM public.quotes WHERE id = a.quote_id;

  IF _revision_id IS NOT NULL THEN
    UPDATE public.estimate_revisions
       SET amount = _amount, breakdown = COALESCE(_breakdown,'{}'::jsonb),
           notes = _notes, valid_until = _valid_until,
           company_estimate = _amount, updated_at = now()
     WHERE id = _revision_id AND assignment_id = _assignment_id AND status = 'draft'
     RETURNING * INTO rev;
    IF rev.id IS NOT NULL THEN RETURN rev; END IF;
  END IF;

  SELECT COALESCE(MAX(revision),0) + 1 INTO nxt
    FROM public.estimate_revisions WHERE assignment_id = _assignment_id;

  INSERT INTO public.estimate_revisions (
    assignment_id, quote_id, company_id, revision, amount, currency, breakdown,
    notes, valid_until, is_current, submitted_by, status,
    company_estimate, broker_estimate_low, broker_estimate_high
  ) VALUES (
    _assignment_id, a.quote_id, a.company_id, nxt, _amount, 'USD',
    COALESCE(_breakdown,'{}'::jsonb), _notes, _valid_until, false, auth.uid(), 'draft',
    _amount, q.estimated_low, q.estimated_high
  ) RETURNING * INTO rev;

  RETURN rev;
END $$;

-- 7. Send to customer --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_estimate_send(_revision_id uuid, _email text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE rev public.estimate_revisions; q public.quotes;
BEGIN
  SELECT * INTO rev FROM public.estimate_revisions WHERE id = _revision_id FOR UPDATE;
  IF rev.id IS NULL THEN RAISE EXCEPTION 'Estimate not found'; END IF;
  IF NOT (public.fn_is_company_member(rev.company_id) OR public.is_staff()) THEN
    RAISE EXCEPTION 'Not a member of this company';
  END IF;
  IF NOT (public.is_staff() OR public.fn_lead_claimed_by_company(rev.quote_id, rev.company_id)) THEN
    RAISE EXCEPTION 'You must claim this lead before sending an estimate';
  END IF;
  IF rev.status = 'accepted' THEN RAISE EXCEPTION 'Estimate already accepted'; END IF;

  SELECT * INTO q FROM public.quotes WHERE id = rev.quote_id FOR UPDATE;

  UPDATE public.estimate_revisions
     SET is_current = false,
         status = CASE WHEN status IN ('sent','viewed') THEN 'superseded' ELSE status END,
         updated_at = now()
   WHERE assignment_id = rev.assignment_id AND id <> rev.id AND is_current = true;

  UPDATE public.estimate_revisions
     SET status = 'sent', sent_at = now(), is_current = true,
         sent_to_email = COALESCE(_email, q.contact_email),
         broker_estimate_low = COALESCE(broker_estimate_low, q.estimated_low),
         broker_estimate_high = COALESCE(broker_estimate_high, q.estimated_high),
         company_estimate = amount, updated_at = now()
   WHERE id = rev.id
   RETURNING * INTO rev;

  UPDATE public.quote_assignments
     SET state = 'quoted', quoted_at = now(), quoted_amount = rev.amount, updated_at = now()
   WHERE id = rev.assignment_id;

  UPDATE public.quotes
     SET final_price = rev.amount,
         final_quote_sent_at = now(),
         job_status = 'final_quote_sent',
         last_activity_at = now()
   WHERE id = rev.quote_id;

  PERFORM public.fn_job_log(rev.quote_id, rev.company_id, 'estimate_sent', q.job_status, 'final_quote_sent',
    jsonb_build_object('revision', rev.revision, 'amount', rev.amount, 'estimate_id', rev.id));
  PERFORM public.fn_notify_broker(rev.quote_id, 'estimate_sent',
    'Estimate v' || rev.revision || ' sent to customer — $' || ROUND(rev.amount)::text);
  IF q.user_id IS NOT NULL THEN
    PERFORM public.fn_customer_notify(q.user_id, q.id, 'estimate_sent', 'Your moving estimate is ready',
      'Your mover sent an estimate of $' || ROUND(rev.amount)::text);
  END IF;

  RETURN jsonb_build_object('ok', true, 'estimate_id', rev.id, 'revision', rev.revision, 'amount', rev.amount);
END $$;

-- 8. Customer viewed ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_estimate_mark_viewed(_revision_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE rev public.estimate_revisions;
BEGIN
  SELECT * INTO rev FROM public.estimate_revisions WHERE id = _revision_id FOR UPDATE;
  IF rev.id IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  IF rev.viewed_at IS NULL AND rev.status = 'sent' THEN
    UPDATE public.estimate_revisions
       SET status = 'viewed', viewed_at = now(), updated_at = now()
     WHERE id = rev.id;
    PERFORM public.fn_job_log(rev.quote_id, rev.company_id, 'estimate_viewed', 'sent', 'viewed',
      jsonb_build_object('revision', rev.revision));
    PERFORM public.fn_notify_broker(rev.quote_id, 'estimate_viewed',
      'Customer viewed estimate v' || rev.revision);
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

-- 9. Customer accepts / rejects ---------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_estimate_respond(
  _revision_id uuid, _accept boolean, _reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  rev public.estimate_revisions; q public.quotes;
  cust public.customers; job public.jobs; bol public.bills_of_lading;
  inv public.company_invoices;
  rate numeric; commission numeric; profit numeric;
  k text; v numeric; pos int := 0;
BEGIN
  SELECT * INTO rev FROM public.estimate_revisions WHERE id = _revision_id FOR UPDATE;
  IF rev.id IS NULL THEN RAISE EXCEPTION 'Estimate not found'; END IF;
  IF rev.status NOT IN ('sent','viewed') THEN RAISE EXCEPTION 'This estimate is not awaiting a response'; END IF;
  SELECT * INTO q FROM public.quotes WHERE id = rev.quote_id FOR UPDATE;

  IF NOT _accept THEN
    UPDATE public.estimate_revisions
       SET status='rejected', rejected_at=now(), rejection_reason=_reason, updated_at=now()
     WHERE id = rev.id;
    UPDATE public.quotes SET job_status='rejected', customer_response_at=now(), last_activity_at=now()
     WHERE id = q.id;
    PERFORM public.fn_job_log(q.id, rev.company_id, 'estimate_rejected', q.job_status, 'rejected',
      jsonb_build_object('revision', rev.revision, 'reason', _reason));
    PERFORM public.fn_notify_broker(q.id, 'estimate_rejected',
      'Customer REJECTED estimate v' || rev.revision || COALESCE(' — ' || _reason, ''));
    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;

  rate := COALESCE(rev.commission_rate, 0.25);
  commission := ROUND(rev.amount * rate, 2);
  profit := ROUND(rev.amount - commission, 2);

  UPDATE public.estimate_revisions
     SET status='accepted', accepted_at=now(), is_current=true,
         final_accepted_price=amount, broker_commission=commission,
         gross_profit=profit, updated_at=now()
   WHERE id = rev.id RETURNING * INTO rev;

  UPDATE public.quote_assignments
     SET state='won', won_at=now(), closed_at=now(), updated_at=now()
   WHERE id = rev.assignment_id;

  UPDATE public.quotes
     SET status='won',
         job_status='scheduled',
         lead_status='customer_confirmed'::lead_status_enum,
         lead_status_updated_at=now(),
         accepted_at=now(),
         customer_response_at=now(),
         final_price=rev.amount,
         final_accepted_price=rev.amount,
         broker_commission=commission,
         gross_profit=profit,
         accepted_estimate_id=rev.id,
         assigned_company_id=COALESCE(assigned_company_id, rev.company_id),
         last_activity_at=now()
   WHERE id = q.id;

  INSERT INTO public.customers (company_id, user_id, quote_id, full_name, email, phone, origin_address, destination_address)
  VALUES (rev.company_id, q.user_id, q.id,
          COALESCE(q.details->>'full_name', q.contact_email), q.contact_email, q.contact_phone,
          q.origin_address, q.destination_address)
  ON CONFLICT (company_id, quote_id) DO UPDATE
    SET full_name=EXCLUDED.full_name, email=EXCLUDED.email, phone=EXCLUDED.phone, updated_at=now()
  RETURNING * INTO cust;

  INSERT INTO public.jobs (job_number, quote_id, company_id, customer_id, estimate_revision_id,
    status, scheduled_date, arrival_window, crew_size, truck_size, final_price, broker_commission, gross_profit, notes)
  VALUES ('JOB-' || to_char(now(),'YYYYMM') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),
    q.id, rev.company_id, cust.id, rev.id, 'scheduled',
    COALESCE(q.final_move_date, q.move_date), q.arrival_window,
    COALESCE(q.crew_size, q.num_movers), COALESCE(q.final_truck_size, q.truck_size),
    rev.amount, commission, profit, rev.notes)
  ON CONFLICT (quote_id) DO UPDATE
    SET final_price=EXCLUDED.final_price, broker_commission=EXCLUDED.broker_commission,
        gross_profit=EXCLUDED.gross_profit, estimate_revision_id=EXCLUDED.estimate_revision_id,
        status='scheduled', updated_at=now()
  RETURNING * INTO job;

  INSERT INTO public.company_invoices (company_id, quote_id, number, kind, status,
    customer_name, customer_email, customer_phone, subtotal, tax_amount, tax_rate, total,
    due_date, notes, created_by)
  VALUES (rev.company_id, q.id, public.generate_company_invoice_number(), 'final', 'sent',
    cust.full_name, cust.email, cust.phone,
    rev.amount - COALESCE((rev.breakdown->>'tax')::numeric, 0),
    COALESCE((rev.breakdown->>'tax')::numeric, 0), 0, rev.amount,
    current_date + 7, 'Auto-generated from accepted estimate v' || rev.revision, auth.uid())
  RETURNING * INTO inv;

  FOR k, v IN SELECT key, (value)::numeric FROM jsonb_each_text(COALESCE(rev.breakdown,'{}'::jsonb)) LOOP
    IF v IS NOT NULL AND v <> 0 THEN
      pos := pos + 1;
      INSERT INTO public.company_invoice_items (invoice_id, company_id, description, quantity, unit_price, amount, position)
      VALUES (inv.id, rev.company_id, initcap(replace(k,'_',' ')), 1, v, v, pos);
    END IF;
  END LOOP;

  INSERT INTO public.bills_of_lading (number, job_id, quote_id, company_id, payload)
  VALUES ('BOL-' || to_char(now(),'YYYYMM') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),
    job.id, q.id, rev.company_id,
    jsonb_build_object(
      'quote_number', q.quote_number,
      'customer', jsonb_build_object('name', cust.full_name, 'email', cust.email, 'phone', cust.phone),
      'origin', q.origin_address, 'destination', q.destination_address,
      'move_date', COALESCE(q.final_move_date, q.move_date),
      'inventory', q.inventory, 'cubic_feet', q.estimated_cubic_feet,
      'weight_lbs', q.estimated_weight_lbs, 'truck_size', COALESCE(q.final_truck_size, q.truck_size),
      'crew_size', COALESCE(q.crew_size, q.num_movers),
      'total', rev.amount, 'breakdown', rev.breakdown))
  ON CONFLICT (job_id) DO NOTHING
  RETURNING * INTO bol;

  PERFORM public.fn_job_log(q.id, rev.company_id, 'estimate_accepted', q.job_status, 'scheduled',
    jsonb_build_object('revision', rev.revision, 'amount', rev.amount,
      'job_id', job.id, 'invoice', inv.number, 'commission', commission, 'gross_profit', profit));
  PERFORM public.fn_notify_broker(q.id, 'estimate_accepted',
    'Customer ACCEPTED estimate v' || rev.revision || ' — $' || ROUND(rev.amount)::text ||
    ' · job ' || job.job_number || ' scheduled · commission $' || ROUND(commission)::text);
  PERFORM public.fn_notify_marketplace(q.id, 'estimate_accepted', 'Estimate accepted',
    'The customer accepted your estimate. Job ' || job.job_number || ' is now scheduled.', rev.company_id);
  IF q.user_id IS NOT NULL THEN
    PERFORM public.fn_customer_notify(q.user_id, q.id, 'move_scheduled', 'Your move is booked',
      'Job ' || job.job_number || ' is scheduled. Your bill of lading is available in your portal.');
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', 'accepted', 'job_id', job.id,
    'job_number', job.job_number, 'invoice_number', inv.number,
    'bill_of_lading', COALESCE(bol.number, ''), 'commission', commission, 'gross_profit', profit);
END $$;

GRANT EXECUTE ON FUNCTION public.fn_estimate_save_draft(uuid, numeric, jsonb, text, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_estimate_send(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_estimate_mark_viewed(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_estimate_respond(uuid, boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_notify_broker(uuid, text, text) TO authenticated;