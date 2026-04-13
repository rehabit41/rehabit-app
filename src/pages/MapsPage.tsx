import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MapPin, Brain, Navigation, Square, Heart, Watch, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import BottomNav from "@/components/BottomNav";
import TimelineUpload from "@/components/TimelineUpload";
import { useGeolocation } from "@/hooks/useHealth";
import { useHeartRate } from "@/hooks/useHeartRate";
import { useStressLogs } from "@/hooks/useStressLogs";
import { useSupabaseProfile, useSupabaseHealth } from "@/hooks/useSupabaseData";
import { analyzeStressZones, stressColor, stressLabel, type StressZone } from "@/lib/stressEstimation";
import { type TimelineData } from "@/lib/timelineParser";
import { toast } from "sonner";

const toggleOptions = [
  { id: "places", label: "Places", icon: MapPin },
  { id: "stress", label: "Stress", icon: Brain },
] as const;

type ToggleMode = (typeof toggleOptions)[number]["id"];
type LatLng = { lat: number; lng: number };

const fallbackCenter: LatLng = { lat: 42.49, lng: 27.47 };

const currentLocationIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;background:linear-gradient(135deg,hsl(224 70% 65%),hsl(270 60% 55%));border-radius:9999px;border:3px solid white;box-shadow:0 0 12px hsla(224,70%,65%,0.6);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function createStressIcon(stressLevel: number, source: "heart_rate" | "estimated") {
  const color = stressColor(stressLevel);
  const size = 16 + Math.round((stressLevel / 100) * 20);
  const icon = source === "heart_rate" ? "♥" : "●";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border-radius:9999px;
      border:2px solid rgba(255,255,255,0.3);
      box-shadow:0 0 ${stressLevel > 60 ? 20 : 10}px ${color}80;
      display:flex;align-items:center;justify-content:center;
      font-size:${size * 0.45}px;color:white;
      opacity:0.85;
    ">${icon}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const MapsPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ToggleMode>("places");
  const { tracking, currentPos, history, startTracking, stopTracking } = useGeolocation();
  const { isAvailable: btAvailable, connected: hrConnected, bpm, error: hrError, connect: connectHR, disconnect: disconnectHR } = useHeartRate();
  const { logs: stressLogs } = useStressLogs();
  const { profile } = useSupabaseProfile();
  const { setSteps, today } = useSupabaseHealth();
  const [initialPos, setInitialPos] = useState<LatLng | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const stressMarkersRef = useRef<L.Marker[]>([]);
  const heatLayerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setInitialPos(fallbackCenter);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setInitialPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setInitialPos(fallbackCenter),
      { enableHighAccuracy: true }
    );
  }, []);

  const center = currentPos
    ? { lat: currentPos.lat, lng: currentPos.lng }
    : initialPos ?? fallbackCenter;

  const trailCoords = useMemo<[number, number][]>(
    () => history.map((p) => [p.lat, p.lng]),
    [history]
  );

  const stressZones = useMemo<StressZone[]>(
    () => analyzeStressZones(history, bpm),
    [history, bpm]
  );

  // Initialize map
  useEffect(() => {
    if (!initialPos || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([center.lat, center.lng], 15);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    markerRef.current = L.marker([center.lat, center.lng], { icon: currentLocationIcon })
      .addTo(map)
      .bindPopup("You are here");

    if (trailCoords.length > 1) {
      lineRef.current = L.polyline(trailCoords, {
        color: "hsl(224 70% 65%)",
        weight: 4,
        opacity: 0.8,
      }).addTo(map);
    }

    return () => {
      heatLayerRef.current?.remove();
      heatLayerRef.current = null;
      stressMarkersRef.current.forEach((m) => m.remove());
      stressMarkersRef.current = [];
      lineRef.current?.remove();
      markerRef.current?.remove();
      map.remove();
      lineRef.current = null;
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [initialPos]);

  // Update position
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([center.lat, center.lng]);
    mapRef.current.setView([center.lat, center.lng], mapRef.current.getZoom(), { animate: true });
  }, [center.lat, center.lng]);

  // Update trail
  useEffect(() => {
    if (!mapRef.current) return;
    if (lineRef.current) {
      lineRef.current.setLatLngs(trailCoords);
    } else if (trailCoords.length > 1) {
      lineRef.current = L.polyline(trailCoords, {
        color: "hsl(224 70% 65%)",
        weight: 4,
        opacity: 0.8,
      }).addTo(mapRef.current);
    }
  }, [trailCoords]);

  // Heatmap from timeline data
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old heatmap
    if (heatLayerRef.current) {
      heatLayerRef.current.remove();
      heatLayerRef.current = null;
    }

    if (!timelineData || mode !== "places") return;

    const heatPoints: [number, number, number][] = timelineData.points.map((p) => [
      p.lat,
      p.lng,
      p.intensity,
    ]);

    if (heatPoints.length === 0) return;

    heatLayerRef.current = L.heatLayer(heatPoints, {
      radius: 50,
      blur: 30,
      maxZoom: 17,
      max: 1.0,
      minOpacity: 0.4,
      gradient: {
        0.1: "#3b82f6",
        0.3: "#22d3ee",
        0.5: "#22c55e",
        0.7: "#eab308",
        0.9: "#f97316",
        1.0: "#ef4444",
      },
    }).addTo(mapRef.current);

    // Fit map to heatmap bounds
    const lats = heatPoints.map((p) => p[0]);
    const lngs = heatPoints.map((p) => p[1]);
    const bounds = L.latLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );
    mapRef.current.fitBounds(bounds, { padding: [40, 40] });
  }, [timelineData, mode]);

  // Stress markers
  useEffect(() => {
    if (!mapRef.current) return;

    stressMarkersRef.current.forEach((m) => m.remove());
    stressMarkersRef.current = [];

    if (mode !== "stress") return;

    stressLogs.forEach((log) => {
      const marker = L.marker([log.latitude, log.longitude], {
        icon: createStressIcon(log.stress_level, "estimated"),
      })
        .addTo(mapRef.current!)
        .bindPopup(
          `<div style="font-family:sans-serif;text-align:center;">
            <div style="font-size:14px;font-weight:bold;color:${stressColor(log.stress_level)}">${stressLabel(log.stress_level)} Stress</div>
            <div style="font-size:12px;margin-top:4px;">Level: ${log.stress_level}/100</div>
            ${log.note ? `<div style="font-size:11px;color:#888;margin-top:4px;">"${log.note}"</div>` : ""}
            <div style="font-size:10px;color:#aaa;margin-top:2px;">📝 Self-reported · ${new Date(log.created_at).toLocaleDateString()}</div>
          </div>`
        );
      stressMarkersRef.current.push(marker);
    });

    stressZones.forEach((zone) => {
      const marker = L.marker([zone.lat, zone.lng], {
        icon: createStressIcon(zone.stressLevel, zone.source),
      })
        .addTo(mapRef.current!)
        .bindPopup(
          `<div style="font-family:sans-serif;text-align:center;">
            <div style="font-size:14px;font-weight:bold;color:${stressColor(zone.stressLevel)}">${stressLabel(zone.stressLevel)} Stress</div>
            <div style="font-size:12px;margin-top:4px;">${zone.label}</div>
            <div style="font-size:11px;color:#888;margin-top:2px;">Level: ${zone.stressLevel}/100</div>
            <div style="font-size:10px;color:#aaa;margin-top:2px;">${zone.source === "heart_rate" ? "📡 From heart rate monitor" : "🧠 Estimated from behavior"}</div>
          </div>`
        );
      stressMarkersRef.current.push(marker);
    });
  }, [mode, stressZones, stressLogs]);

  const handleTimelineLoaded = useCallback((data: TimelineData) => {
    setTimelineData(data);
    setMode("places");
  }, []);

  const handleTimelineClear = useCallback(() => {
    setTimelineData(null);
  }, []);

  const handleSaveSteps = useCallback(async (steps: number, _walkingKm: number) => {
    if (!profile) {
      toast.error("Please complete your profile first");
      return;
    }
    const currentSteps = today?.steps || 0;
    await setSteps(currentSteps + steps, profile.weight || 70, profile.step_goal);
    toast.success(`Added ${steps.toLocaleString()} steps to your dashboard!`);
  }, [profile, today, setSteps]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {!initialPos && (
        <div className="absolute inset-0 z-[1] flex items-center justify-center bg-background">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-background/90 to-transparent z-[1] pointer-events-none" />

      <div className="relative z-[2] max-w-md mx-auto px-6 pt-14 pb-36">
        <h1 className="font-heading text-2xl font-bold text-glow mb-6 text-center">
          Timeline Map
        </h1>

        {/* Timeline Upload */}
        <TimelineUpload
          onTimelineLoaded={handleTimelineLoaded}
          onClear={handleTimelineClear}
          hasData={!!timelineData}
          onSaveSteps={handleSaveSteps}
        />

        {/* GPS + Heart Rate Controls */}
        <div className="flex justify-center gap-3 mb-4 flex-wrap">
          <button
            onClick={tracking ? stopTracking : startTracking}
            className={`glass-strong rounded-2xl px-5 py-3 flex items-center gap-2 font-body text-sm transition-all duration-300 ${
              tracking ? "glow-accent" : "hover:glow-primary"
            }`}
          >
            {tracking ? (
              <>
                <Square className="w-4 h-4 text-destructive" />
                <span className="text-foreground">Stop GPS</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 text-primary" />
                <span className="text-foreground">Start GPS</span>
              </>
            )}
          </button>

          {btAvailable && (
            <button
              onClick={hrConnected ? disconnectHR : connectHR}
              className={`glass-strong rounded-2xl px-5 py-3 flex items-center gap-2 font-body text-sm transition-all duration-300 ${
                hrConnected ? "glow-accent" : "hover:glow-primary"
              }`}
            >
              {hrConnected ? (
                <>
                  <Heart className="w-4 h-4 text-destructive animate-pulse" />
                  <span className="text-foreground">{bpm ?? "..."}bpm</span>
                </>
              ) : (
                <>
                  <Watch className="w-4 h-4 text-primary" />
                  <span className="text-foreground">Connect Watch</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Status info */}
        {(tracking || hrConnected) && (
          <div className="flex justify-center gap-2 mb-4 flex-wrap">
            {tracking && currentPos && (
              <p className="text-xs text-muted-foreground font-body glass-strong rounded-full px-4 py-2">
                📍 {currentPos.lat.toFixed(4)}, {currentPos.lng.toFixed(4)} · {history.length} pts
              </p>
            )}
            {hrConnected && bpm && (
              <p className="text-xs font-body glass-strong rounded-full px-4 py-2" style={{ color: stressColor(bpm > 100 ? 70 : bpm > 80 ? 40 : 20) }}>
                ♥ {bpm} bpm · {bpm > 100 ? "Elevated" : bpm > 80 ? "Normal" : "Calm"}
              </p>
            )}
          </div>
        )}

        {hrError && (
          <p className="text-center text-xs text-destructive font-body mb-4 glass-strong rounded-full px-4 py-2 mx-auto w-fit">
            ⚠️ {hrError}
          </p>
        )}

        {!btAvailable && mode === "stress" && (
          <p className="text-center text-xs text-muted-foreground font-body mb-4 glass-strong rounded-full px-4 py-2 mx-auto w-fit">
            🧠 No Bluetooth — using behavioral stress estimation
          </p>
        )}

        {/* Mode toggle */}
        <div className="flex justify-center mb-6">
          <div className="glass-strong rounded-full p-1 flex">
            {toggleOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setMode(opt.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-body text-sm transition-all duration-300 ${
                  mode === opt.id
                    ? "futuristic-gradient glow-primary font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <opt.icon className="w-4 h-4" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stress legend when in stress mode */}
        {mode === "stress" && (
          <div className="glass-strong rounded-2xl p-4 mb-4">
            <p className="text-xs font-body text-muted-foreground mb-2 text-center">
              {hrConnected ? "📡 Live heart rate + behavioral analysis" : "🧠 Stress estimated from dwell time & patterns"}
              {stressLogs.length > 0 && ` · ${stressLogs.length} logged entries`}
            </p>
            <div className="flex justify-center gap-4 mb-3">
              {[
                { label: "Calm", color: stressColor(20) },
                { label: "Mild", color: stressColor(40) },
                { label: "Elevated", color: stressColor(60) },
                { label: "High", color: stressColor(80) },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}80` }} />
                  <span className="text-xs font-body text-foreground">{item.label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/log-stress")}
              className="w-full py-3 rounded-xl futuristic-gradient font-body text-sm font-semibold text-foreground flex items-center justify-center gap-2 hover:glow-primary transition-all"
            >
              <Plus className="w-4 h-4" />
              Log How You Feel
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MapsPage;
