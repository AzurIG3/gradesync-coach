CREATE TABLE public.user_sync_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  data_key TEXT NOT NULL CHECK (data_key IN ('notes', 'planner', 'mastery', 'sessions')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, data_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sync_data TO authenticated;
GRANT ALL ON public.user_sync_data TO service_role;

ALTER TABLE public.user_sync_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own synced data"
ON public.user_sync_data FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Students can add their own synced data"
ON public.user_sync_data FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their own synced data"
ON public.user_sync_data FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can delete their own synced data"
ON public.user_sync_data FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_user_sync_data_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_user_sync_data_updated_at
BEFORE UPDATE ON public.user_sync_data
FOR EACH ROW
EXECUTE FUNCTION public.set_user_sync_data_updated_at();