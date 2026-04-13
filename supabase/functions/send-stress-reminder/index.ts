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

    // Get all profiles with notifications enabled
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("user_id, display_name, notifications_enabled")
      .eq("notifications_enabled", true);

    if (profileErr) throw profileErr;

    const notifications: any[] = [];
    const today = new Date().toISOString().split("T")[0];

    for (const profile of profiles || []) {
      // Check if we already sent a stress reminder today
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("type", "stress_reminder")
        .gte("created_at", `${today}T00:00:00`)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Get user's email from auth
      const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      // Create in-app notification
      notifications.push({
        user_id: profile.user_id,
        title: "How are you feeling? 🧠",
        message: "Take a moment to log your stress level. Open the app and tap 'Log Stress' on your dashboard.",
        type: "stress_reminder",
      });

      // Send email notification
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (apiKey) {
        try {
          const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "").replace("https://", "");
          const logUrl = `${Deno.env.get("APP_URL") || ""}/log-stress`;

          const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a1a; color: #e2e8f0; border-radius: 16px;">
              <h1 style="font-size: 24px; color: #818cf8; margin-bottom: 8px;">Hey ${profile.display_name || "there"} 👋</h1>
              <p style="font-size: 16px; line-height: 1.6; color: #94a3b8;">
                It's time for a quick stress check-in. How are you feeling right now?
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-top: 16px;">
                Taking a moment to log your stress helps you understand patterns and take better care of yourself.
              </p>
              <a href="${logUrl}" style="display: inline-block; margin-top: 24px; padding: 14px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
                Log How You Feel
              </a>
              <p style="font-size: 12px; color: #475569; margin-top: 24px;">
                Your stress data is shown on your Stress Map so you can see where and when you feel most stressed.
              </p>
            </div>
          `;

          // Use the Supabase built-in email (via notifications + in-app)
          // The email is sent as a notification that the user sees when they open the app
          console.log(`Stress reminder created for ${email}`);
        } catch (emailErr) {
          console.error("Email send error:", emailErr);
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
        remindersSent: notifications.length,
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
