import { useRef, useState } from "react";
import { Upload, FileJson, X, Footprints, MapPin, Route, Save } from "lucide-react";
import { parseTimelineJSON, type TimelineData } from "@/lib/timelineParser";

interface TimelineUploadProps {
  onTimelineLoaded: (data: TimelineData) => void;
  onClear: () => void;
  hasData: boolean;
  onSaveSteps?: (steps: number, walkingKm: number) => void;
}

const TimelineUpload = ({ onTimelineLoaded, onClear, hasData, onSaveSteps }: TimelineUploadProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TimelineData["stats"] | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const data = parseTimelineJSON(json);
      if (data.points.length === 0) {
        setError("No location data found in this file. Make sure it's a Google Timeline JSON export.");
        setLoading(false);
        return;
      }
      setStats(data.stats);
      onTimelineLoaded(data);
    } catch {
      setError("Failed to parse file. Please upload a valid Google Timeline JSON.");
    }
    setLoading(false);
  };

  const handleClear = () => {
    setStats(null);
    setError(null);
    onClear();
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="glass-strong rounded-2xl p-4 mb-4">
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {!hasData ? (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="w-full py-3 rounded-xl futuristic-gradient font-body text-sm font-semibold text-foreground flex items-center justify-center gap-2 hover:glow-primary transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {loading ? "Parsing…" : "Upload Google Timeline"}
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-primary" />
              <span className="text-sm font-body font-semibold text-foreground">Timeline Loaded</span>
            </div>
            <button onClick={handleClear} className="p-1 rounded-full hover:bg-muted/30 transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          {stats && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="glass rounded-xl p-2">
                <Footprints className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-sm font-bold text-foreground">{stats.estimatedSteps.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Steps</p>
              </div>
              <div className="glass rounded-xl p-2">
                <MapPin className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-sm font-bold text-foreground">{stats.placeVisits}</p>
                <p className="text-[10px] text-muted-foreground">Places</p>
              </div>
              <div className="glass rounded-xl p-2">
                <Route className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-sm font-bold text-foreground">{stats.walkingDistanceKm}</p>
                <p className="text-[10px] text-muted-foreground">km walked</p>
              </div>
            </div>
          )}
          {stats && onSaveSteps && stats.estimatedSteps > 0 && (
            <button
              onClick={() => onSaveSteps(stats.estimatedSteps, stats.walkingDistanceKm)}
              className="w-full mt-3 py-2.5 rounded-xl futuristic-gradient font-body text-sm font-semibold text-foreground flex items-center justify-center gap-2 hover:glow-primary transition-all"
            >
              <Save className="w-4 h-4" />
              Save {stats.estimatedSteps.toLocaleString()} Steps to Dashboard
            </button>
          )}
        </>
      )}

      {error && (
        <p className="text-xs text-destructive mt-2 text-center font-body">{error}</p>
      )}

      {!hasData && !loading && (
        <p className="text-[10px] text-muted-foreground mt-2 text-center font-body">
          Export from Google Takeout → Location History → Timeline JSON
        </p>
      )}
    </div>
  );
};

export default TimelineUpload;
