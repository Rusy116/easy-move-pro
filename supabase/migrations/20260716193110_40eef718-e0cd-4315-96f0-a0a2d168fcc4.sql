
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'mover', 'customer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles self upsert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles admin read" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Quotes
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  origin_zip text NOT NULL,
  destination_zip text NOT NULL,
  origin_city text,
  destination_city text,
  property_type text NOT NULL,
  bedrooms int NOT NULL DEFAULT 1,
  floor int NOT NULL DEFAULT 1,
  elevator boolean NOT NULL DEFAULT false,
  packing boolean NOT NULL DEFAULT false,
  storage boolean NOT NULL DEFAULT false,
  assembly boolean NOT NULL DEFAULT false,
  heavy_items boolean NOT NULL DEFAULT false,
  long_carry boolean NOT NULL DEFAULT false,
  move_date date,
  inventory_notes text,
  estimated_low numeric(10,2) NOT NULL,
  estimated_high numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  contact_email text,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.quotes TO authenticated;
GRANT INSERT ON public.quotes TO anon;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes owner read" ON public.quotes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "quotes owner insert" ON public.quotes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "quotes anon insert" ON public.quotes FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "quotes admin all" ON public.quotes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Blog posts
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text,
  body text NOT NULL,
  cover_url text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog public read" ON public.blog_posts FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "blog admin all" ON public.blog_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Digital products
CREATE TABLE public.digital_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  price_cents int NOT NULL DEFAULT 0,
  cover_url text,
  download_url text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.digital_products TO anon, authenticated;
GRANT ALL ON public.digital_products TO service_role;
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products public read" ON public.digital_products FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "products admin all" ON public.digital_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed blog + products
INSERT INTO public.blog_posts (slug, title, excerpt, body, published, published_at) VALUES
  ('moving-checklist-30-days', 'The 30-Day Moving Checklist', 'Everything you need to do before, during, and after your move.', 'Start 30 days out by decluttering, sourcing supplies, and researching movers. Two weeks out, notify utilities and change your address. One week before, pack non-essentials. Move day: verify inventory, tip your crew, and take photos of electronics before disconnecting.', true, now()),
  ('cross-country-moving-costs', 'What a Cross-Country Move Really Costs in 2026', 'A transparent breakdown of interstate moving costs.', 'The average interstate move for a 2-bedroom home runs $3,500–$6,000. Distance, weight, seasonality, and add-on services (packing, storage, piano moves) are the biggest levers. Getting three quotes typically saves 15–25%.', true, now()),
  ('packing-fragile-items', 'How to Pack Fragile Items Like a Pro', 'Ten proven techniques from moving specialists.', 'Use dish-pack boxes for plates on their sides, never flat. Wrap each glass individually. Fill every void — a shifting box is a broken box. Label “FRAGILE — THIS SIDE UP” on all four sides.', true, now());

INSERT INTO public.digital_products (slug, title, description, price_cents, published) VALUES
  ('moving-checklist-pdf', 'Ultimate Moving Checklist PDF', 'A printable 12-page checklist covering the entire move timeline.', 900, true),
  ('inventory-tracker', 'Room-by-Room Inventory Tracker', 'Spreadsheet template with photos, box IDs, and value tracking.', 1500, true),
  ('address-change-kit', 'Address Change Kit', 'Letter templates and checklist for utilities, banks, and subscriptions.', 700, true);
