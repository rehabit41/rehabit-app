// User profile data from onboarding
export interface UserProfile {
  age: number;
  height: number; // cm
  weight: number; // kg
  calorieGoal: number;
  stepGoal: number;
}

// Daily health snapshot
export interface DailyHealth {
  date: string; // YYYY-MM-DD
  steps: number;
  calories: number;
  stressLevel: number; // 0-100
  stressSource: "auto" | "manual";
  activeMinutes: number;
}

export interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

const PROFILE_KEY = "user_profile";
const HEALTH_KEY = "health_data";
const LOCATION_KEY = "location_history";

// ---- Profile ----
export function saveProfile(profile: UserProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getProfile(): UserProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

// ---- Daily Health ----
function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getAllHealth(): DailyHealth[] {
  const raw = localStorage.getItem(HEALTH_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getTodayHealth(): DailyHealth {
  const all = getAllHealth();
  const today = getToday();
  const existing = all.find((d) => d.date === today);
  return existing || { date: today, steps: 0, calories: 0, stressLevel: 50, stressSource: "auto", activeMinutes: 0 };
}

export function saveTodayHealth(data: Partial<DailyHealth>) {
  const all = getAllHealth();
  const today = getToday();
  const idx = all.findIndex((d) => d.date === today);
  const current = getTodayHealth();
  const updated = { ...current, ...data, date: today };
  if (idx >= 0) {
    all[idx] = updated;
  } else {
    all.push(updated);
  }
  // Keep last 90 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const filtered = all.filter((d) => new Date(d.date) >= cutoff);
  localStorage.setItem(HEALTH_KEY, JSON.stringify(filtered));
}

// ---- Calories calculation ----
// MET-based: walking ~3.5 METs, 1 step ≈ 0.04 kcal per kg
export function calculateCalories(steps: number, weightKg: number): number {
  return Math.round(steps * 0.04 * (weightKg / 70));
}

// ---- Stress estimation ----
// Based on: goal completion, time of day, consistency
export function estimateStress(steps: number, stepGoal: number, history: DailyHealth[]): number {
  // Goal completion factor (0-40 points of stress reduction)
  const goalRatio = Math.min(steps / Math.max(stepGoal, 1), 1);
  const goalFactor = (1 - goalRatio) * 40;

  // Time-of-day factor: stress peaks mid-afternoon
  const hour = new Date().getHours();
  const timeFactor = hour >= 13 && hour <= 16 ? 15 : hour >= 9 && hour <= 12 ? 10 : 5;

  // Consistency factor: how many of last 7 days met goal
  const last7 = history.slice(-7);
  const daysMetGoal = last7.filter((d) => d.steps >= stepGoal).length;
  const consistencyFactor = (1 - daysMetGoal / 7) * 20;

  // Base stress + factors, clamped 10-95
  const stress = Math.round(25 + goalFactor + timeFactor + consistencyFactor);
  return Math.max(10, Math.min(95, stress));
}

// ---- Location tracking ----
export function getLocationHistory(): LocationPoint[] {
  const raw = localStorage.getItem(LOCATION_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addLocationPoint(point: LocationPoint) {
  const history = getLocationHistory();
  history.push(point);
  // Keep last 1000 points
  if (history.length > 1000) history.splice(0, history.length - 1000);
  localStorage.setItem(LOCATION_KEY, JSON.stringify(history));
}

export function clearLocationHistory() {
  localStorage.removeItem(LOCATION_KEY);
}

// ---- Step counting via Sensor API ----
export function isStepSensorAvailable(): boolean {
  return "Accelerometer" in window;
}

// ---- Geolocation ----
export function watchPosition(
  onPosition: (pos: GeolocationPosition) => void,
  onError?: (err: GeolocationPositionError) => void
): number | null {
  if (!("geolocation" in navigator)) return null;
  return navigator.geolocation.watchPosition(onPosition, onError, {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 10000,
  });
}

export function stopWatching(id: number) {
  navigator.geolocation.clearWatch(id);
}

// ---- Weekly data for charts ----
export function getWeekData(): DailyHealth[] {
  const all = getAllHealth();
  const today = new Date();
  const days: DailyHealth[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const existing = all.find((h) => h.date === dateStr);
    days.push(existing || { date: dateStr, steps: 0, calories: 0, stressLevel: 50, stressSource: "auto", activeMinutes: 0 });
  }
  return days;
}
