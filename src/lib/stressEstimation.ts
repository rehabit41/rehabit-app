import { LocationPoint } from "./healthData";

export interface StressZone {
  lat: number;
  lng: number;
  stressLevel: number; // 0-100
  source: "heart_rate" | "estimated";
  dwellMinutes: number;
  label: string;
}

// Group nearby points into clusters (zones where user lingered)
function clusterPoints(points: LocationPoint[], radiusMeters = 50): LocationPoint[][] {
  const clusters: LocationPoint[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < points.length; i++) {
    if (used.has(i)) continue;
    const cluster: LocationPoint[] = [points[i]];
    used.add(i);

    for (let j = i + 1; j < points.length; j++) {
      if (used.has(j)) continue;
      if (haversineDistance(points[i], points[j]) < radiusMeters) {
        cluster.push(points[j]);
        used.add(j);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

function haversineDistance(a: LocationPoint, b: LocationPoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Estimate stress for a cluster based on dwell time, time of day, stillness
function estimateClusterStress(cluster: LocationPoint[]): number {
  if (cluster.length < 2) return 20;

  const timestamps = cluster.map((p) => p.timestamp).sort((a, b) => a - b);
  const dwellMs = timestamps[timestamps.length - 1] - timestamps[0];
  const dwellMinutes = dwellMs / 60000;

  // Dwell time factor: staying 10+ min in one spot = higher stress indicator
  const dwellFactor = Math.min(dwellMinutes / 30, 1) * 35;

  // Time of day: peak stress hours 9-17 (work hours)
  const avgTime = new Date((timestamps[0] + timestamps[timestamps.length - 1]) / 2);
  const hour = avgTime.getHours();
  let timeFactor = 10;
  if (hour >= 9 && hour <= 12) timeFactor = 20;
  else if (hour >= 13 && hour <= 17) timeFactor = 25;
  else if (hour >= 18 && hour <= 21) timeFactor = 15;
  else if (hour >= 22 || hour <= 5) timeFactor = 10;

  // Stillness: low movement within cluster = potentially more stress
  let totalDist = 0;
  for (let i = 1; i < cluster.length; i++) {
    totalDist += haversineDistance(cluster[i - 1], cluster[i]);
  }
  const avgMovement = totalDist / cluster.length;
  const stillnessFactor = avgMovement < 5 ? 20 : avgMovement < 20 ? 10 : 0;

  const stress = Math.round(15 + dwellFactor + timeFactor + stillnessFactor);
  return Math.max(10, Math.min(95, stress));
}

// Heart rate to stress mapping
export function heartRateToStress(bpm: number, restingBpm = 70): number {
  // Elevated HR above resting indicates stress
  const elevation = Math.max(0, bpm - restingBpm);
  // 0-10 above resting = low stress, 10-30 = moderate, 30+ = high
  const stress = Math.min(95, Math.round(20 + (elevation / 40) * 70));
  return Math.max(10, stress);
}

export function analyzeStressZones(
  locationHistory: LocationPoint[],
  heartRateBpm?: number | null
): StressZone[] {
  const clusters = clusterPoints(locationHistory, 50);
  const zones: StressZone[] = [];

  for (const cluster of clusters) {
    if (cluster.length < 2) continue;

    const timestamps = cluster.map((p) => p.timestamp).sort((a, b) => a - b);
    const dwellMs = timestamps[timestamps.length - 1] - timestamps[0];
    const dwellMinutes = Math.round(dwellMs / 60000);

    if (dwellMinutes < 1) continue;

    // Average position for zone center
    const avgLat = cluster.reduce((s, p) => s + p.lat, 0) / cluster.length;
    const avgLng = cluster.reduce((s, p) => s + p.lng, 0) / cluster.length;

    const estimatedStress = estimateClusterStress(cluster);

    zones.push({
      lat: avgLat,
      lng: avgLng,
      stressLevel: estimatedStress,
      source: "estimated",
      dwellMinutes,
      label: dwellMinutes >= 30
        ? `Stayed ${dwellMinutes}min — High dwell`
        : dwellMinutes >= 10
        ? `Stayed ${dwellMinutes}min — Moderate dwell`
        : `Stayed ${dwellMinutes}min`,
    });
  }

  // If we have current HR data, add it to the most recent zone or create one
  if (heartRateBpm && locationHistory.length > 0) {
    const lastPoint = locationHistory[locationHistory.length - 1];
    const hrStress = heartRateToStress(heartRateBpm);
    
    // Update last zone if close, otherwise add new
    const nearbyZone = zones.find(
      (z) => haversineDistance({ lat: z.lat, lng: z.lng, timestamp: 0 }, lastPoint) < 50
    );

    if (nearbyZone) {
      nearbyZone.stressLevel = Math.round((nearbyZone.stressLevel + hrStress) / 2);
      nearbyZone.source = "heart_rate";
      nearbyZone.label += ` · ${heartRateBpm}bpm`;
    } else {
      zones.push({
        lat: lastPoint.lat,
        lng: lastPoint.lng,
        stressLevel: hrStress,
        source: "heart_rate",
        dwellMinutes: 0,
        label: `Live HR: ${heartRateBpm}bpm`,
      });
    }
  }

  return zones;
}

// Color for stress level
export function stressColor(level: number): string {
  if (level < 30) return "hsl(142, 70%, 45%)"; // green - calm
  if (level < 50) return "hsl(48, 90%, 55%)";  // yellow - mild
  if (level < 70) return "hsl(25, 90%, 55%)";  // orange - moderate
  return "hsl(0, 70%, 55%)";                    // red - high
}

export function stressLabel(level: number): string {
  if (level < 30) return "Calm";
  if (level < 50) return "Mild";
  if (level < 70) return "Elevated";
  return "High";
}
