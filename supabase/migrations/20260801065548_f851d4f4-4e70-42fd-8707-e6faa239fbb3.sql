CREATE UNIQUE INDEX IF NOT EXISTS company_commissions_quote_company_uidx
  ON public.company_commissions (quote_id, company_id);

CREATE OR REPLACE FUNCTION public.trg_job_commission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; v_rate numeric; v_amount numeric;
BEGIN
  IF NEW.company_id IS NULL OR NEW.final_price IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO q FROM public.quotes WHERE id = NEW.quote_id;
  v_amount := COALESCE(NEW.broker_commission, ROUND(NEW.final_price * 0.25, 2));
  v_rate := CASE WHEN NEW.final_price > 0 THEN ROUND(v_amount / NEW.final_price, 4) ELSE 0.25 END;

  INSERT INTO public.company_commissions (quote_id, company_id, base_price, rate, amount, status, broker_id, customer_id, notes)
  VALUES (NEW.quote_id, NEW.company_id, NEW.final_price, v_rate, v_amount, 'pending',
          q.assigned_broker_id, q.user_id, 'Auto-created from accepted estimate · job ' || NEW.job_number)
  ON CONFLICT (quote_id, company_id) DO UPDATE
    SET base_price = EXCLUDED.base_price,
        rate = EXCLUDED.rate,
        amount = EXCLUDED.amount,
        updated_at = now()
    WHERE public.company_commissions.status IN ('pending','invoiced');

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS jobs_create_commission ON public.jobs;
CREATE TRIGGER jobs_create_commission
AFTER INSERT OR UPDATE OF final_price, broker_commission ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.trg_job_commission();