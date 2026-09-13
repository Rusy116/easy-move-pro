CREATE TABLE public.sitemap_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id text NOT NULL,
  part_key text NOT NULL,
  xml text NOT NULL,
  url_count integer NOT NULL DEFAULT 0,
  city_url_count integer NOT NULL DEFAULT 0,
  checksum text NOT NULL,
  byte_size integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'candidate',
  is_active boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sitemap_snapshots_release_part_unique UNIQUE (release_id, part_key),
  CONSTRAINT sitemap_snapshots_status_check CHECK (status IN ('candidate','valid','blocked','active','superseded'))
);

CREATE UNIQUE INDEX sitemap_snapshots_active_part_idx
  ON public.sitemap_snapshots (part_key) WHERE is_active;
CREATE INDEX sitemap_snapshots_release_idx ON public.sitemap_snapshots (release_id);
CREATE INDEX sitemap_snapshots_created_idx ON public.sitemap_snapshots (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sitemap_snapshots TO authenticated;
GRANT ALL ON public.sitemap_snapshots TO service_role;

ALTER TABLE public.sitemap_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sitemap snapshots"
  ON public.sitemap_snapshots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_sitemap_snapshots_updated_at
  BEFORE UPDATE ON public.sitemap_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();