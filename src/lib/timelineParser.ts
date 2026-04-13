/**
 * Parses Google Timeline (Takeout) JSON and extracts
 * heatmap points + estimated steps from walking segments.
 */

export interface TimelinePoint {
  lat: number;
  lng: number;
  intensity: number; // 0-1
  timestamp?: number;
}

export interface TimelineStats {
  totalPoints: number;
  placeVisits: number;
  activitySegments: number;
  estimatedSteps: number;
  walkingDistanceKm: number;
}

export interface TimelineData {
  points: TimelinePoint[];
  stats: TimelineStats;
}

// Average step length in meters
const AVG_STEP_LENGTH_M = 0.762;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function parseTimelineJSON(json: unknown): TimelineData {
  const data = json as Record<string, unknown>;
  const timelineObjects = (data.timelineObjects ?? []) as Record<string, unknown>[];

  const points: TimelinePoint[] = [];
  let placeVisits = 0;
  let activitySegments = 0;
  let walkingDistanceKm = 0;

  for (const obj of timelineObjects) {
    // Place visits
    if (obj.placeVisit) {
      const pv = obj.placeVisit as Record<string, unknown>;
      const loc = pv.location as Record<string, unknown> | undefined;
      if (loc) {
        const lat = (loc.latitudeE7 as number) / 1e7;
        const lng = (loc.longitudeE7 as number) / 1e7;
        if (isFinite(lat) && isFinite(lng)) {
          points.push({ lat, lng, intensity: 1 });
          placeVisits++;
        }
      }
    }

    // Activity segments
    if (obj.activitySegment) {
      const seg = obj.activitySegment as Record<string, unknown>;
      const startLoc = seg.startLocation as Record<string, unknown> | undefined;
      const endLoc = seg.endLocation as Record<string, unknown> | undefined;
      const activityType = (seg.activityType as string) ?? "";

      if (endLoc) {
        const lat = (endLoc.latitudeE7 as number) / 1e7;
        const lng = (endLoc.longitudeE7 as number) / 1e7;
        if (isFinite(lat) && isFinite(lng)) {
          points.push({ lat, lng, intensity: 0.5 });
          activitySegments++;
        }
      }

      // Estimate walking distance for steps
      const isWalking = /walk|on_foot|running/i.test(activityType);
      if (isWalking && startLoc && endLoc) {
        const sLat = (startLoc.latitudeE7 as number) / 1e7;
        const sLng = (startLoc.longitudeE7 as number) / 1e7;
        const eLat = (endLoc.latitudeE7 as number) / 1e7;
        const eLng = (endLoc.longitudeE7 as number) / 1e7;

        // Use distance from segment if available, otherwise haversine
        const distM = seg.distance as number | undefined;
        if (distM && distM > 0) {
          walkingDistanceKm += distM / 1000;
        } else if (isFinite(sLat) && isFinite(eLat)) {
          walkingDistanceKm += haversineKm(sLat, sLng, eLat, eLng);
        }
      }
    }
  }

  const estimatedSteps = Math.round((walkingDistanceKm * 1000) / AVG_STEP_LENGTH_M);

  return {
    points,
    stats: {
      totalPoints: points.length,
      placeVisits,
      activitySegments,
      estimatedSteps,
      walkingDistanceKm: Math.round(walkingDistanceKm * 100) / 100,
    },
  };
}
