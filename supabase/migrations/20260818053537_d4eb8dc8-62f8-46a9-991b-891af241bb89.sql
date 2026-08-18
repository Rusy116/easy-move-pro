
-- 1. Move the SECURITY DEFINER masking view out of the exposed API schema
CREATE SCHEMA IF NOT EXISTS internal;
REVOKE ALL ON SCHEMA internal FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA internal TO authenticated, service_role;

CREATE OR REPLACE VIEW internal.mover_lead_source AS
 SELECT id, quote_number, lead_phase, status, move_type, move_size, move_date,
    preferred_time, flexible_date, origin_city, origin_state, origin_zip,
    destination_city, destination_state, destination_zip, distance_miles,
    estimated_cubic_feet, estimated_weight_lbs, truck_size, num_movers,
    property_type, floor, elevator, origin_stairs, destination_stairs,
    origin_elevator, destination_elevator, origin_long_carry, destination_long_carry,
    packing, unpacking, storage, assembly, junk_removal, heavy_items, piano, safe,
    gym_equipment, appliances, fragile_items, insurance_tier, inventory,
    estimated_low, estimated_high, exclusive_started_at, exclusive_expires_at,
    exclusive_paused_at, open_market_opened_at, assigned_company_id, assigned_at,
    created_at, last_activity_at,
    public.fn_lead_unlocked(id) AS unlocked,
    CASE WHEN public.fn_lead_unlocked(id) THEN COALESCE(details ->> 'fullName', '') ELSE NULL::text END AS full_name,
    CASE WHEN public.fn_lead_unlocked(id) THEN contact_phone ELSE NULL::text END AS contact_phone,
    CASE WHEN public.fn_lead_unlocked(id) THEN contact_email ELSE NULL::text END AS contact_email,
    CASE WHEN public.fn_lead_unlocked(id) THEN origin_address ELSE NULL::text END AS origin_address,
    CASE WHEN public.fn_lead_unlocked(id) THEN destination_address ELSE NULL::text END AS destination_address,
    CASE WHEN public.fn_lead_unlocked(id) THEN inventory_notes ELSE NULL::text END AS inventory_notes,
    CASE WHEN public.fn_lead_unlocked(id) THEN details ELSE NULL::jsonb END AS details
   FROM public.quotes q
  WHERE public.mover_can_see_quote(id);

GRANT SELECT ON internal.mover_lead_source TO authenticated, service_role;

DROP VIEW IF EXISTS public.mover_lead_view;
CREATE VIEW public.mover_lead_view WITH (security_invoker = true) AS
  SELECT * FROM internal.mover_lead_source;
GRANT SELECT ON public.mover_lead_view TO authenticated, service_role;

-- 2. Jobs: movers may not touch financial / ownership columns
CREATE OR REPLACE FUNCTION public.guard_job_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.is_staff()
     OR COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role'
  THEN
    RETURN NEW;
  END IF;

  NEW.final_price       := OLD.final_price;
  NEW.broker_commission := OLD.broker_commission;
  NEW.gross_profit      := OLD.gross_profit;
  NEW.company_id        := OLD.company_id;
  NEW.quote_id          := OLD.quote_id;
  NEW.customer_id       := OLD.customer_id;
  NEW.job_number        := OLD.job_number;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_job_financials() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_job_financials ON public.jobs;
CREATE TRIGGER trg_guard_job_financials
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.guard_job_financials();

-- 3. Company invoices: payment status cannot be falsified
CREATE OR REPLACE FUNCTION public.guard_company_invoice_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.is_staff()
     OR COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role'
  THEN
    RETURN NEW;
  END IF;

  -- immutable identity columns
  NEW.company_id := OLD.company_id;
  NEW.quote_id   := OLD.quote_id;
  NEW.number     := OLD.number;
  NEW.created_by := OLD.created_by;

  -- a settled invoice is staff-only from here on
  IF OLD.status = 'paid' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Only staff can reopen a paid invoice';
  END IF;
  IF OLD.status = 'paid' THEN
    NEW.total       := OLD.total;
    NEW.amount_paid := OLD.amount_paid;
    NEW.paid_at     := OLD.paid_at;
    RETURN NEW;
  END IF;

  -- payment figures must stay consistent with the invoice amount
  IF NEW.status = 'paid' THEN
    NEW.amount_paid := NEW.total;
    NEW.paid_at     := COALESCE(NEW.paid_at, now());
  ELSIF NEW.status = 'partially_paid' THEN
    NEW.amount_paid := LEAST(GREATEST(COALESCE(NEW.amount_paid, 0), 0), COALESCE(NEW.total, 0));
    NEW.paid_at     := NULL;
  ELSE
    NEW.amount_paid := LEAST(GREATEST(COALESCE(NEW.amount_paid, 0), 0), COALESCE(NEW.total, 0));
    NEW.paid_at     := NULL;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_company_invoice_payments() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_company_invoice_payments ON public.company_invoices;
CREATE TRIGGER trg_guard_company_invoice_payments
BEFORE UPDATE ON public.company_invoices
FOR EACH ROW EXECUTE FUNCTION public.guard_company_invoice_payments();

-- 4. Remove client EXECUTE on internal SECURITY DEFINER routines
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname IN (
        'fn_sla_tick','fn_claim_expiry_tick','fn_lead_expiry_tick','fn_expire_stale_claims',
        'fn_finance_overdue_tick','fn_fulfill_accepted_quote','fn_generate_commission_invoice',
        'fn_cancel_commission_for_quote','fn_notify_broker','fn_notify_marketplace',
        'fn_customer_notify','fn_job_log','fn_sync_lead_phase','fn_distribute_lead',
        'fn_claim_lead_core','fn_company_matches_lead','fn_matching_companies',
        'fn_customer_name','fn_lead_claimed_by_company','generate_quote_number',
        'generate_company_invoice_number','assign_company_invoice_number',
        'assign_quote_identifiers','handle_new_user','guard_moving_company_vetting',
        'bump_quote_last_activity','bump_company_conv_last_msg','default_visibility_mask'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;
