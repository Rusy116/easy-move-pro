-- ============ DEMO / SEED DATA (idempotent) ============
-- Profiles + roles for demo auth users (created via admin API)
INSERT INTO public.profiles (id, full_name, first_name, last_name, phone, status)
SELECT u.id,
       coalesce(u.raw_user_meta_data->>'full_name', u.email),
       split_part(coalesce(u.raw_user_meta_data->>'full_name', u.email), ' ', 1),
       split_part(coalesce(u.raw_user_meta_data->>'full_name', u.email), ' ', 2),
       '+1 800 555 0' || lpad((row_number() over (order by u.email))::text, 3, '0'),
       'active'
FROM auth.users u
WHERE u.email LIKE '%@demo.easymoving.test'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, CASE WHEN u.email LIKE 'broker%' THEN 'broker'::app_role ELSE 'customer'::app_role END
FROM auth.users u
WHERE u.email LIKE '%@demo.easymoving.test'
ON CONFLICT (user_id, role) DO NOTHING;

-- ============ 10 demo moving companies ============
INSERT INTO public.moving_companies
  (id, name, slug, email, phone, dot_number, mc_number, rating, status, license_status,
   service_states, service_cities, services_offered, address_city, address_state, address_zip,
   owner_first_name, owner_last_name, website, insurance_carrier, insurance_policy, insurance_expires,
   fleet_size, movers_count, settings, notes)
VALUES
 ('dc000000-0000-4000-8000-000000000001','Sunshine State Movers','demo-sunshine-state-movers','ops@sunshinestatemovers.demo','+1 305 555 0110','DOT2841001','MC884101',4.80,'approved','verified',
  ARRAY['FL','GA'],ARRAY['Miami','Orlando','Tampa'],ARRAY['local','long_distance','packing'],'Miami','FL','33139','Carlos','Mendez','https://sunshinestatemovers.demo','Travelers','TRV-100281','2027-03-31',14,38,'{"demo":true,"completed_jobs":184}','Demo seed data'),
 ('dc000000-0000-4000-8000-000000000002','Empire Relocation Group','demo-empire-relocation','dispatch@empirereloc.demo','+1 212 555 0122','DOT2841002','MC884102',4.60,'approved','verified',
  ARRAY['NY','NJ','CT'],ARRAY['New York','Brooklyn','Jersey City'],ARRAY['local','long_distance','storage'],'Brooklyn','NY','11215','Anna','Kowalski','https://empirereloc.demo','Chubb','CHB-338219','2026-11-30',22,61,'{"demo":true,"completed_jobs":312}','Demo seed data'),
 ('dc000000-0000-4000-8000-000000000003','Lone Star Moving Co.','demo-lone-star-moving','hello@lonestarmoving.demo','+1 512 555 0133','DOT2841003','MC884103',4.30,'approved','verified',
  ARRAY['TX','OK'],ARRAY['Austin','Dallas','Houston'],ARRAY['local','long_distance','assembly'],'Austin','TX','78701','Ray','Bishop','https://lonestarmoving.demo','Liberty Mutual','LM-772004','2027-01-15',11,29,'{"demo":true,"completed_jobs":147}','Demo seed data'),
 ('dc000000-0000-4000-8000-000000000004','Pacific Coast Relocations','demo-pacific-coast','team@pacificcoastrelo.demo','+1 415 555 0144','DOT2841004','MC884104',4.90,'approved','verified',
  ARRAY['CA','NV','OR'],ARRAY['San Francisco','Los Angeles','San Diego'],ARRAY['local','long_distance','packing','storage'],'San Francisco','CA','94110','Michelle','Tran','https://pacificcoastrelo.demo','Hartford','HTF-901882','2027-06-30',31,88,'{"demo":true,"completed_jobs":426}','Demo seed data'),
 ('dc000000-0000-4000-8000-000000000005','Windy City Van Lines','demo-windy-city-van-lines','info@windycityvans.demo','+1 312 555 0155','DOT2841005','MC884105',3.90,'approved','verified',
  ARRAY['IL','IN','WI'],ARRAY['Chicago','Evanston','Milwaukee'],ARRAY['local','long_distance'],'Chicago','IL','60614','Peter','Novak','https://windycityvans.demo','Nationwide','NW-556710','2026-09-30',9,24,'{"demo":true,"completed_jobs":98}','Demo seed data'),
 ('dc000000-0000-4000-8000-000000000006','Rocky Mountain Movers','demo-rocky-mountain-movers','ops@rockymountainmovers.demo','+1 720 555 0166','DOT2841006','MC884106',4.10,'approved','verified',
  ARRAY['CO','UT','WY'],ARRAY['Denver','Boulder','Salt Lake City'],ARRAY['local','long_distance','heavy_items'],'Denver','CO','80202','Jenna','Hollis','https://rockymountainmovers.demo','Travelers','TRV-441093','2027-02-28',7,19,'{"demo":true,"completed_jobs":63}','Demo seed data'),
 ('dc000000-0000-4000-8000-000000000007','Peachtree Moving Partners','demo-peachtree-moving','contact@peachtreemoving.demo','+1 404 555 0177','DOT2841007','MC884107',3.60,'pending','pending',
  ARRAY['GA','AL','SC'],ARRAY['Atlanta','Savannah','Birmingham'],ARRAY['local','packing'],'Atlanta','GA','30309','Marcus','Bell','https://peachtreemoving.demo','Erie Insurance','ERI-220914','2026-12-31',5,12,'{"demo":true,"completed_jobs":21}','Demo seed data'),
 ('dc000000-0000-4000-8000-000000000008','Desert Sun Movers','demo-desert-sun-movers','hello@desertsunmovers.demo','+1 602 555 0188','DOT2841008','MC884108',4.00,'pending','pending',
  ARRAY['AZ','NM'],ARRAY['Phoenix','Tucson','Albuquerque'],ARRAY['local','long_distance'],'Phoenix','AZ','85004','Luis','Ortega','https://desertsunmovers.demo','Progressive','PRG-810337','2027-04-30',6,15,'{"demo":true,"completed_jobs":34}','Demo seed data'),
 ('dc000000-0000-4000-8000-000000000009','Bay State Movers','demo-bay-state-movers','ops@baystatemovers.demo','+1 617 555 0199','DOT2841009','MC884109',2.80,'rejected','rejected',
  ARRAY['MA','RI','NH'],ARRAY['Boston','Cambridge','Providence'],ARRAY['local'],'Boston','MA','02116','Sean','Doherty','https://baystatemovers.demo','Plymouth Rock','PLR-119002','2026-08-31',3,8,'{"demo":true,"completed_jobs":7}','Demo seed data'),
 ('dc000000-0000-4000-8000-000000000010','Great Lakes Transit','demo-great-lakes-transit','support@greatlakestransit.demo','+1 313 555 0200','DOT2841010','MC884110',3.20,'suspended','suspended',
  ARRAY['MI','OH'],ARRAY['Detroit','Ann Arbor','Cleveland'],ARRAY['local','long_distance','storage'],'Detroit','MI','48226','Karen','Whitmore','https://greatlakestransit.demo','Auto-Owners','AOI-664218','2026-10-31',8,20,'{"demo":true,"completed_jobs":52}','Demo seed data')
ON CONFLICT (id) DO NOTHING;

UPDATE public.moving_companies
   SET rejection_reason = 'Insurance certificate could not be verified (demo data)'
 WHERE id = 'dc000000-0000-4000-8000-000000000009' AND rejection_reason IS NULL;

-- ============ 50 demo leads ============
DO $$
DECLARE
  brokers uuid[];
  customers uuid[];
  cust_names text[];
  cust_emails text[];
  companies uuid[] := ARRAY[
    'dc000000-0000-4000-8000-000000000001','dc000000-0000-4000-8000-000000000002',
    'dc000000-0000-4000-8000-000000000003','dc000000-0000-4000-8000-000000000004',
    'dc000000-0000-4000-8000-000000000005','dc000000-0000-4000-8000-000000000006']::uuid[];
  city_name text[] := ARRAY['Miami','Brooklyn','Austin','San Francisco','Chicago','Denver','Atlanta','Phoenix','Boston','Seattle','Nashville','Portland'];
  city_state text[] := ARRAY['FL','NY','TX','CA','IL','CO','GA','AZ','MA','WA','TN','OR'];
  city_zip text[] := ARRAY['33139','11215','78701','94110','60614','80202','30309','85004','02116','98101','37203','97209'];
  streets text[] := ARRAY['Ocean Drive','Prospect Ave','Congress Ave','Valencia St','Clark St','Larimer St','Peachtree St','Central Ave','Boylston St','Pine St','Broadway','Alberta St'];
  sizes text[] := ARRAY['studio','1 bedroom','2 bedroom','3 bedroom','4 bedroom','office'];
  props text[] := ARRAY['apartment','house','office','storage'];
  notes_pool text[] := ARRAY[
    'Customer prefers a morning arrival window.',
    'Fragile artwork — needs custom crating.',
    'Building requires a certificate of insurance 48h before the move.',
    'Piano on the second floor, no elevator.',
    'Flexible on the date, tight on budget.',
    'Corporate relocation, invoice must go to HR.',
    'Storage needed for roughly 3 weeks between move-out and move-in.',
    'Customer already got two competing bids.'];
  st text[] := ARRAY[
    'submitted','submitted','submitted','submitted','submitted','submitted',
    'under_review','under_review','under_review','under_review','under_review',
    'qualified','qualified','qualified','qualified','qualified',
    'published','published','published','published','published','published',
    'claimed','claimed','claimed','claimed','claimed',
    'exclusive','exclusive','exclusive','exclusive',
    'contacted','contacted','contacted','contacted','contacted',
    'price_confirmed','price_confirmed','price_confirmed','price_confirmed',
    'completed','completed','completed','completed','completed',
    'cancelled','cancelled','cancelled',
    'expired','expired'];
  i int;
  s text;
  qid uuid;
  aid uuid;
  oi int; di int;
  cid uuid;
  broker uuid;
  cust uuid;
  low numeric; high numeric; fin numeric;
  created timestamptz;
  ls lead_status_enum;
  js text;
  lph lead_phase_enum;
  legacy text;
BEGIN
  SELECT array_agg(u.id ORDER BY u.email) INTO brokers
    FROM auth.users u WHERE u.email LIKE 'broker%@demo.easymoving.test';
  SELECT array_agg(u.id ORDER BY u.email),
         array_agg(coalesce(u.raw_user_meta_data->>'full_name', u.email) ORDER BY u.email),
         array_agg(u.email ORDER BY u.email)
    INTO customers, cust_names, cust_emails
    FROM auth.users u WHERE u.email LIKE 'customer%@demo.easymoving.test';

  IF brokers IS NULL OR customers IS NULL THEN
    RAISE NOTICE 'Demo auth users missing — skipping lead seed';
    RETURN;
  END IF;

  FOR i IN 1..50 LOOP
    qid := ('d1000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.quotes WHERE id = qid);

    s := st[i];
    oi := 1 + (i % 12);
    di := 1 + ((i * 5 + 3) % 12);
    IF di = oi THEN di := 1 + (di % 12); END IF;
    broker := brokers[1 + (i % array_length(brokers,1))];
    cust := customers[1 + (i % array_length(customers,1))];
    cid := companies[1 + (i % array_length(companies,1))];
    created := now() - ((60 - i) || ' days')::interval - ((i * 7) || ' hours')::interval;
    low := 1150 + (i * 118);
    high := round(low * 1.27);
    fin := round((low + high) / 2 + (i % 5) * 65);

    ls := CASE s WHEN 'exclusive' THEN 'claimed' WHEN 'expired' THEN 'published' ELSE s END::lead_status_enum;
    js := CASE s
            WHEN 'submitted' THEN 'new' WHEN 'under_review' THEN 'new'
            WHEN 'qualified' THEN 'qualified' WHEN 'published' THEN 'open_market'
            WHEN 'claimed' THEN 'claimed' WHEN 'exclusive' THEN 'claimed'
            WHEN 'contacted' THEN 'contacted' WHEN 'price_confirmed' THEN 'final_quote_sent'
            WHEN 'completed' THEN 'completed' WHEN 'cancelled' THEN 'cancelled'
            ELSE 'expired' END;
    lph := CASE s
            WHEN 'exclusive' THEN 'exclusive'
            WHEN 'published' THEN 'open_market' WHEN 'expired' THEN 'open_market'
            WHEN 'claimed' THEN 'open_market' WHEN 'contacted' THEN 'open_market'
            WHEN 'price_confirmed' THEN 'open_market'
            WHEN 'completed' THEN 'closed' WHEN 'cancelled' THEN 'closed'
            ELSE 'unassigned' END::lead_phase_enum;
    legacy := CASE s
            WHEN 'submitted' THEN 'new' WHEN 'under_review' THEN 'pending'
            WHEN 'qualified' THEN 'available' WHEN 'published' THEN 'available'
            WHEN 'claimed' THEN 'accepted' WHEN 'exclusive' THEN 'accepted'
            WHEN 'contacted' THEN 'contacted' WHEN 'price_confirmed' THEN 'scheduled'
            WHEN 'completed' THEN 'won' WHEN 'cancelled' THEN 'cancelled'
            ELSE 'lost' END;

    INSERT INTO public.quotes (
      id, user_id, created_at, last_activity_at,
      origin_zip, origin_city, origin_state, origin_address,
      destination_zip, destination_city, destination_state, destination_address,
      property_type, pickup_property_type, delivery_property_type,
      bedrooms, floor, pickup_floor, delivery_floor, pickup_elevator, delivery_elevator,
      packing, storage, assembly, heavy_items, long_carry, fragile_items,
      move_date, move_type, move_size, distance_miles,
      estimated_cubic_feet, estimated_weight_lbs, truck_size, num_movers, labor_hours,
      estimated_low, estimated_high, status, lead_status, lead_phase, job_status,
      contact_email, contact_phone, details, inventory_notes,
      assigned_broker_id, assigned_company_id, assigned_at,
      qualified_at, qualified_by, published_at, claimed_at, claim_deadline_at,
      exclusive_started_at, exclusive_expires_at, open_market_opened_at,
      contacted_at, final_price, final_move_date, arrival_window, crew_size,
      final_quote_sent_at, customer_response_at, accepted_at,
      closed_at, closed_reason, cancellation_reason, cancelled_at, company_notes
    ) VALUES (
      qid, cust, created, created + interval '6 hours',
      city_zip[oi], city_name[oi], city_state[oi], (100 + i * 7) || ' ' || streets[oi],
      city_zip[di], city_name[di], city_state[di], (200 + i * 3) || ' ' || streets[di],
      props[1 + (i % 4)], props[1 + (i % 4)], props[1 + ((i+1) % 4)],
      1 + (i % 4), 1 + (i % 3), i % 3, (i + 1) % 3, (i % 2 = 0), (i % 3 = 0),
      (i % 2 = 0), (i % 5 = 0), (i % 4 = 0), (i % 6 = 0), (i % 7 = 0), (i % 3 = 0),
      (created + ((20 + i) || ' days')::interval)::date,
      CASE WHEN city_state[oi] = city_state[di] THEN 'local' ELSE 'long_distance' END,
      sizes[1 + (i % 6)], 35 + (i * 41.5),
      280 + (i * 22), 1900 + (i * 155), CASE WHEN i % 3 = 0 THEN '26ft' ELSE '20ft' END,
      2 + (i % 3), 4 + (i % 5),
      low, high, legacy, ls, lph, js,
      cust_emails[1 + (i % array_length(customers,1))],
      '+1 ' || (ARRAY['212','305','312','404','512','617','702','720','813','917'])[1 + (i % 10)] || ' 555 0' || lpad((100 + i)::text, 3, '0'),
      jsonb_build_object('fullName', cust_names[1 + (i % array_length(customers,1))], 'demo', true, 'source', 'seed'),
      notes_pool[1 + (i % 8)],
      broker,
      CASE WHEN s IN ('claimed','exclusive','contacted','price_confirmed','completed') THEN cid ELSE NULL END,
      CASE WHEN s IN ('claimed','exclusive','contacted','price_confirmed','completed') THEN created + interval '1 day' ELSE NULL END,
      CASE WHEN s NOT IN ('submitted','under_review') THEN created + interval '4 hours' ELSE NULL END,
      CASE WHEN s NOT IN ('submitted','under_review') THEN broker ELSE NULL END,
      CASE WHEN s IN ('published','claimed','exclusive','contacted','price_confirmed','completed','expired') THEN created + interval '6 hours' ELSE NULL END,
      CASE WHEN s IN ('claimed','exclusive','contacted','price_confirmed','completed') THEN created + interval '1 day' ELSE NULL END,
      CASE WHEN s = 'claimed' THEN now() + ((3 + (i % 9)) || ' hours')::interval
           WHEN s IN ('contacted','price_confirmed') THEN created + interval '37 hours' ELSE NULL END,
      CASE WHEN s = 'exclusive' THEN now() - interval '2 hours' ELSE NULL END,
      CASE WHEN s = 'exclusive' THEN now() + ((2 + (i % 8)) || ' hours')::interval ELSE NULL END,
      CASE WHEN s IN ('published','claimed','contacted','price_confirmed','expired') THEN created + interval '6 hours' ELSE NULL END,
      CASE WHEN s IN ('contacted','price_confirmed','completed') THEN created + interval '30 hours' ELSE NULL END,
      CASE WHEN s IN ('price_confirmed','completed') THEN fin ELSE NULL END,
      CASE WHEN s IN ('price_confirmed','completed') THEN (created + ((20 + i) || ' days')::interval)::date ELSE NULL END,
      CASE WHEN s IN ('price_confirmed','completed') THEN (ARRAY['8:00 AM - 10:00 AM','10:00 AM - 12:00 PM','1:00 PM - 3:00 PM'])[1 + (i % 3)] ELSE NULL END,
      CASE WHEN s IN ('price_confirmed','completed') THEN 2 + (i % 3) ELSE NULL END,
      CASE WHEN s IN ('price_confirmed','completed') THEN created + interval '2 days' ELSE NULL END,
      CASE WHEN s = 'completed' THEN created + interval '3 days' ELSE NULL END,
      CASE WHEN s = 'completed' THEN created + interval '3 days' ELSE NULL END,
      CASE WHEN s IN ('completed','cancelled') THEN created + interval '25 days' ELSE NULL END,
      CASE WHEN s = 'completed' THEN 'won'::lead_closed_reason_enum
           WHEN s = 'cancelled' THEN 'cancelled'::lead_closed_reason_enum ELSE NULL END,
      CASE WHEN s = 'cancelled' THEN 'Customer postponed the move (demo data)' ELSE NULL END,
      CASE WHEN s = 'cancelled' THEN created + interval '25 days' ELSE NULL END,
      CASE WHEN s IN ('contacted','price_confirmed','completed') THEN 'Spoke with the customer, walkthrough completed.' ELSE NULL END
    );

    -- assignment + claim + commission for company-held leads
    IF s IN ('claimed','exclusive','contacted','price_confirmed','completed') THEN
      aid := ('d2000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
      INSERT INTO public.quote_assignments (id, quote_id, company_id, assigned_by, state, status,
        is_exclusive, invited_at, accepted_at, sla_due_at, quoted_amount, quoted_at, won_at, closed_at, contacted_at)
      VALUES (aid, qid, cid, broker,
        CASE WHEN s = 'completed' THEN 'won' WHEN s = 'price_confirmed' THEN 'quoted' ELSE 'active' END::assignment_state_enum,
        CASE WHEN s = 'completed' THEN 'won' ELSE 'assigned' END,
        (s = 'exclusive'), created + interval '20 hours', created + interval '1 day',
        CASE WHEN s = 'exclusive' THEN now() + ((2 + (i % 8)) || ' hours')::interval ELSE created + interval '32 hours' END,
        CASE WHEN s IN ('price_confirmed','completed') THEN fin ELSE NULL END,
        CASE WHEN s IN ('price_confirmed','completed') THEN created + interval '2 days' ELSE NULL END,
        CASE WHEN s = 'completed' THEN created + interval '25 days' ELSE NULL END,
        CASE WHEN s = 'completed' THEN created + interval '25 days' ELSE NULL END,
        CASE WHEN s IN ('contacted','price_confirmed','completed') THEN created + interval '30 hours' ELSE NULL END)
      ON CONFLICT (quote_id, company_id) DO NOTHING;

      IF s = 'exclusive' THEN
        UPDATE public.quotes SET exclusive_assignment_id = aid WHERE id = qid;
      END IF;

      INSERT INTO public.company_claims (id, quote_id, company_id, claimed_at, expires_at, status, released_at)
      VALUES (('d3000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, qid, cid,
        created + interval '1 day',
        CASE WHEN s = 'exclusive' THEN now() + interval '6 hours' ELSE created + interval '36 hours' END,
        CASE WHEN s = 'completed' THEN 'completed' ELSE 'active' END,
        NULL)
      ON CONFLICT (id) DO NOTHING;
    END IF;

    IF s IN ('price_confirmed','completed') THEN
      INSERT INTO public.company_commissions (id, quote_id, company_id, base_price, rate, amount, status, broker_id, customer_id, created_at, notes)
      VALUES (('d4000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, qid, cid, fin, 0.25, round(fin * 0.25, 2),
        CASE WHEN s = 'completed' THEN 'invoiced' ELSE 'pending' END, broker, cust, created + interval '2 days', 'Demo seed data')
      ON CONFLICT (id) DO NOTHING;
    END IF;

    -- timeline
    INSERT INTO public.lead_events (quote_id, actor_type, actor_id, event_type, payload, is_public, created_at, company_id)
    VALUES (qid, 'customer', cust, 'lead_created', jsonb_build_object('demo', true), true, created, NULL);
    IF s NOT IN ('submitted','under_review') THEN
      INSERT INTO public.lead_events (quote_id, actor_type, actor_id, event_type, payload, is_public, created_at)
      VALUES (qid, 'broker', broker, 'lead_qualified', jsonb_build_object('demo', true), true, created + interval '4 hours');
    END IF;
    IF s IN ('claimed','exclusive','contacted','price_confirmed','completed') THEN
      INSERT INTO public.lead_events (quote_id, actor_type, event_type, payload, is_public, created_at, company_id)
      VALUES (qid, 'mover', 'lead_claimed', jsonb_build_object('demo', true), true, created + interval '1 day', cid);
    END IF;
    IF s IN ('price_confirmed','completed') THEN
      INSERT INTO public.lead_events (quote_id, actor_type, event_type, payload, is_public, created_at, company_id)
      VALUES (qid, 'mover', 'final_price_confirmed', jsonb_build_object('demo', true, 'amount', fin), true, created + interval '2 days', cid);
    END IF;
    IF s = 'completed' THEN
      INSERT INTO public.lead_events (quote_id, actor_type, event_type, payload, is_public, created_at, company_id)
      VALUES (qid, 'mover', 'job_completed', jsonb_build_object('demo', true), true, created + interval '25 days', cid);
    END IF;
    IF s = 'cancelled' THEN
      INSERT INTO public.lead_events (quote_id, actor_type, actor_id, event_type, payload, is_public, created_at)
      VALUES (qid, 'customer', cust, 'lead_cancelled', jsonb_build_object('demo', true), true, created + interval '25 days');
    END IF;
    IF s = 'expired' THEN
      INSERT INTO public.lead_events (quote_id, actor_type, event_type, payload, is_public, created_at)
      VALUES (qid, 'system', 'lead_expired', jsonb_build_object('demo', true), true, created + interval '2 days');
    END IF;
  END LOOP;
END $$;
