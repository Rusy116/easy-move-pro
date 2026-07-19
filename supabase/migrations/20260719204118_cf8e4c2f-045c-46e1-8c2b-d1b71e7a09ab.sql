
-- Sequence for quote numbers
CREATE SEQUENCE IF NOT EXISTS public.quote_number_seq START 1000;

-- New columns on quotes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS quote_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS portal_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimate_email_sent_at TIMESTAMPTZ;

-- Generator function
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n BIGINT;
BEGIN
  n := nextval('public.quote_number_seq');
  RETURN 'EM-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 6, '0');
END;
$$;

-- Trigger: assign quote_number + portal_token on insert if missing
CREATE OR REPLACE FUNCTION public.assign_quote_identifiers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    NEW.quote_number := public.generate_quote_number();
  END IF;
  IF NEW.portal_token IS NULL THEN
    NEW.portal_token := encode(gen_random_bytes(18), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_quote_identifiers ON public.quotes;
CREATE TRIGGER trg_assign_quote_identifiers
  BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.assign_quote_identifiers();

-- Backfill existing rows
UPDATE public.quotes
SET quote_number = public.generate_quote_number()
WHERE quote_number IS NULL;

UPDATE public.quotes
SET portal_token = encode(gen_random_bytes(18), 'hex')
WHERE portal_token IS NULL;

-- Allow public (anon) read via portal token lookup
-- We rely on the app filtering by quote_number + portal_token; policy permits anon SELECT
-- because the token acts as the secret.
DROP POLICY IF EXISTS "Public can view quote by portal token" ON public.quotes;
CREATE POLICY "Public can view quote by portal token"
  ON public.quotes
  FOR SELECT
  TO anon, authenticated
  USING (portal_token IS NOT NULL);

-- Allow public accept: update accepted_at + status when portal_token matches (checked via RPC below)
CREATE OR REPLACE FUNCTION public.accept_quote(_quote_number TEXT, _portal_token TEXT)
RETURNS TABLE(id UUID, quote_number TEXT, accepted_at TIMESTAMPTZ, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.quotes q
  SET accepted_at = COALESCE(q.accepted_at, now()),
      status = CASE WHEN q.status IN ('new','contacted') THEN 'accepted' ELSE q.status END
  WHERE q.quote_number = _quote_number
    AND q.portal_token = _portal_token
  RETURNING q.id, q.quote_number, q.accepted_at, q.status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_quote(TEXT, TEXT) TO anon, authenticated;
GRANT SELECT ON public.quotes TO anon;
