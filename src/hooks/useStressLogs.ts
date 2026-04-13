import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StressLog {
  id: string;
  user_id: string;
  stress_level: number;
  latitude: number;
  longitude: number;
  source: string;
  note: string | null;
  created_at: string;
}

export function useStressLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<StressLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!user) { setLogs([]); setLoading(false); return; }
    const { data } = await supabase
      .from("stress_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs((data as StressLog[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const addLog = useCallback(async (stressLevel: number, latitude: number, longitude: number, source = "manual", note?: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("stress_logs")
      .insert({
        user_id: user.id,
        stress_level: stressLevel,
        latitude,
        longitude,
        source,
        note: note || null,
      })
      .select()
      .single();
    if (error) { console.error("Stress log error:", error); return null; }
    if (data) setLogs((prev) => [data as StressLog, ...prev]);
    return data;
  }, [user]);

  const deleteLog = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from("stress_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }, [user]);

  return { logs, loading, addLog, deleteLog, refresh: fetchLogs };
}
