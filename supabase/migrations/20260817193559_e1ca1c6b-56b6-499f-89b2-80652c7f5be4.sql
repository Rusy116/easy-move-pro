DELETE FROM public.lead_events WHERE quote_id IN (SELECT id FROM public.quotes WHERE contact_email = 'sectest@example.com');
DELETE FROM public.quote_status_history WHERE quote_id IN (SELECT id FROM public.quotes WHERE contact_email = 'sectest@example.com');
DELETE FROM public.admin_notifications WHERE quote_id IN (SELECT id FROM public.quotes WHERE contact_email = 'sectest@example.com');
DELETE FROM public.quotes WHERE contact_email = 'sectest@example.com';