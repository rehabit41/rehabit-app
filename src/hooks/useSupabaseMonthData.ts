import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type DailyHealth = Database["public"]["Tables"]["daily_health"]["Row"];

export function useSupabaseMonthHealth() {
  const { user } = useAuth();
  const [monthData, setMonthData] = useState<DailyHealth[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonth = useCallback(async () => {
    if (!user) { setMonthData([]); setLoading(false); return; }
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 29);
    const { data } = await supabase
      .from("daily_health")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", monthAgo.toISOString().slice(0, 10))
      .order("date", { ascending: true });

    // Fill gaps
    const days: DailyHealth[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const existing = data?.find((h) => h.date === dateStr);
      days.push(existing || {
        id: "",
        user_id: user.id,
        date: dateStr,
        steps: 0,
        calories: 0,
        stress_level: 50,
        stress_source: "auto",
        active_minutes: 0,
        heart_rate: null,
        created_at: "",
        updated_at: "",
      });
    }
    setMonthData(days);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  return { monthData, loading, refetch: fetchMonth };
}
