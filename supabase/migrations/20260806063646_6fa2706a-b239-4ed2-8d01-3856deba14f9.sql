ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS trigger_type    text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS dependencies    text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS next_run_at     timestamptz,
  ADD COLUMN IF NOT EXISTS schedule        text,
  ADD COLUMN IF NOT EXISTS retry_count     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries     integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS last_runtime_ms integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error      text,
  ADD COLUMN IF NOT EXISTS inputs          jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS outputs         jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS route           text;

INSERT INTO public.ai_agents
  (key, name, description, category, status, sort_order, priority, queue, version,
   trigger_type, dependencies, schedule, capabilities, inputs, outputs, route)
VALUES
 ('usa_data_engine','USA Data Engine','Master USA dataset: states, counties, cities, ZIP codes, neighborhoods, highways, coordinates, population, demand score and SEO priority.','data','ready',1,1,'usa_data','1.0.0','manual','{}','on demand',
  ARRAY['import_batch','dedupe','resume'],'["batch_size","source"]'::jsonb,'["usa_cities rows"]'::jsonb,'/ai/usa-data'),
 ('city_landing_agent','City Calculator Factory','Always first. Import city, generate the calculator page, validate 22 gates, publish. Exactly one calculator per city.','seo','ready',2,2,'city_landing','1.0.0','pipeline','{usa_data_engine}','continuous',
  ARRAY['generate_calculator','validate','publish'],'["city_slug","state_code"]'::jsonb,'["/moving-calculator/{city}-{st}"]'::jsonb,'/ai/cities'),
 ('seo_landing_factory','SEO Landing Factory','Builds the localized /movers/{city}-{st} service page that embeds the one official calculator.','seo','ready',3,3,'city_landing','1.0.0','pipeline','{city_landing_agent}','continuous',
  ARRAY['generate_seo_page','embed_calculator'],'["published calculator"]'::jsonb,'["/movers/{city}-{st}"]'::jsonb,'/ai/city-review'),
 ('internal_linking_engine','Internal Linking Engine','Hierarchical link mesh from neighborhood to USA hub with reverse links and an orphan guard.','seo','ready',4,4,'city_landing','1.0.0','pipeline','{seo_landing_factory}','continuous',
  ARRAY['build_hierarchy','orphan_guard'],'["published pages"]'::jsonb,'["internal link graph"]'::jsonb,'/ai/city-factory'),
 ('seo_content_engine','SEO Content Engine','Unique localized content per city: FAQ, neighborhoods, parking, regulations, weather, landmarks and ZIP data.','content','ready',5,4,'content','1.0.0','pipeline','{usa_data_engine}','continuous',
  ARRAY['generate_copy','generate_faq','generate_schema'],'["city facts"]'::jsonb,'["page copy","FAQ","JSON-LD"]'::jsonb,'/ai/seo'),
 ('blog_agent','Consumer Blog Agent','SEO articles for moving customers, each linking to the calculator, city pages and store.','content','ready',6,5,'content','1.0.0','scheduled','{seo_content_engine}','daily',
  ARRAY['write_article','internal_links'],'["topic pool"]'::jsonb,'["ai_content_items (blog_article)"]'::jsonb,'/ai/ecosystem'),
 ('mover_growth_agent','Moving Company Growth Agent','SEO articles targeting moving companies; every article promotes marketplace registration.','growth','ready',7,5,'content','1.0.0','scheduled','{seo_content_engine}','daily',
  ARRAY['write_article','marketplace_cta'],'["topic pool"]'::jsonb,'["ai_content_items (mover_article)"]'::jsonb,'/ai/ecosystem'),
 ('product_factory','Digital Product Agent','Checklists, planners, templates, inventory sheets, labels and guides with landing page, SEO and download page.','products','ready',8,6,'products','1.0.0','scheduled','{seo_content_engine}','weekly',
  ARRAY['generate_product','store_seo'],'["product ideas"]'::jsonb,'["ai_products"]'::jsonb,'/ai/products'),
 ('image_factory','Image Agent','Featured images, social images, infographics, OpenGraph and Pinterest graphics, product covers.','media','ready',9,6,'media','1.0.0','pipeline','{blog_agent,product_factory}','continuous',
  ARRAY['image_brief','og_image','product_cover'],'["content items","products"]'::jsonb,'["image briefs / assets"]'::jsonb,'/ai/ecosystem'),
 ('self_optimization_agent','Self Optimization Agent','Detects underperforming pages and regenerates title, meta, FAQ, links and content, then republishes.','seo','ready',10,7,'city_landing','1.0.0','scheduled','{internal_linking_engine}','daily',
  ARRAY['audit','improve','republish'],'["page metrics"]'::jsonb,'["republished pages"]'::jsonb,'/ai/city-factory'),
 ('google_performance_agent','Google Performance Agent','Tracks rankings, CTR, impressions, clicks, Core Web Vitals and index status.','analytics','ready',11,7,'analytics','1.0.0','scheduled','{seo_landing_factory}','daily',
  ARRAY['index_status','ctr_tracking','position_delta'],'["search console signals"]'::jsonb,'["ai_metrics_daily"]'::jsonb,'/ai/city-index'),
 ('revenue_agent','Revenue Agent','Read-only rollup of marketplace, broker, digital product and pipeline revenue, MRR and LTV.','analytics','ready',12,8,'analytics','1.0.0','scheduled','{google_performance_agent}','daily',
  ARRAY['revenue_rollup','mrr','ltv'],'["commissions","purchases"]'::jsonb,'["ai_metrics_daily"]'::jsonb,'/ai/ecosystem')
ON CONFLICT (key) DO UPDATE SET
  name         = EXCLUDED.name,
  description  = EXCLUDED.description,
  category     = EXCLUDED.category,
  sort_order   = EXCLUDED.sort_order,
  priority     = EXCLUDED.priority,
  queue        = EXCLUDED.queue,
  trigger_type = EXCLUDED.trigger_type,
  dependencies = EXCLUDED.dependencies,
  schedule     = EXCLUDED.schedule,
  capabilities = EXCLUDED.capabilities,
  inputs       = EXCLUDED.inputs,
  outputs      = EXCLUDED.outputs,
  route        = EXCLUDED.route;

UPDATE public.ai_agents SET status = 'ready' WHERE status = 'idle';