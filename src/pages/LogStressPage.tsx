import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, MapPin, Check } from "lucide-react";
import AmbientGlow from "@/components/AmbientGlow";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useStressLogs } from "@/hooks/useStressLogs";
import { toast } from "sonner";

const LogStressPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { addLog } = useStressLogs();
  const [stressLevel, setStressLevel] = useState(50);
  const [note, setNote] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/start", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocation({ lat: 30.0444, lng: 31.2357 });
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocation({ lat: 30.0444, lng: 31.2357 });
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  const handleSave = async () => {
    if (!location) return;
    setSaving(true);
    const result = await addLog(stressLevel, location.lat, location.lng, "manual", note || undefined);
    setSaving(false);
    if (result) {
      toast.success("Stress logged! Check your Stress Map to see it.");
      navigate("/maps");
    } else {
      toast.error("Failed to save. Try again.");
    }
  };

  const stressColor = stressLevel < 30
    ? "hsl(142 60% 50%)"
    : stressLevel < 60
    ? "hsl(45 90% 55%)"
    : "hsl(0 70% 55%)";

  const stressEmoji = stressLevel < 30 ? "😌" : stressLevel < 60 ? "😐" : "😰";
  const stressLabel = stressLevel < 30 ? "Low" : stressLevel < 60 ? "Moderate" : "High";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AmbientGlow />
      <div className="relative z-10 max-w-md mx-auto px-6 pt-14 pb-36">
        <h1 className="font-heading text-3xl font-bold text-glow text-center mb-2">
          How are you feeling?
        </h1>
        <p className="text-center text-muted-foreground font-body text-sm mb-8">
          Log your stress and it'll appear on your map
        </p>

        {/* Stress slider */}
        <div className="glass-strong rounded-3xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-accent" />
              <span className="font-body text-sm text-muted-foreground">Stress Level</span>
            </div>
            <span className="font-heading text-2xl font-bold" style={{ color: stressColor }}>
              {stressEmoji} {stressLevel}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={stressLevel}
            onChange={(e) => setStressLevel(Number(e.target.value))}
            className="w-full h-3 rounded-full appearance-none cursor-pointer mb-3"
            style={{
              background: `linear-gradient(to right, hsl(142 60% 50%) 0%, hsl(45 90% 55%) 50%, hsl(0 70% 55%) 100%)`,
            }}
          />
          <div className="flex justify-between text-xs font-body text-muted-foreground">
            <span>😌 Calm</span>
            <span>😐 Moderate</span>
            <span>😰 High</span>
          </div>
        </div>

        {/* Note */}
        <div className="glass-strong rounded-3xl p-6 mb-6">
          <label className="font-body text-sm text-muted-foreground mb-2 block">
            What's on your mind? (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Work deadline, traffic, feeling great..."
            className="w-full bg-transparent border border-muted rounded-xl p-3 font-body text-sm text-foreground placeholder:text-muted-foreground/50 resize-none h-24 outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Location */}
        <div className="glass-strong rounded-3xl p-4 mb-6 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary shrink-0" />
          {locating ? (
            <span className="font-body text-sm text-muted-foreground">Getting your location...</span>
          ) : location ? (
            <span className="font-body text-sm text-muted-foreground">
              📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </span>
          ) : (
            <span className="font-body text-sm text-destructive">Could not get location</span>
          )}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!location || saving}
          className="w-full py-4 rounded-2xl futuristic-gradient font-heading text-lg font-bold text-foreground flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-300 hover:glow-primary"
        >
          {saving ? (
            <div className="w-5 h-5 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5" />
              Log Stress
            </>
          )}
        </button>
      </div>
      <BottomNav />
    </div>
  );
};

export default LogStressPage;
