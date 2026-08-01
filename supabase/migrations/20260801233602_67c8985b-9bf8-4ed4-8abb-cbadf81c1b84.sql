-- Clean all transactional / demo data
DELETE FROM public.company_invoice_items;
DELETE FROM public.company_invoices;
DELETE FROM public.commission_invoices;
DELETE FROM public.company_commissions;
DELETE FROM public.company_price_revisions;
DELETE FROM public.estimate_revisions;
DELETE FROM public.bills_of_lading;
DELETE FROM public.jobs;
DELETE FROM public.company_messages;
DELETE FROM public.company_conversations;
DELETE FROM public.company_notes;
DELETE FROM public.company_notifications;
DELETE FROM public.company_documents;
DELETE FROM public.company_activity;
DELETE FROM public.company_claims;
DELETE FROM public.company_status_history;
DELETE FROM public.company_crews;
DELETE FROM public.company_trucks;
DELETE FROM public.customer_reviews;
DELETE FROM public.customer_purchases;
DELETE FROM public.customer_notifications;
DELETE FROM public.customer_preferences;
DELETE FROM public.customers;
DELETE FROM public.quote_notes;
DELETE FROM public.quote_status_history;
DELETE FROM public.quote_assignments;
DELETE FROM public.lead_distributions;
DELETE FROM public.lead_events;
DELETE FROM public.quotes;
DELETE FROM public.admin_notifications;
DELETE FROM public.audit_log;
DELETE FROM public.impersonation_events;
DELETE FROM public.impersonation_sessions;
DELETE FROM public.partner_applications;

-- Keep only E2E Test Movers
DELETE FROM public.company_service_areas
  WHERE company_id <> '3252643c-4036-4c3f-8327-48af0399bd88';
DELETE FROM public.company_members
  WHERE company_id <> '3252643c-4036-4c3f-8327-48af0399bd88';
DELETE FROM public.company_users
  WHERE company_id <> '3252643c-4036-4c3f-8327-48af0399bd88';
DELETE FROM public.moving_companies
  WHERE id <> '3252643c-4036-4c3f-8327-48af0399bd88';

-- Keep only Rustem (broker/admin) and the single E2E Test Movers company user
DELETE FROM public.user_roles
  WHERE user_id NOT IN (
    '46589b86-0875-4850-af00-3a7cd1184057',
    '1eb44406-1525-40b4-8cb2-ae2aa5dcc7ae'
  );
DELETE FROM public.profiles
  WHERE id NOT IN (
    '46589b86-0875-4850-af00-3a7cd1184057',
    '1eb44406-1525-40b4-8cb2-ae2aa5dcc7ae'
  );