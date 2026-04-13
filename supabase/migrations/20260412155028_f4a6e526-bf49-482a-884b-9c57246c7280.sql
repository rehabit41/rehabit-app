CREATE TABLE public.stress_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stress_level INTEGER NOT NULL DEFAULT 50,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stress_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stress logs"
ON public.stress_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stress logs"
ON public.stress_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stress logs"
ON public.stress_logs FOR DELETE
USING (auth.uid() = user_id);