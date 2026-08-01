CREATE OR REPLACE FUNCTION public.trg_customers_fill_name()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE q public.quotes; n text;
BEGIN
  IF NEW.quote_id IS NOT NULL AND (NEW.full_name IS NULL OR NEW.full_name = '' OR NEW.full_name = NEW.email) THEN
    SELECT * INTO q FROM public.quotes WHERE id = NEW.quote_id;
    IF FOUND THEN
      n := public.fn_customer_name(q);
      IF n IS NOT NULL THEN NEW.full_name := n; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS customers_fill_name ON public.customers;
CREATE TRIGGER customers_fill_name
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.trg_customers_fill_name();