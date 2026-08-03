
CREATE OR REPLACE FUNCTION public.tg_calc_broker_share()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.broker_rate := COALESCE(NEW.broker_rate, 0.10);
  NEW.broker_amount := round(COALESCE(NEW.amount, 0) * NEW.broker_rate, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commissions_broker_share ON public.company_commissions;
CREATE TRIGGER trg_commissions_broker_share
  BEFORE INSERT OR UPDATE OF amount, broker_rate ON public.company_commissions
  FOR EACH ROW EXECUTE FUNCTION public.tg_calc_broker_share();

DROP TRIGGER IF EXISTS trg_invoices_broker_share ON public.commission_invoices;
CREATE TRIGGER trg_invoices_broker_share
  BEFORE INSERT ON public.commission_invoices
  FOR EACH ROW EXECUTE FUNCTION public.tg_calc_broker_share();
