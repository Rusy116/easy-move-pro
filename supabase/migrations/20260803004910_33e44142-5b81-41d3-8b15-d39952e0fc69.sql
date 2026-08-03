
-- 1. Job financial fields
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS deposit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_charges numeric NOT NULL DEFAULT 0;

-- 2. Broker share on commissions and invoices
ALTER TABLE public.company_commissions
  ADD COLUMN IF NOT EXISTS broker_rate numeric NOT NULL DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS broker_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.commission_invoices
  ADD COLUMN IF NOT EXISTS broker_rate numeric NOT NULL DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS broker_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz;

UPDATE public.company_commissions SET broker_amount = round(amount * broker_rate, 2) WHERE broker_amount = 0;
UPDATE public.commission_invoices SET broker_amount = round(amount * broker_rate, 2) WHERE broker_amount = 0;
UPDATE public.commission_invoices SET amount_paid = amount WHERE status = 'paid' AND amount_paid = 0;

-- 3. Expanded invoice lifecycle
ALTER TABLE public.commission_invoices DROP CONSTRAINT IF EXISTS commission_invoices_status_check;
ALTER TABLE public.commission_invoices ADD CONSTRAINT commission_invoices_status_check
  CHECK (status = ANY (ARRAY['draft','sent','viewed','invoiced','partial','paid','overdue','void','cancelled']));

ALTER TABLE public.company_commissions DROP CONSTRAINT IF EXISTS company_commissions_status_chk;
ALTER TABLE public.company_commissions ADD CONSTRAINT company_commissions_status_chk
  CHECK (status = ANY (ARRAY['pending','invoiced','partial','paid','overdue','cancelled']));

-- 4. Payment history
CREATE TABLE IF NOT EXISTS public.commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.commission_invoices(id) ON DELETE CASCADE,
  commission_id uuid,
  company_id uuid,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  method text NOT NULL DEFAULT 'manual',
  reference text,
  note text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.commission_payments TO authenticated;
GRANT ALL ON public.commission_payments TO service_role;

ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read payments" ON public.commission_payments;
CREATE POLICY "staff read payments" ON public.commission_payments
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "company reads own payments" ON public.commission_payments;
CREATE POLICY "company reads own payments" ON public.commission_payments
  FOR SELECT TO authenticated USING (company_id IN (SELECT public.fn_my_company_ids()));

DROP POLICY IF EXISTS "admin writes payments" ON public.commission_payments;
CREATE POLICY "admin writes payments" ON public.commission_payments
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS trg_commission_payments_touch ON public.commission_payments;
CREATE TRIGGER trg_commission_payments_touch BEFORE UPDATE ON public.commission_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_commission_payments_invoice ON public.commission_payments(invoice_id);

-- 5. Admin invoice actions
CREATE OR REPLACE FUNCTION public.fn_admin_invoice_action(
  _invoice_id uuid,
  _action text,
  _amount numeric DEFAULT NULL,
  _note text DEFAULT NULL,
  _reference text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.commission_invoices%ROWTYPE;
  new_paid numeric;
  new_status text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can manage commission invoices';
  END IF;

  SELECT * INTO inv FROM public.commission_invoices WHERE id = _invoice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;

  new_paid := COALESCE(inv.amount_paid, 0);
  new_status := inv.status;

  IF _action = 'send' THEN
    new_status := 'sent';
  ELSIF _action = 'view' THEN
    new_status := 'viewed';
  ELSIF _action = 'overdue' THEN
    new_status := 'overdue';
  ELSIF _action = 'void' THEN
    new_status := 'void';
  ELSIF _action = 'paid' THEN
    new_paid := inv.amount;
    new_status := 'paid';
    INSERT INTO public.commission_payments (invoice_id, commission_id, company_id, amount, currency, reference, note, recorded_by)
    VALUES (inv.id, inv.commission_id, inv.company_id, GREATEST(inv.amount - COALESCE(inv.amount_paid,0), 0), inv.currency, _reference, COALESCE(_note,'Marked paid in full'), auth.uid());
  ELSIF _action = 'partial' THEN
    IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'A payment amount is required'; END IF;
    new_paid := LEAST(COALESCE(inv.amount_paid,0) + _amount, inv.amount);
    new_status := CASE WHEN new_paid >= inv.amount THEN 'paid' ELSE 'partial' END;
    INSERT INTO public.commission_payments (invoice_id, commission_id, company_id, amount, currency, reference, note, recorded_by)
    VALUES (inv.id, inv.commission_id, inv.company_id, _amount, inv.currency, _reference, _note, auth.uid());
  ELSE
    RAISE EXCEPTION 'Unknown invoice action: %', _action;
  END IF;

  UPDATE public.commission_invoices
     SET status = new_status,
         amount_paid = new_paid,
         paid_at = CASE WHEN new_status = 'paid' THEN COALESCE(paid_at, now()) ELSE paid_at END,
         sent_at = CASE WHEN new_status = 'sent' THEN COALESCE(sent_at, now()) ELSE sent_at END,
         viewed_at = CASE WHEN new_status = 'viewed' THEN COALESCE(viewed_at, now()) ELSE viewed_at END,
         voided_at = CASE WHEN new_status = 'void' THEN now() ELSE voided_at END,
         notes = COALESCE(_note, notes),
         updated_at = now()
   WHERE id = inv.id;

  UPDATE public.company_commissions
     SET status = CASE
                    WHEN new_status = 'void' THEN 'cancelled'
                    WHEN new_status IN ('paid','partial','overdue') THEN new_status
                    ELSE 'invoiced'
                  END,
         paid_at = CASE WHEN new_status = 'paid' THEN COALESCE(paid_at, now()) ELSE paid_at END,
         updated_at = now()
   WHERE id = inv.commission_id;

  INSERT INTO public.lead_events (quote_id, company_id, actor_id, actor_type, actor_role, event_type, payload, is_public)
  VALUES (inv.quote_id, inv.company_id, auth.uid(), 'admin', 'admin',
          'commission_invoice_' || _action,
          jsonb_build_object('invoice', inv.number, 'amount', COALESCE(_amount, inv.amount), 'status', new_status, 'note', _note),
          false);

  RETURN jsonb_build_object('status', new_status, 'amount_paid', new_paid);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_admin_invoice_action(uuid, text, numeric, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.fn_admin_invoice_action(uuid, text, numeric, text, text) TO authenticated;
