
-- ============ AI GROWTH CENTER ============
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'idle',
  enabled boolean NOT NULL DEFAULT true,
  current_task text,
  progress integer NOT NULL DEFAULT 0,
  success_rate numeric NOT NULL DEFAULT 100,
  error_count integer NOT NULL DEFAULT 0,
  run_count integer NOT NULL DEFAULT 0,
  cpu_usage numeric NOT NULL DEFAULT 0,
  memory_usage numeric NOT NULL DEFAULT 0,
  estimated_completion timestamptz,
  last_run_at timestamptz,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key text NOT NULL,
  capability text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  progress integer NOT NULL DEFAULT 0,
  priority integer NOT NULL DEFAULT 5,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  error text,
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_task_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
  agent_key text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'article',
  title text NOT NULL,
  slug text,
  locale text NOT NULL DEFAULT 'en',
  summary text,
  body text,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_markup jsonb,
  status text NOT NULL DEFAULT 'draft',
  quality_score integer,
  duplicate_of uuid,
  target_city text,
  target_state text,
  keyword text,
  agent_key text,
  task_id uuid REFERENCES public.ai_tasks(id) ON DELETE SET NULL,
  scheduled_for timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text,
  product_type text NOT NULL DEFAULT 'pdf',
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  quality_score integer,
  cover_url text,
  preview_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  bundle_of jsonb NOT NULL DEFAULT '[]'::jsonb,
  downloads integer NOT NULL DEFAULT 0,
  revenue_cents integer NOT NULL DEFAULT 0,
  agent_key text,
  task_id uuid REFERENCES public.ai_tasks(id) ON DELETE SET NULL,
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  agent_key text NOT NULL,
  capability text NOT NULL,
  frequency text NOT NULL DEFAULT 'daily',
  run_at time,
  day_of_week integer,
  quantity integer NOT NULL DEFAULT 1,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL DEFAULT CURRENT_DATE,
  metric text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  dims jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day, metric, dims)
);

-- grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_task_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_content_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_automations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_metrics_daily TO authenticated;
GRANT ALL ON public.ai_agents, public.ai_tasks, public.ai_task_logs, public.ai_content_items,
  public.ai_products, public.ai_automations, public.ai_settings, public.ai_metrics_daily TO service_role;

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage ai_agents" ON public.ai_agents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage ai_tasks" ON public.ai_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage ai_task_logs" ON public.ai_task_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage ai_content_items" ON public.ai_content_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage ai_products" ON public.ai_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage ai_automations" ON public.ai_automations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage ai_settings" ON public.ai_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage ai_metrics_daily" ON public.ai_metrics_daily FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_ai_tasks_status ON public.ai_tasks(status, created_at DESC);
CREATE INDEX idx_ai_tasks_agent ON public.ai_tasks(agent_key, created_at DESC);
CREATE INDEX idx_ai_logs_task ON public.ai_task_logs(task_id, created_at DESC);
CREATE INDEX idx_ai_content_status ON public.ai_content_items(status, created_at DESC);
CREATE INDEX idx_ai_products_status ON public.ai_products(status, created_at DESC);

CREATE TRIGGER trg_ai_agents_updated BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ai_tasks_updated BEFORE UPDATE ON public.ai_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ai_content_updated BEFORE UPDATE ON public.ai_content_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ai_products_updated BEFORE UPDATE ON public.ai_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ai_automations_updated BEFORE UPDATE ON public.ai_automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_agents (key, name, description, category, sort_order) VALUES
  ('ai_ceo','AI CEO','Orchestrates every agent, sets daily growth priorities and approves plans.','executive',1),
  ('seo_factory','SEO Factory','Produces city, route, service and category pages with schema and internal links.','seo',2),
  ('product_factory','Digital Product Factory','Generates PDFs, planners, checklists and workbooks for the store.','products',3),
  ('content_factory','Content Factory','Writes articles, guides, FAQs and comparison pages.','content',4),
  ('image_factory','Image Factory','Creates covers, preview images and illustrations.','media',5),
  ('publishing_agent','Publishing Agent','Moves approved content through the publishing queue.','publishing',6),
  ('analytics_agent','Analytics Agent','Tracks clicks, impressions, CTR, positions and revenue.','analytics',7),
  ('crm_intelligence','CRM Intelligence','Surfaces lead quality signals and pipeline insights.','crm',8),
  ('email_agent','Email Agent','Drafts and schedules lifecycle email campaigns.','lifecycle',9),
  ('social_agent','Social Agent','Repurposes content into social posts and schedules them.','lifecycle',10),
  ('video_agent','Video Agent','Turns guides into short-form video scripts and storyboards.','media',11);

INSERT INTO public.ai_settings (key, value) VALUES
  ('languages','{"enabled":["en","es","ru"],"default":"en"}'::jsonb),
  ('geography','{"countries":["US"],"states":[],"cities":[]}'::jsonb),
  ('content_templates','{"templates":[]}'::jsonb),
  ('seo_templates','{"title":"{keyword} | Easy Moving","description":"{summary}"}'::jsonb),
  ('publishing_rules','{"auto_publish_approved":false,"daily_limit":25}'::jsonb),
  ('quality_rules','{"min_quality_score":75,"min_words":800,"require_schema":true}'::jsonb),
  ('approval_workflow','{"require_human_review":true,"reviewers":[]}'::jsonb),
  ('ai_models','{"text":"google/gemini-2.5-flash","image":"google/gemini-2.5-flash-image","reasoning":"google/gemini-2.5-pro"}'::jsonb),
  ('task_limits','{"max_concurrent":3,"daily_task_cap":200}'::jsonb),
  ('api_keys','{"managed":true,"note":"Keys are stored securely as backend secrets."}'::jsonb);
