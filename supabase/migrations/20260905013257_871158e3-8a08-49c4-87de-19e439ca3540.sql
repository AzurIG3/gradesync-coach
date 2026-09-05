REVOKE ALL ON public.user_sync_data FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sync_data TO authenticated;
GRANT ALL ON public.user_sync_data TO service_role;