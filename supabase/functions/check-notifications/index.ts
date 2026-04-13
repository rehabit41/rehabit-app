import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get today's date
    const today = new Date().toISOString().split("T")[0];
    const currentHour = new Date().getHours();

    // Get all profiles with notifications enabled
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("user_id, step_goal, display_name, notifications_enabled")
      .eq("notifications_enabled", true);

    if (profileErr) throw profileErr;

    const notifications: any[] = [];

    for (const profile of profiles || []) {
      // Get today's health data
      const { data: healthData } = await supabase
        .from("daily_health")
        .select("steps, stress_level")
        .eq("user_id", profile.user_id)
        .eq("date", today)
        .maybeSingle();

      const steps = healthData?.steps || 0;
      const stressLevel = healthData?.stress_level || 50;
      const stepGoal = profile.step_goal || 10000;

      // Check for high stress (>75)
      if (stressLevel > 75) {
        // Check if we already sent a stress notification today
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", profile.user_id)
          .eq("type", "high_stress")
          .gte("created_at", `${today}T00:00:00`)
          .limit(1);

        if (!existing || existing.length === 0) {
          notifications.push({
            user_id: profile.user_id,
            title: "High Stress Alert 🧠",
            message: `Your stress level is at ${stressLevel}%. Try taking a break, deep breathing, or a short walk.`,
            type: "high_stress",
          });
        }
      }

      // Remind to log steps if afternoon and no steps logged
      if (currentHour >= 14 && steps < stepGoal * 0.3) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", profile.user_id)
          .eq("type", "step_reminder")
          .gte("created_at", `${today}T00:00:00`)
          .limit(1);

        if (!existing || existing.length === 0) {
          const remaining = stepGoal - steps;
          notifications.push({
            user_id: profile.user_id,
            title: "Time to Move! 🚶",
            message: `You've only logged ${steps.toLocaleString()} steps today. ${remaining.toLocaleString()} more to reach your goal!`,
            type: "step_reminder",
          });
        }
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: insertErr } = await supabase
        .from("notifications")
        .insert(notifications);
      if (insertErr) throw insertErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notifications.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
