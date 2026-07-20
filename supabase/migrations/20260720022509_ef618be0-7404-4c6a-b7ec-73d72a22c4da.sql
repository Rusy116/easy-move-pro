
CREATE POLICY "company-docs read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'company-documents'
  AND (storage.foldername(name))[1] = public.current_user_company_id()::text
);
CREATE POLICY "company-docs insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-documents'
  AND (storage.foldername(name))[1] = public.current_user_company_id()::text
);
CREATE POLICY "company-docs update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-documents'
  AND (storage.foldername(name))[1] = public.current_user_company_id()::text
);
CREATE POLICY "company-docs delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-documents'
  AND (storage.foldername(name))[1] = public.current_user_company_id()::text
);
