import { useState, useEffect, useCallback, useRef } from "react";
import {
  getProfile, saveProfile, UserProfile,
  getTodayHealth, saveTodayHealth, DailyHealth,
  calculateCalories, estimateStress, getAllHealth,
  getWeekData, watchPosition, stopWatching,
  addLocationPoint, getLocationHistory, LocationPoint,
} from "@/lib/healthData";

// ---- useProfile ----
export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(getProfile);

  const updateProfile = useCallback((p: UserProfile) => {
    saveProfile(p);
    setProfile(p);
  }, []);

  return { profile, updateProfile };
}

// ---- useHealthData ----
export function useHealthData() {
  const [today, setToday] = useState<DailyHealth>(getTodayHealth);
  const [weekData, setWeekData] = useState<DailyHealth[]>(getWeekData);
  const { profile } = useProfile();

  const refresh = useCallback(() => {
    setToday(getTodayHealth());
    setWeekData(getWeekData());
  }, []);

  const addSteps = useCallback((steps: number) => {
    const current = getTodayHealth();
    const newSteps = current.steps + steps;
    const weight = profile?.weight || 70;
    const stepGoal = profile?.stepGoal || 10000;
    const calories = calculateCalories(newSteps, weight);
    const stress = estimateStress(newSteps, stepGoal, getAllHealth());
    saveTodayHealth({ steps: newSteps, calories, stressLevel: stress, stressSource: "auto" });
    refresh();
  }, [profile, refresh]);

  const setManualStress = useCallback((level: number) => {
    saveTodayHealth({ stressLevel: level, stressSource: "manual" });
    refresh();
  }, [refresh]);

  const setSteps = useCallback((steps: number) => {
    const weight = profile?.weight || 70;
    const stepGoal = profile?.stepGoal || 10000;
    const calories = calculateCalories(steps, weight);
    const stress = estimateStress(steps, stepGoal, getAllHealth());
    saveTodayHealth({ steps, calories, stressLevel: stress, stressSource: "auto" });
    refresh();
  }, [profile, refresh]);

  return { today, weekData, addSteps, setSteps, setManualStress, refresh, profile };
}

// ---- useStepCounter ----
export function useStepCounter(onStep: (count: number) => void) {
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;

  useEffect(() => {
    // Skip if callback is a no-op (not tracking)
    if (!("Accelerometer" in window)) return;

    let stepCount = 0;
    let lastMagnitude = 0;
    let lastTime = 0;
    const THRESHOLD = 12;
    const COOLDOWN = 300;

    try {
      // @ts-ignore - Accelerometer API
      const sensor = new Accelerometer({ frequency: 30 });
      sensor.addEventListener("reading", () => {
        const { x, y, z } = sensor;
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();

        if (magnitude > THRESHOLD && lastMagnitude <= THRESHOLD && now - lastTime > COOLDOWN) {
          stepCount++;
          lastTime = now;
          if (stepCount % 10 === 0) {
            onStepRef.current(10);
          }
        }
        lastMagnitude = magnitude;
      });
      sensor.start();
      return () => sensor.stop();
    } catch {
      // Sensor not available
    }
  }, []);
}

// ---- useGeolocation ----
export function useGeolocation() {
  const [tracking, setTracking] = useState(false);
  const [currentPos, setCurrentPos] = useState<LocationPoint | null>(null);
  const [history, setHistory] = useState<LocationPoint[]>(getLocationHistory);
  const [watchId, setWatchId] = useState<number | null>(null);

  const startTracking = useCallback(() => {
    const id = watchPosition((pos) => {
      const point: LocationPoint = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        timestamp: Date.now(),
      };
      setCurrentPos(point);
      addLocationPoint(point);
      setHistory(getLocationHistory());
    });
    if (id !== null) {
      setWatchId(id);
      setTracking(true);
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      stopWatching(watchId);
      setWatchId(null);
    }
    setTracking(false);
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) stopWatching(watchId);
    };
  }, [watchId]);

  return { tracking, currentPos, history, startTracking, stopTracking };
}
