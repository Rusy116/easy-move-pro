
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.company_conv_kind AS ENUM ('broker','internal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.company_invoice_kind AS ENUM ('deposit','final','extra','adjustment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.company_invoice_status AS ENUM ('draft','sent','partially_paid','paid','void','overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.company_doc_kind AS ENUM ('estimate','invoice','bill_of_lading','contract','insurance','license','photo','attachment','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.company_service_area_kind AS ENUM ('city','zip','state','radius');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ CONVERSATIONS ============
CREATE TABLE IF NOT EXISTS public.company_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  kind public.company_conv_kind NOT NULL DEFAULT 'internal',
  subject TEXT NOT NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_conv_company ON public.company_conversations(company_id, last_message_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_conversations TO authenticated;
GRANT ALL ON public.company_conversations TO service_role;
ALTER TABLE public.company_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members read conversations"
  ON public.company_conversations FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin());
CREATE POLICY "company members insert conversations"
  ON public.company_conversations FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_user_company_id());
CREATE POLICY "company members update conversations"
  ON public.company_conversations FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());
CREATE POLICY "company members delete conversations"
  ON public.company_conversations FOR DELETE TO authenticated
  USING (company_id = public.current_user_company_id());

CREATE TABLE IF NOT EXISTS public.company_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.company_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL DEFAULT 'mover',
  sender_name TEXT,
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_msg_conv ON public.company_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_company_msg_company ON public.company_messages(company_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_messages TO authenticated;
GRANT ALL ON public.company_messages TO service_role;
ALTER TABLE public.company_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members read messages"
  ON public.company_messages FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin());
CREATE POLICY "company members insert messages"
  ON public.company_messages FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_user_company_id());
CREATE POLICY "company members update messages"
  ON public.company_messages FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());

CREATE OR REPLACE FUNCTION public.bump_company_conv_last_msg()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.company_conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_bump_company_conv_last_msg ON public.company_messages;
CREATE TRIGGER trg_bump_company_conv_last_msg
  AFTER INSERT ON public.company_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_company_conv_last_msg();

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS public.company_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_notif_co ON public.company_notifications(company_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_notifications TO authenticated;
GRANT ALL ON public.company_notifications TO service_role;
ALTER TABLE public.company_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company notif read" ON public.company_notifications FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin());
CREATE POLICY "company notif insert" ON public.company_notifications FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin());
CREATE POLICY "company notif update" ON public.company_notifications FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());
CREATE POLICY "company notif delete" ON public.company_notifications FOR DELETE TO authenticated
  USING (company_id = public.current_user_company_id());

-- ============ INVOICES ============
CREATE SEQUENCE IF NOT EXISTS public.company_invoice_seq;
CREATE TABLE IF NOT EXISTS public.company_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  number TEXT NOT NULL UNIQUE,
  kind public.company_invoice_kind NOT NULL DEFAULT 'final',
  status public.company_invoice_status NOT NULL DEFAULT 'draft',
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  pdf_path TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_invoices_co ON public.company_invoices(company_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_invoices TO authenticated;
GRANT ALL ON public.company_invoices TO service_role;
ALTER TABLE public.company_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co invoice read" ON public.company_invoices FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin());
CREATE POLICY "co invoice write" ON public.company_invoices FOR ALL TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());
DROP TRIGGER IF EXISTS trg_company_invoices_updated ON public.company_invoices;
CREATE TRIGGER trg_company_invoices_updated BEFORE UPDATE ON public.company_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.generate_company_invoice_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n BIGINT;
BEGIN
  n := nextval('public.company_invoice_seq');
  RETURN 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 6, '0');
END $$;

CREATE OR REPLACE FUNCTION public.assign_company_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.number IS NULL OR NEW.number = '' THEN
    NEW.number := public.generate_company_invoice_number();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_company_invoice_number ON public.company_invoices;
CREATE TRIGGER trg_company_invoice_number BEFORE INSERT ON public.company_invoices
  FOR EACH ROW EXECUTE FUNCTION public.assign_company_invoice_number();

CREATE TABLE IF NOT EXISTS public.company_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.company_invoices(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ci_items_inv ON public.company_invoice_items(invoice_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_invoice_items TO authenticated;
GRANT ALL ON public.company_invoice_items TO service_role;
ALTER TABLE public.company_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co inv item read" ON public.company_invoice_items FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin());
CREATE POLICY "co inv item write" ON public.company_invoice_items FOR ALL TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());

-- ============ DOCUMENTS ============
CREATE TABLE IF NOT EXISTS public.company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.company_invoices(id) ON DELETE SET NULL,
  kind public.company_doc_kind NOT NULL DEFAULT 'attachment',
  name TEXT NOT NULL,
  storage_path TEXT,
  external_url TEXT,
  mime TEXT,
  size_bytes BIGINT,
  version INT NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES public.company_documents(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_docs_co ON public.company_documents(company_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_documents TO authenticated;
GRANT ALL ON public.company_documents TO service_role;
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co docs read" ON public.company_documents FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin());
CREATE POLICY "co docs write" ON public.company_documents FOR ALL TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());

-- ============ SERVICE AREAS, TRUCKS, CREWS ============
CREATE TABLE IF NOT EXISTS public.company_service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  kind public.company_service_area_kind NOT NULL,
  value TEXT NOT NULL,
  radius_miles INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_csa_co ON public.company_service_areas(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_service_areas TO authenticated;
GRANT ALL ON public.company_service_areas TO service_role;
ALTER TABLE public.company_service_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csa read" ON public.company_service_areas FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin());
CREATE POLICY "csa write" ON public.company_service_areas FOR ALL TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());

CREATE TABLE IF NOT EXISTS public.company_trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plate TEXT,
  capacity_cuft INT,
  capacity_lbs INT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_trucks TO authenticated;
GRANT ALL ON public.company_trucks TO service_role;
ALTER TABLE public.company_trucks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trucks read" ON public.company_trucks FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin());
CREATE POLICY "trucks write" ON public.company_trucks FOR ALL TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());

CREATE TABLE IF NOT EXISTS public.company_crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.moving_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size INT NOT NULL DEFAULT 2,
  lead_name TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_crews TO authenticated;
GRANT ALL ON public.company_crews TO service_role;
ALTER TABLE public.company_crews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crews read" ON public.company_crews FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin());
CREATE POLICY "crews write" ON public.company_crews FOR ALL TO authenticated
  USING (company_id = public.current_user_company_id())
  WITH CHECK (company_id = public.current_user_company_id());

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_conversations;
