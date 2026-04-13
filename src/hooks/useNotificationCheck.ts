import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook that periodically triggers the notification check edge function.
 * Runs once on mount and then every 30 minutes.
 */
export function useNotificationCheck() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      try {
        await supabase.functions.invoke("check-notifications");
      } catch (e) {
        console.error("Notification check failed:", e);
      }
    };

    // Check on mount after a small delay
    const timeout = setTimeout(check, 5000);

    // Then every 30 minutes
    intervalRef.current = setInterval(check, 30 * 60 * 1000);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);
}
