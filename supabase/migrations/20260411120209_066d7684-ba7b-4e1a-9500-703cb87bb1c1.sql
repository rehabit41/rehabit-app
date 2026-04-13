
-- Drop the overly permissive insert policy
DROP POLICY "Service role can insert notifications" ON public.notifications;

-- Create a more restrictive policy - only service_role can insert
CREATE POLICY "Service role can insert notifications"
ON public.notifications FOR INSERT
TO service_role
WITH CHECK (true);

-- Also allow authenticated users to insert their own (for self-generated alerts)
CREATE POLICY "Users can insert their own notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
