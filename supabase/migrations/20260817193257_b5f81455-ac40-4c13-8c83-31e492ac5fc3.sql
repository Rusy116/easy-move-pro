ALTER FUNCTION public.tg_sync_quote_marketplace_status() SECURITY DEFINER;
ALTER FUNCTION public.tg_sync_quote_marketplace_status() SET search_path = public;
ALTER FUNCTION public.trg_customers_fill_name() SECURITY DEFINER;
ALTER FUNCTION public.trg_customers_fill_name() SET search_path = public;
REVOKE ALL ON FUNCTION public.tg_sync_quote_marketplace_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_customers_fill_name() FROM PUBLIC, anon, authenticated;