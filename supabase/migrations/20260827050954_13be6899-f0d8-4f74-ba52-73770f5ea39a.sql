SELECT cron.alter_job(
  2,
  command := $cmd$
  select net.http_post(
    url := 'https://project--40566f2a-e836-4f39-8e43-3b2c6cfec7c2.lovable.app/api/public/hooks/city-production-tick',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-factory-tick-secret', public.fn_factory_tick_secret()),
    body := '{"trigger": "cron"}'::jsonb,
    timeout_milliseconds := 55000
  ) as request_id;
  $cmd$
);

SELECT cron.alter_job(
  3,
  command := $cmd$
  SELECT net.http_post(
    url := 'https://project--40566f2a-e836-4f39-8e43-3b2c6cfec7c2.lovable.app/api/public/hooks/pdf-factory-tick',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-factory-tick-secret', public.fn_factory_tick_secret()),
    body := '{"trigger":"cron"}'::jsonb
  ) AS request_id;
  $cmd$
);