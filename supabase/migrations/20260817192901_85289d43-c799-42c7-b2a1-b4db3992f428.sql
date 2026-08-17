-- ---------------------------------------------------------------------------
-- 1. Brokers must not read every company's staff roster
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "company_users read own company" ON public.company_users;

CREATE POLICY "company_users self, member company, admin, or worked lead"
  ON public.company_users FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR company_id IN (SELECT public.fn_my_company_ids())
    OR (
      public.has_role(auth.uid(), 'broker'::app_role)
      AND EXISTS (
        SELECT 1
        FROM public.quote_assignments qa
        JOIN public.quotes q ON q.id = qa.quote_id
        WHERE qa.company_id = public.company_users.company_id
          AND q.assigned_broker_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Overdue-invoice sweep: admin or internal service only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_finance_overdue_tick()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE n integer := 0; r record;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

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

  FOR r IN
    SELECT i.* FROM public.commission_invoices i
    WHERE i.status='invoiced' AND i.due_date = current_date + 3
  LOOP
    INSERT INTO public.company_notifications(company_id, type, title, body, quote_id)
    VALUES (r.company_id, 'invoice_due', 'Invoice due soon',
            'Invoice ' || r.number || ' is due on ' || r.due_date::text || '.', r.quote_id);
  END LOOP;

  INSERT INTO public.admin_notifications(type, quote_id, message)
  SELECT 'large_outstanding', NULL,
         'Large outstanding balance: ' || c.name || ' owes $' || ROUND(SUM(i.amount),2)::text
  FROM public.commission_invoices i
  JOIN public.moving_companies c ON c.id = i.company_id
  WHERE i.status IN ('invoiced','overdue')
  GROUP BY c.id, c.name
  HAVING SUM(i.amount) > 5000;

  RETURN n;
END $function$;

GRANT EXECUTE ON FUNCTION public.fn_finance_overdue_tick() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Trigger functions never need a direct EXECUTE grant
-- ---------------------------------------------------------------------------
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prorettype::regtype::text = 'trigger'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Internal-only helpers: callable from inside other functions/triggers and
--    by the service role, never directly by app clients.
-- ---------------------------------------------------------------------------
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'fn_admin_assign_lead','fn_admin_redistribute_lead','fn_cancel_commission_for_quote',
        'fn_claim_lead_core','fn_company_matches_lead','fn_customer_notify','fn_distribute_lead',
        'fn_estimate_respond','fn_expire_stale_claims','fn_finance_audit','fn_fulfill_accepted_quote',
        'fn_generate_commission_invoice','fn_issue_company_warning','fn_job_log',
        'fn_lead_claimed_by_company','fn_lead_expiry_tick','fn_lead_unlocked','fn_matching_companies',
        'fn_mover_accept_lead','fn_mover_lead_progress','fn_my_account_status','fn_my_primary_role',
        'fn_notify_broker','fn_notify_marketplace','fn_release_lead','fn_return_job_to_market',
        'fn_sla_tick','fn_claim_expiry_tick','fn_sync_lead_phase','fn_marketplace_status',
        'fn_customer_name','generate_company_invoice_number','generate_quote_number',
        'is_broker','log_lead_event'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
  END LOOP;
END $$;