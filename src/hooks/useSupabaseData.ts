import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type DailyHealth = Database["public"]["Tables"]["daily_health"]["Row"];

export function useSupabaseProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setProfile(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Omit<Profile, "id" | "user_id" | "created_at" | "updated_at">>) => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();
    if (data) setProfile(data);
    return data;
  }, [user]);

  const uploadAvatar = useCallback(async (file: File) => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    
    if (error) { console.error("Upload error:", error); return null; }
    
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);
    
    // Add cache-bust to URL
    const url = `${publicUrl}?t=${Date.now()}`;
    await updateProfile({ avatar_url: url });
    return url;
  }, [user, updateProfile]);

  return { profile, loading, updateProfile, uploadAvatar, refetch: fetchProfile };
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useSupabaseHealth() {
  const { user } = useAuth();
  const [today, setToday] = useState<DailyHealth | null>(null);
  const [weekData, setWeekData] = useState<DailyHealth[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchToday = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("daily_health")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", getToday())
      .single();
    setToday(data);
  }, [user]);

  const fetchWeek = useCallback(async () => {
    if (!user) return;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const { data } = await supabase
      .from("daily_health")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", weekAgo.toISOString().slice(0, 10))
      .order("date", { ascending: true });
    
    // Fill gaps for missing days
    const days: DailyHealth[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
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
    setWeekData(days);
    setLoading(false);
  }, [user]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchToday(), fetchWeek()]);
  }, [fetchToday, fetchWeek]);

  useEffect(() => { refresh(); }, [refresh]);

  const upsertToday = useCallback(async (updates: Partial<Pick<DailyHealth, "steps" | "calories" | "stress_level" | "stress_source" | "active_minutes" | "heart_rate">>) => {
    if (!user) return;
    const dateStr = getToday();
    
    // First try to get existing record
    const { data: existing } = await supabase
      .from("daily_health")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", dateStr)
      .maybeSingle();

    let data;
    if (existing) {
      // Update existing record, merging values
      const { data: updated, error } = await supabase
        .from("daily_health")
        .update(updates)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) console.error("Health update error:", error);
      data = updated;
    } else {
      // Insert new record
      const { data: inserted, error } = await supabase
        .from("daily_health")
        .insert({ user_id: user.id, date: dateStr, ...updates })
        .select()
        .single();
      if (error) console.error("Health insert error:", error);
      data = inserted;
    }
    
    if (data) setToday(data);
    await fetchWeek();
    return data;
  }, [user, fetchWeek]);

  const setSteps = useCallback(async (steps: number, weight: number, stepGoal: number) => {
    const calories = Math.round(steps * 0.04 * (weight / 70));

    // --- Accurate stress estimation ---
    // 1. Goal completion factor (0-40 pts): further from goal = more stress
    const goalRatio = Math.min(steps / Math.max(stepGoal, 1), 1);
    const goalFactor = (1 - goalRatio) * 40;

    // 2. Time-of-day factor: stress peaks mid-afternoon
    const hour = new Date().getHours();
    let timeFactor = 5;
    if (hour >= 13 && hour <= 16) timeFactor = 15;
    else if (hour >= 9 && hour <= 12) timeFactor = 10;
    else if (hour >= 21 || hour <= 5) timeFactor = 8; // late night / poor sleep window

    // 3. Consistency factor: how many of last 7 days met goal (from weekData)
    const daysMetGoal = weekData.filter((d) => d.steps >= stepGoal).length;
    const consistencyFactor = (1 - daysMetGoal / 7) * 20;

    // 4. Activity level: very low steps late in day = higher stress
    const expectedByNow = stepGoal * Math.min(hour / 16, 1); // expect goal done by 4pm
    const paceFactor = steps < expectedByNow * 0.5 && hour >= 12 ? 10 : 0;

    const stress = Math.max(10, Math.min(95, Math.round(20 + goalFactor + timeFactor + consistencyFactor + paceFactor)));

    await upsertToday({
      steps,
      calories,
      stress_level: stress,
      stress_source: "auto",
      active_minutes: Math.round(steps / 100),
    });
  }, [upsertToday, weekData]);

  return { today, weekData, loading, refresh, upsertToday, setSteps };
}
