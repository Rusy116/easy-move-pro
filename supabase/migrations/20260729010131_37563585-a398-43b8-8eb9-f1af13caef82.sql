
-- ============ 1. Extend company_commissions ============
ALTER TABLE public.company_commissions
  ADD COLUMN IF NOT EXISTS broker_id uuid,
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_id uuid;

ALTER TABLE public.company_commissions ALTER COLUMN rate SET DEFAULT 0.25;

DO $$ BEGIN
  ALTER TABLE public.company_commissions
    ADD CONSTRAINT company_commissions_status_chk
    CHECK (status IN ('pending','invoiced','paid','overdue','cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ 2. Commission invoices (platform -> company) ============
CREATE SEQUENCE IF NOT EXISTS public.commission_invoice_seq START 1000;

CREATE TABLE IF NOT EXISTS public.commission_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  commission_id uuid NOT NULL REFERENCES public.company_commissions(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  broker_id uuid,
  customer_id uuid,
  final_price numeric NOT NULL,
  rate numeric NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'invoiced'
    CHECK (status IN ('invoiced','paid','overdue','cancelled')),
  issue_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL DEFAULT (current_date + 14),
  paid_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (commission_id)
);

GRANT SELECT ON public.commission_invoices TO authenticated;
GRANT ALL ON public.commission_invoices TO service_role;
ALTER TABLE public.commission_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies view own commission invoices"
  ON public.commission_invoices FOR SELECT TO authenticated
  USING (public.fn_is_company_member(company_id) OR public.is_staff());

CREATE POLICY "Admins manage commission invoices"
  ON public.commission_invoices FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- immutability: only status / paid_at / cancelled_at / notes may change
CREATE OR REPLACE FUNCTION public.tg_commission_invoice_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.number IS DISTINCT FROM OLD.number
     OR NEW.commission_id IS DISTINCT FROM OLD.commission_id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
     OR NEW.final_price IS DISTINCT FROM OLD.final_price
     OR NEW.rate IS DISTINCT FROM OLD.rate
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.issue_date IS DISTINCT FROM OLD.issue_date THEN
    RAISE EXCEPTION 'Commission invoices are immutable after creation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS commission_invoice_immutable ON public.commission_invoices;
CREATE TRIGGER commission_invoice_immutable
  BEFORE UPDATE ON public.commission_invoices
  FOR EACH ROW EXECUTE FUNCTION public.tg_commission_invoice_immutable();

DROP TRIGGER IF EXISTS commission_touch ON public.company_commissions;
CREATE TRIGGER commission_touch BEFORE UPDATE ON public.company_commissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ 3. Finance audit helper ============
CREATE OR REPLACE FUNCTION public.fn_finance_audit(
  _action text, _entity_type text, _entity_id uuid, _quote_id uuid,
  _reason text DEFAULT NULL, _before jsonb DEFAULT NULL, _after jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.audit_log(actor_id, actor_email, actor_role, action, entity_type, entity_id, quote_id, reason, before, after)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          public.fn_my_primary_role(), _action, _entity_type, _entity_id, _quote_id, _reason, _before, _after);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============ 4. Invoice generation ============
CREATE OR REPLACE FUNCTION public.fn_generate_commission_invoice(_commission_id uuid)
RETURNS public.commission_invoices
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.company_commissions; inv public.commission_invoices; q public.quotes;
BEGIN
  SELECT * INTO c FROM public.company_commissions WHERE id = _commission_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Commission not found'; END IF;

  SELECT * INTO inv FROM public.commission_invoices WHERE commission_id = _commission_id;
  IF inv.id IS NOT NULL THEN RETURN inv; END IF;

  SELECT * INTO q FROM public.quotes WHERE id = c.quote_id;

  INSERT INTO public.commission_invoices (
    number, commission_id, company_id, quote_id, broker_id, customer_id,
    final_price, rate, amount, currency, status, issue_date, due_date
  ) VALUES (
    'CINV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.commission_invoice_seq')::text, 6, '0'),
    c.id, c.company_id, c.quote_id, q.assigned_broker_id, q.user_id,
    c.base_price, c.rate, c.amount, c.currency, 'invoiced', current_date, current_date + 14
  ) RETURNING * INTO inv;

  UPDATE public.company_commissions
     SET status = CASE WHEN status = 'pending' THEN 'invoiced' ELSE status END,
         invoice_id = inv.id,
         broker_id = COALESCE(broker_id, q.assigned_broker_id),
         customer_id = COALESCE(customer_id, q.user_id),
         due_date = COALESCE(due_date, inv.due_date),
         updated_at = now()
   WHERE id = c.id;

  INSERT INTO public.company_notifications(company_id, type, title, body, quote_id, payload)
  VALUES (c.company_id, 'invoice_created', 'Commission invoice created',
    'Invoice ' || inv.number || ' for $' || ROUND(inv.amount,2)::text || ' is due ' || inv.due_date::text,
    c.quote_id, jsonb_build_object('invoice_id', inv.id, 'number', inv.number));

  PERFORM public.fn_finance_audit('commission_invoice.created','commission_invoice', inv.id, c.quote_id,
    NULL, NULL, to_jsonb(inv));

  RETURN inv;
END $$;

-- ============ 5. Confirm final price -> 25% + auto invoice ============
CREATE OR REPLACE FUNCTION public.fn_company_confirm_final_price(_quote_id uuid, _company_id uuid, _final_price numeric, _deposit numeric DEFAULT NULL::numeric, _additional numeric DEFAULT 0, _notes text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  q public.quotes;
  total numeric;
  rate numeric := 0.25;
  comm public.company_commissions;
  inv public.commission_invoices;
BEGIN
  IF NOT (public.fn_is_company_member(_company_id) OR public.is_staff()) THEN
    RAISE EXCEPTION 'Not a member of this company';
  END IF;

  SELECT * INTO q FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF q.assigned_company_id IS DISTINCT FROM _company_id THEN
    RAISE EXCEPTION 'This lead is not assigned to your company';
  END IF;
  IF q.lead_status IN ('price_confirmed'::lead_status_enum,'customer_confirmed'::lead_status_enum,'completed'::lead_status_enum) THEN
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

  INSERT INTO public.company_commissions (quote_id, company_id, base_price, rate, amount, broker_id, customer_id, due_date)
  VALUES (_quote_id, _company_id, total, rate, ROUND(total * rate, 2), q.assigned_broker_id, q.user_id, current_date + 14)
  ON CONFLICT (quote_id, company_id)
  DO UPDATE SET base_price = EXCLUDED.base_price, rate = EXCLUDED.rate,
                amount = EXCLUDED.amount, updated_at = now()
  RETURNING * INTO comm;

  PERFORM public.fn_finance_audit('commission.created','commission', comm.id, _quote_id, NULL, NULL, to_jsonb(comm));

  inv := public.fn_generate_commission_invoice(comm.id);

  PERFORM public.fn_job_log(_quote_id, _company_id, 'price_confirmed', q.job_status, 'final_quote_sent',
    jsonb_build_object('final_price', total, 'deposit', _deposit, 'additional', _additional));

  PERFORM public.fn_notify_marketplace(_quote_id, 'price_confirmed', 'Final price confirmed',
    'The moving company confirmed a final price of $' || ROUND(total)::text, _company_id);

  RETURN jsonb_build_object('ok', true, 'final_price', total,
    'commission_amount', comm.amount, 'invoice_number', inv.number);
END;
$function$;

-- ============ 6. Cancel commission when customer cancels ============
CREATE OR REPLACE FUNCTION public.fn_cancel_commission_for_quote(_quote_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.company_commissions;
BEGIN
  FOR c IN SELECT * FROM public.company_commissions
            WHERE quote_id = _quote_id AND status <> 'paid' AND status <> 'cancelled' LOOP
    UPDATE public.company_commissions
       SET status='cancelled', cancelled_at=now(), updated_at=now(),
           notes = COALESCE(notes,'') || CASE WHEN notes IS NULL THEN '' ELSE E'\n' END || 'Cancelled: ' || COALESCE(_reason,'move cancelled')
     WHERE id = c.id;

    UPDATE public.commission_invoices
       SET status='cancelled', cancelled_at=now()
     WHERE commission_id = c.id AND status <> 'paid';

    PERFORM public.fn_finance_audit('commission.cancelled','commission', c.id, _quote_id, _reason, to_jsonb(c), NULL);

    INSERT INTO public.company_notifications(company_id, type, title, body, quote_id)
    VALUES (c.company_id, 'commission_cancelled', 'Commission cancelled',
            'The commission for this move was cancelled — ' || COALESCE(_reason,'move cancelled'), _quote_id);

    INSERT INTO public.admin_notifications(type, quote_id, message)
    VALUES ('commission_cancelled', _quote_id,
            'Commission cancelled ($' || ROUND(c.amount,2)::text || ') — ' || COALESCE(_reason,'move cancelled'));
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.fn_customer_cancel_move(_quote_id uuid, _reason text, _note text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE q public.quotes;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = _quote_id AND user_id = auth.uid();
  IF q.id IS NULL THEN RAISE EXCEPTION 'Move not found'; END IF;
  IF q.lead_status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'This move can no longer be cancelled';
  END IF;

  UPDATE public.quotes
     SET lead_status = 'cancelled', lead_status_updated_at = now(), job_status = 'cancelled',
         cancellation_reason = _reason, cancellation_note = _note, cancelled_by = auth.uid(),
         cancelled_at = now(), closed_at = now(), closed_reason = 'cancelled'
   WHERE id = _quote_id;

  PERFORM public.log_lead_event(_quote_id, 'customer_cancelled', 'customer',
    jsonb_build_object('reason', _reason, 'note', _note), NULL, q.assigned_company_id);

  PERFORM public.fn_customer_notify(q.user_id, _quote_id, 'move_cancelled', 'Move cancelled',
    'Your move was cancelled. Reason: ' || coalesce(_reason, 'not provided'));

  IF q.assigned_company_id IS NOT NULL THEN
    INSERT INTO public.company_notifications(company_id, type, title, body, quote_id)
    VALUES (q.assigned_company_id, 'customer_cancelled', 'Customer cancelled the move',
            coalesce(q.quote_number, '') || ' — ' || coalesce(_reason, 'no reason given'), _quote_id);
  END IF;

  INSERT INTO public.admin_notifications(type, quote_id, message)
  VALUES ('customer_cancelled', _quote_id,
          'Customer cancelled ' || coalesce(q.quote_number, _quote_id::text) || ' — ' || coalesce(_reason, 'no reason'));

  PERFORM public.fn_cancel_commission_for_quote(_quote_id, coalesce(_reason,'customer cancelled'));

  RETURN jsonb_build_object('ok', true, 'status', 'cancelled');
END; $function$;

-- ============ 7. Admin status management ============
CREATE OR REPLACE FUNCTION public.fn_admin_set_commission_status(_commission_id uuid, _status text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.company_commissions;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _status NOT IN ('pending','invoiced','paid','overdue','cancelled') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  SELECT * INTO c FROM public.company_commissions WHERE id = _commission_id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Commission not found'; END IF;

  UPDATE public.company_commissions
     SET status = _status,
         paid_at = CASE WHEN _status='paid' THEN COALESCE(paid_at, now()) ELSE paid_at END,
         cancelled_at = CASE WHEN _status='cancelled' THEN COALESCE(cancelled_at, now()) ELSE cancelled_at END,
         notes = COALESCE(_note, notes), updated_at = now()
   WHERE id = _commission_id;

  UPDATE public.commission_invoices
     SET status = CASE WHEN _status IN ('paid','overdue','cancelled') THEN _status ELSE status END,
         paid_at = CASE WHEN _status='paid' THEN COALESCE(paid_at, now()) ELSE paid_at END,
         cancelled_at = CASE WHEN _status='cancelled' THEN COALESCE(cancelled_at, now()) ELSE cancelled_at END
   WHERE commission_id = _commission_id;

  PERFORM public.fn_finance_audit('commission.status_changed','commission', _commission_id, c.quote_id,
    _note, jsonb_build_object('status', c.status), jsonb_build_object('status', _status));

  INSERT INTO public.company_notifications(company_id, type, title, body, quote_id)
  VALUES (c.company_id, 'commission_' || _status, 'Commission ' || _status,
          'Commission of $' || ROUND(c.amount,2)::text || ' is now ' || _status || '.', c.quote_id);

  RETURN jsonb_build_object('ok', true, 'status', _status);
END $$;

-- ============ 8. Overdue tick + large balance alerts ============
CREATE OR REPLACE FUNCTION public.fn_finance_overdue_tick()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer := 0; r record;
BEGIN
  FOR r IN
    SELECT i.* FROM public.commission_invoices i
    WHERE i.status = 'invoiced' AND i.due_date < current_date
  LOOP
    UPDATE public.commission_invoices SET status='overdue' WHERE id = r.id;
    UPDATE public.company_commissions SET status='overdue', updated_at=now() WHERE id = r.commission_id;

    INSERT INTO public.company_notifications(company_id, type, title, body, quote_id)
    VALUES (r.company_id, 'invoice_overdue', 'Invoice overdue',
            'Invoice ' || r.number || ' ($' || ROUND(r.amount,2)::text || ') is past due.', r.quote_id);

    INSERT INTO public.admin_notifications(type, quote_id, message)
    VALUES ('invoice_overdue', r.quote_id, 'Invoice ' || r.number || ' is overdue ($' || ROUND(r.amount,2)::text || ')');

    PERFORM public.fn_finance_audit('commission_invoice.overdue','commission_invoice', r.id, r.quote_id);
    n := n + 1;
  END LOOP;

  -- due-soon reminders (3 days out)
  FOR r IN
    SELECT i.* FROM public.commission_invoices i
    WHERE i.status='invoiced' AND i.due_date = current_date + 3
  LOOP
    INSERT INTO public.company_notifications(company_id, type, title, body, quote_id)
    VALUES (r.company_id, 'invoice_due', 'Invoice due soon',
            'Invoice ' || r.number || ' is due on ' || r.due_date::text || '.', r.quote_id);
  END LOOP;

  -- large outstanding balance alerts
  INSERT INTO public.admin_notifications(type, quote_id, message)
  SELECT 'large_outstanding', NULL,
         'Large outstanding balance: ' || c.name || ' owes $' || ROUND(SUM(i.amount),2)::text
  FROM public.commission_invoices i
  JOIN public.moving_companies c ON c.id = i.company_id
  WHERE i.status IN ('invoiced','overdue')
  GROUP BY c.id, c.name
  HAVING SUM(i.amount) >= 5000;

  RETURN n;
END $$;

-- ============ 9. Reporting helpers ============
CREATE OR REPLACE FUNCTION public.fn_finance_monthly_report(_months integer DEFAULT 12)
RETURNS TABLE(month date, invoiced numeric, paid numeric, outstanding numeric, overdue numeric, cancelled numeric, invoices integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT date_trunc('month', i.issue_date)::date AS month,
         SUM(i.amount) FILTER (WHERE i.status <> 'cancelled')::numeric,
         SUM(i.amount) FILTER (WHERE i.status = 'paid')::numeric,
         SUM(i.amount) FILTER (WHERE i.status IN ('invoiced','overdue'))::numeric,
         SUM(i.amount) FILTER (WHERE i.status = 'overdue')::numeric,
         SUM(i.amount) FILTER (WHERE i.status = 'cancelled')::numeric,
         COUNT(*)::int
  FROM public.commission_invoices i
  WHERE public.is_staff()
    AND i.issue_date >= (date_trunc('month', current_date) - make_interval(months => _months))
  GROUP BY 1 ORDER BY 1 DESC;
$$;

CREATE OR REPLACE FUNCTION public.fn_finance_company_report()
RETURNS TABLE(company_id uuid, company_name text, invoices integer, total numeric, paid numeric, outstanding numeric, overdue numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.id, c.name, COUNT(i.*)::int,
         COALESCE(SUM(i.amount) FILTER (WHERE i.status <> 'cancelled'),0),
         COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'),0),
         COALESCE(SUM(i.amount) FILTER (WHERE i.status IN ('invoiced','overdue')),0),
         COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'overdue'),0)
  FROM public.moving_companies c
  JOIN public.commission_invoices i ON i.company_id = c.id
  WHERE public.is_staff()
  GROUP BY c.id, c.name ORDER BY 4 DESC;
$$;

CREATE OR REPLACE FUNCTION public.fn_finance_broker_report()
RETURNS TABLE(broker_id uuid, broker_name text, invoices integer, total numeric, paid numeric, outstanding numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT i.broker_id, COALESCE(p.full_name, 'Unassigned'), COUNT(*)::int,
         COALESCE(SUM(i.amount) FILTER (WHERE i.status <> 'cancelled'),0),
         COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'),0),
         COALESCE(SUM(i.amount) FILTER (WHERE i.status IN ('invoiced','overdue')),0)
  FROM public.commission_invoices i
  LEFT JOIN public.profiles p ON p.id = i.broker_id
  WHERE public.is_staff()
  GROUP BY i.broker_id, p.full_name ORDER BY 4 DESC;
$$;

-- ============ 10. Backfill invoices for existing commissions ============
DO $$ DECLARE c record; BEGIN
  FOR c IN SELECT id FROM public.company_commissions WHERE status <> 'cancelled' LOOP
    PERFORM public.fn_generate_commission_invoice(c.id);
  END LOOP;
END $$;
