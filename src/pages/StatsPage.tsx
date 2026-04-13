import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Footprints, Brain, Sparkles, MessageCircle, Flame } from "lucide-react";
import AmbientGlow from "@/components/AmbientGlow";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabaseProfile, useSupabaseHealth } from "@/hooks/useSupabaseData";
import { useSupabaseMonthHealth } from "@/hooks/useSupabaseMonthData";

const timeOptions = ["Week", "Month"] as const;
type TimeMode = (typeof timeOptions)[number];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const StatsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<TimeMode>("Week");
  const { profile } = useSupabaseProfile();
  const { weekData, loading: weekLoading } = useSupabaseHealth();
  const { monthData, loading: monthLoading } = useSupabaseMonthHealth();

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) navigate("/start", { replace: true });
  }, [authLoading, user, navigate]);

  const activeData = mode === "Week" ? weekData : monthData;
  const stepGoal = profile?.step_goal || 10000;
  const isLoading = mode === "Week" ? weekLoading : monthLoading;

  const barData = useMemo(() => activeData.map((d) => d.steps), [activeData]);
  const maxVal = Math.max(...barData, 1);

  // Build labels from actual dates
  const labels = useMemo(() => {
    return activeData.map((d) => {
      const date = new Date(d.date + "T00:00:00");
      if (mode === "Week") {
        return DAY_NAMES[date.getDay()];
      }
      return `${date.getDate()}`;
    });
  }, [activeData, mode]);

  // Sparkline points
  const stepsMax = Math.max(...activeData.map((d) => d.steps), 1);
  const stepsPoints = activeData
    .map((d, i) => `${(i / Math.max(activeData.length - 1, 1)) * 100},${30 - (d.steps / stepsMax) * 25}`)
    .join(" ");
  const stressPoints = activeData
    .map((d, i) => `${(i / Math.max(activeData.length - 1, 1)) * 100},${(d.stress_level / 100) * 25 + 2}`)
    .join(" ");

  const totalSteps = activeData.reduce((s, d) => s + d.steps, 0);
  const avgStress = Math.round(activeData.reduce((s, d) => s + d.stress_level, 0) / Math.max(activeData.length, 1));
  const totalCalories = activeData.reduce((s, d) => s + d.calories, 0);
  const miles = (totalSteps * 0.000473).toFixed(1);
  const periodLabel = mode === "Week" ? "Weekly" : "Monthly";
  const periodDays = mode === "Week" ? 7 : 30;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AmbientGlow />

      <div className="relative z-10 max-w-md mx-auto px-6 pt-14 pb-36">
        <h1 className="font-heading text-3xl font-bold text-glow mb-6">
          Your<br />Statistics
        </h1>

        {/* Toggle */}
        <div className="flex mb-6">
          <div className="glass-strong rounded-full p-1 flex">
            {timeOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setMode(opt)}
                className={`px-6 py-2.5 rounded-full font-body text-sm transition-all duration-300 ${
                  mode === opt
                    ? "futuristic-gradient glow-primary font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Main Graph Card */}
        <div className="glass-strong rounded-3xl p-5 mb-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-44">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-end gap-[2px] h-44">
                {barData.map((val, i) => {
                  const barHeight = Math.max((val / maxVal) * 100, 3);
                  const isMax = val === maxVal && val > 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full min-w-0">
                      <div className="flex-1 w-full flex items-end">
                        <div
                          className="w-full rounded-lg transition-all duration-500"
                          style={{
                            height: `${barHeight}%`,
                            background: isMax
                              ? "linear-gradient(180deg, hsl(224 70% 65%) 0%, hsl(270 60% 55%) 100%)"
                              : "hsl(0 0% 100% / 0.15)",
                            boxShadow: isMax ? "0 0 16px hsl(224 70% 65% / 0.4)" : "none",
                          }}
                        />
                      </div>
                      {/* Labels: show all for week, every 5th for month */}
                      {(mode === "Week" || i % 5 === 0 || i === barData.length - 1) && (
                        <span className="text-[9px] text-muted-foreground font-body truncate">
                          {labels[i]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-3 text-xs text-muted-foreground font-body">
                <span>Total: {totalSteps.toLocaleString()} steps</span>
                <span>Avg: {Math.round(totalSteps / periodDays).toLocaleString()}/day</span>
              </div>
            </>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="glass-strong rounded-3xl p-5 relative overflow-hidden group hover:glow-primary transition-all duration-500">
            <div className="absolute inset-0 futuristic-gradient opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl glass flex items-center justify-center mb-3">
                <Footprints className="w-5 h-5 text-primary" />
              </div>
              <p className="font-body text-sm text-muted-foreground mb-1">Walk</p>
              <p className="font-heading text-xl font-bold text-glow">{miles} mi</p>
              <svg className="mt-3 w-full h-10" viewBox="0 0 100 30" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="hsl(224 70% 65%)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={stepsPoints}
                  style={{ filter: "drop-shadow(0 0 4px hsl(224 70% 65% / 0.5))" }}
                />
              </svg>
            </div>
          </div>

          <div className="glass-strong rounded-3xl p-5 relative overflow-hidden group hover:glow-accent transition-all duration-500">
            <div className="absolute inset-0 bg-accent/10 group-hover:bg-accent/20 transition-colors" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl glass flex items-center justify-center mb-3">
                <Brain className="w-5 h-5 text-accent" />
              </div>
              <p className="font-body text-sm text-muted-foreground mb-1">Stress</p>
              <p className="font-heading text-xl font-bold">
                {avgStress}
                <span className="text-xs text-muted-foreground font-body">/100</span>
              </p>
              <svg className="mt-3 w-full h-10" viewBox="0 0 100 30" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="hsl(270 60% 65%)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={stressPoints}
                  style={{ filter: "drop-shadow(0 0 4px hsl(270 60% 65% / 0.5))" }}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Calories card */}
        <div className="glass-strong rounded-3xl p-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
              <Flame className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-body text-sm text-muted-foreground">{periodLabel} Calories Burned</p>
              <p className="font-heading text-xl font-bold">{totalCalories.toLocaleString()} kcal</p>
            </div>
          </div>
        </div>

        {/* AI Suggestion Card */}
        <div className="glass-strong rounded-3xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl futuristic-gradient flex items-center justify-center glow-primary">
              <Sparkles className="w-5 h-5 text-foreground" />
            </div>
            <span className="font-heading text-sm font-bold tracking-wide">AI Suggestion</span>
          </div>
          <p className="font-body text-sm text-muted-foreground leading-relaxed mb-4">
            {avgStress > 60
              ? "Your stress is high. Try a 20-minute walk to bring it down."
              : totalSteps < stepGoal * periodDays
              ? `You're ${((stepGoal * periodDays - totalSteps) / 1000).toFixed(0)}k steps short of your ${mode.toLowerCase()}ly goal. Keep pushing!`
              : `Great ${mode.toLowerCase()}! You've hit your goals consistently. Keep it up! 🎉`}
          </p>
          <button onClick={() => navigate("/ai-chat")} className="w-full glass-strong rounded-2xl py-3 flex items-center justify-center gap-2 font-body text-sm font-semibold hover:glow-primary transition-all duration-300">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-foreground">Open AI Coach</span>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default StatsPage;
