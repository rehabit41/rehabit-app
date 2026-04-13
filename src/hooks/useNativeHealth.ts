import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isNativePlatform,
  getPlatform,
  requestHealthPermissions,
  fetchTodayNativeHealth,
  type NativeHealthData,
  type HealthPermissionStatus,
} from '@/lib/nativeHealth';
import { saveTodayHealth } from '@/lib/healthData';

export function useNativeHealth() {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');
  const [permissions, setPermissions] = useState<HealthPermissionStatus>({
    steps: false,
    calories: false,
    heartRate: false,
  });
  const [healthData, setHealthData] = useState<NativeHealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsNative(isNativePlatform());
    setPlatform(getPlatform());
  }, []);

  const requestPermissions = useCallback(async () => {
    setLoading(true);
    const result = await requestHealthPermissions();
    setPermissions(result);
    setLoading(false);
    return result;
  }, []);

  const syncHealthData = useCallback(async () => {
    if (!isNative) return null;

    const data = await fetchTodayNativeHealth();
    if (data) {
      setHealthData(data);
      // Save to local health store so dashboard picks it up
      saveTodayHealth({
        steps: data.steps,
        calories: data.calories,
        activeMinutes: data.activeMinutes,
        stressSource: 'auto',
      });
    }
    return data;
  }, [isNative]);

  // Auto-sync every 60 seconds when native
  useEffect(() => {
    if (!isNative) return;

    // Initial sync
    syncHealthData();

    // Periodic sync
    intervalRef.current = setInterval(syncHealthData, 60_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isNative, syncHealthData]);

  return {
    isNative,
    platform,
    permissions,
    healthData,
    loading,
    requestPermissions,
    syncHealthData,
  };
}
