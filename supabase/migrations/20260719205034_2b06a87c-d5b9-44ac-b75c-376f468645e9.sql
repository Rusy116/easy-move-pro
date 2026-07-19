
-- Admin notifications for events like quote acceptance
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notifications"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can mark notifications read"
  ON public.admin_notifications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX admin_notifications_unread_idx
  ON public.admin_notifications (created_at DESC)
  WHERE read_at IS NULL;

-- Fire a notification whenever a quote is accepted (accepted_at transitions from null)
CREATE OR REPLACE FUNCTION public.notify_admin_on_quote_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  who TEXT;
BEGIN
  IF NEW.accepted_at IS NOT NULL AND (OLD.accepted_at IS NULL) THEN
    who := COALESCE(NEW.details->>'fullName', NEW.contact_email, 'Customer');
    INSERT INTO public.admin_notifications (type, quote_id, message)
    VALUES (
      'quote_accepted',
      NEW.id,
      who || ' accepted quote ' || COALESCE(NEW.quote_number, NEW.id::text)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER quotes_notify_admin_on_accept
AFTER UPDATE OF accepted_at ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_quote_accept();
