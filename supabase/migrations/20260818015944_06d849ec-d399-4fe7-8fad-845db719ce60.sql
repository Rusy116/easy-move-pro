CREATE TABLE public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  template text NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','skipped','failed')),
  reason text,
  provider_id text,
  ref_type text,
  ref_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notification_deliveries_created ON public.notification_deliveries (created_at DESC);
CREATE INDEX idx_notification_deliveries_ref ON public.notification_deliveries (ref_type, ref_id);

GRANT ALL ON public.notification_deliveries TO service_role;
GRANT SELECT ON public.notification_deliveries TO authenticated;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read notification deliveries"
  ON public.notification_deliveries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'broker'::public.app_role));

CREATE TRIGGER trg_notification_deliveries_updated
  BEFORE UPDATE ON public.notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_phone_verifications_phone ON public.phone_verifications (phone, created_at DESC);

GRANT ALL ON public.phone_verifications TO service_role;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_phone_verifications_updated
  BEFORE UPDATE ON public.phone_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;