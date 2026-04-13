import { useState, useCallback, useEffect, useRef } from "react";
import { Search, Footprints, Flame, TrendingUp, Zap, Brain, Plus, Check, Heart, Smartphone, User, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AmbientGlow from "@/components/AmbientGlow";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import { useSupabaseProfile, useSupabaseHealth } from "@/hooks/useSupabaseData";
import { useNativeHealth } from "@/hooks/useNativeHealth";
import { useStepCounter } from "@/hooks/useHealth";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationCheck } from "@/hooks/useNotificationCheck";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useSupabaseProfile();
  const { today, weekData, setSteps, upsertToday, refresh } = useSupabaseHealth();
  const { isNative, platform, healthData } = useNativeHealth();
  const [showStepInput, setShowStepInput] = useState(false);
  const [manualSteps, setManualSteps] = useState("");
  const [showStressInput, setShowStressInput] = useState(false);
  const [manualStress, setManualStress] = useState(50);
  const [stepTracking, setStepTracking] = useState(false);
  const accumulatedStepsRef = useRef(0);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  useNotificationCheck();
  useBrowserNotifications();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/start", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // When native health data updates, sync to DB
  useEffect(() => {
    if (healthData && profile) {
      setSteps(healthData.steps, profile.weight || 70, profile.step_goal);
    }
  }, [healthData, profile, setSteps]);

  const handleManualSteps = async () => {
    const val = Number(manualSteps);
    if (val > 0 && profile) {
      const currentSteps = today?.steps || 0;
      await setSteps(currentSteps + val, profile.weight || 70, profile.step_goal);
      setManualSteps("");
      setShowStepInput(false);
    }
  };

  // Auto step counter via Accelerometer
  const handleStepBatch = useCallback((count: number) => {
    accumulatedStepsRef.current += count;

    // Debounce DB writes — sync every 30 seconds
    if (!syncTimerRef.current) {
      syncTimerRef.current = setTimeout(async () => {
        if (profile && accumulatedStepsRef.current > 0) {
          const currentSteps = today?.steps || 0;
          await setSteps(currentSteps + accumulatedStepsRef.current, profile.weight || 70, profile.step_goal);
          accumulatedStepsRef.current = 0;
        }
        syncTimerRef.current = null;
      }, 30_000);
    }
  }, [profile, today, setSteps]);

  // Only activate step counter when tracking is on
  const noopCallback = useCallback(() => {}, []);
  useStepCounter(stepTracking ? handleStepBatch : noopCallback);

  // Cleanup sync timer on unmount
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  // Toggle step tracking
  const toggleStepTracking = () => {
    if (stepTracking && accumulatedStepsRef.current > 0 && profile) {
      // Flush remaining steps on stop
      const currentSteps = today?.steps || 0;
      setSteps(currentSteps + accumulatedStepsRef.current, profile.weight || 70, profile.step_goal);
      accumulatedStepsRef.current = 0;
    }
    setStepTracking((prev) => !prev);
  };

  // Manual stress handler
  const handleManualStress = async () => {
    await upsertToday({ stress_level: manualStress, stress_source: "manual" });
    setShowStressInput(false);
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user || !profile) return null;

  const stepGoal = profile.step_goal;
  const calorieGoal = profile.calorie_goal;
  const steps = today?.steps || 0;
  const calories = today?.calories || 0;
  const stressLevel = today?.stress_level || 50;
  const stressSource = today?.stress_source || "auto";
  const stepPercent = Math.min(Math.round((steps / stepGoal) * 100), 100);
  const calPercent = Math.min(Math.round((calories / calorieGoal) * 100), 100);

  const stepDash = 88 - (88 * stepPercent) / 100;

  const maxSteps = Math.max(...weekData.map((d) => d.steps), 1);
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  const thisWeekSteps = weekData.reduce((s, d) => s + d.steps, 0);
  const avgDailySteps = Math.round(thisWeekSteps / 7);
  const trendPercent = avgDailySteps >= stepGoal
    ? `+${Math.round(((avgDailySteps / stepGoal) - 1) * 100)}%`
    : avgDailySteps > 0
    ? `-${Math.round((1 - (avgDailySteps / stepGoal)) * 100)}%`
    : "0%";

  const userName = profile.display_name || "User";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AmbientGlow />

      <div className="relative z-10 max-w-md mx-auto px-6 pt-14 pb-36">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-muted-foreground text-sm font-body tracking-widest uppercase mb-1">Welcome back</p>
            <h1 className="font-heading text-3xl font-bold text-glow">Hi, {userName.split(" ")[0]}</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button className="glass w-14 h-14 rounded-full flex items-center justify-center hover:glow-primary transition-all duration-300 group">
              <Search className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            </button>
            <div className="w-14 h-14 rounded-full futuristic-gradient p-[2px]" onClick={() => navigate("/edit-profile")}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover cursor-pointer" />
              ) : (
                <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center font-heading text-sm font-bold text-primary cursor-pointer">
                  {userName[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Graph Card */}
        <div className="glass-strong rounded-3xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-body text-muted-foreground tracking-wide">Weekly Steps</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-accent" />
              <span className="font-heading text-xs text-accent">{trendPercent}</span>
            </div>
          </div>
          <div className="flex items-end gap-2 h-32">
            {weekData.map((d, i) => {
              const h = maxSteps > 0 ? (d.steps / maxSteps) * 100 : 5;
              const isMax = d.steps === maxSteps && d.steps > 0;
              const barHeight = Math.max(h, 5);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full rounded-xl transition-all duration-700"
                      style={{
                        height: `${barHeight}%`,
                        background: isMax
                          ? "linear-gradient(180deg, hsl(224 70% 65%) 0%, hsl(270 60% 55%) 100%)"
                          : "hsl(0 0% 100% / 0.15)",
                        boxShadow: isMax ? "0 0 16px hsl(224 70% 65% / 0.4)" : "none",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-body">{dayLabels[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Tracking Toggle */}
        {"Accelerometer" in window && (
          <button
            onClick={toggleStepTracking}
            className={`w-full glass-strong rounded-2xl p-4 mb-4 flex items-center justify-center gap-3 font-body text-sm transition-all duration-300 ${
              stepTracking ? "glow-primary" : "hover:glow-primary"
            }`}
          >
            <Activity className={`w-5 h-5 ${stepTracking ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
            <span className="text-foreground">
              {stepTracking ? "Tracking Steps..." : "Start Step Tracking"}
            </span>
            {stepTracking && (
              <span className="ml-auto text-xs text-destructive font-semibold">Stop</span>
            )}
          </button>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Steps Card */}
          <div className="glass-strong rounded-3xl p-5 relative overflow-hidden group hover:glow-primary transition-all duration-500">
            <div className="absolute inset-0 futuristic-gradient opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl glass flex items-center justify-center mb-4">
                <Footprints className="w-5 h-5 text-primary" />
              </div>
              <p className="font-body text-sm text-muted-foreground mb-1 tracking-wide">Steps</p>
              {showStepInput ? (
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    value={manualSteps}
                    onChange={(e) => setManualSteps(e.target.value)}
                    placeholder="Add steps"
                    className="w-full py-1.5 px-2 rounded-lg glass-strong bg-transparent font-heading text-sm text-foreground outline-none"
                    autoFocus
                  />
                  <button onClick={handleManualSteps} className="w-8 h-8 rounded-lg futuristic-gradient flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <p className="font-heading text-2xl font-bold text-glow">
                    {steps.toLocaleString()}
                  </p>
                  <p className="font-body text-xs text-muted-foreground mt-1">/ {stepGoal.toLocaleString()}</p>
                </>
              )}
              {!showStepInput && (
                <button
                  onClick={() => setShowStepInput(true)}
                  className="mt-2 flex items-center gap-1 text-primary font-body text-[10px] hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add steps
                </button>
              )}
              <svg className="absolute top-4 right-4 w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(0 0% 100% / 0.06)" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(224 70% 65%)" strokeWidth="3" strokeDasharray="88" strokeDashoffset={stepDash} strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Calories Card */}
          <div className="glass-strong rounded-3xl p-5 relative overflow-hidden group hover:glow-accent transition-all duration-500">
            <div className="absolute inset-0 bg-accent/10 group-hover:bg-accent/20 transition-colors" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl glass flex items-center justify-center mb-4">
                <Flame className="w-5 h-5 text-accent" />
              </div>
              <p className="font-body text-sm text-muted-foreground mb-1 tracking-wide">Calories</p>
              <p className="font-heading text-2xl font-bold">
                {calories.toLocaleString()}
              </p>
              <p className="font-body text-xs text-muted-foreground mt-1">/ {calorieGoal.toLocaleString()}</p>
              <p className="font-body text-[10px] text-muted-foreground/60 mt-1">Auto from steps</p>
              <svg className="absolute top-4 right-4 w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(0 0% 100% / 0.06)" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(270 60% 65%)" strokeWidth="3" strokeDasharray="88" strokeDashoffset={88 - (88 * calPercent) / 100} strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Stress Card */}
        <div className="glass-strong rounded-3xl p-5 relative overflow-hidden group hover:glow-accent transition-all duration-500">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
                    <Brain className="w-5 h-5 text-accent" />
                  </div>
                  <span className="font-body text-sm text-muted-foreground tracking-wide">Stress Level</span>
                </div>
                <p className="font-heading text-3xl font-bold">
                  {stressLevel}
                  <span className="text-base text-muted-foreground font-body">/100</span>
                </p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  {stressLevel < 30 ? "😌 Low" : stressLevel < 60 ? "😐 Moderate" : "😰 High"}
                  {" · "}
                  {stressSource === "manual" ? "Self-reported" : "Estimated"}
                </p>
              </div>
              <div className="w-16 h-32 rounded-xl glass overflow-hidden flex flex-col-reverse">
                <div
                  className="rounded-xl transition-all duration-700"
                  style={{
                    height: `${stressLevel}%`,
                    background:
                      stressLevel < 30
                        ? "hsl(142 60% 50%)"
                        : stressLevel < 60
                        ? "hsl(45 90% 55%)"
                        : "hsl(0 70% 55%)",
                  }}
                />
              </div>
            </div>

            {/* Manual stress input */}
            {showStressInput ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-body text-xs text-muted-foreground">How stressed do you feel?</span>
                  <span className="font-heading text-sm font-bold" style={{
                    color: manualStress < 30 ? "hsl(142 60% 50%)" : manualStress < 60 ? "hsl(45 90% 55%)" : "hsl(0 70% 55%)"
                  }}>
                    {manualStress}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={manualStress}
                  onChange={(e) => setManualStress(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, hsl(142 60% 50%) 0%, hsl(45 90% 55%) 50%, hsl(0 70% 55%) 100%)`,
                  }}
                />
                <div className="flex items-center justify-between text-[10px] font-body text-muted-foreground">
                  <span>😌 Calm</span>
                  <span>😐 Moderate</span>
                  <span>😰 High</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowStressInput(false)}
                    className="flex-1 py-2 rounded-xl glass-strong font-body text-xs text-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleManualStress}
                    className="flex-1 py-2 rounded-xl futuristic-gradient font-body text-xs font-semibold text-foreground"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => navigate("/log-stress")}
                className="mt-3 flex items-center gap-1 text-accent font-body text-[10px] hover:underline"
              >
                <Plus className="w-3 h-3" /> Log how you feel
              </button>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
