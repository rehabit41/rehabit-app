/**
 * Native Health Data Service
 * Abstracts HealthKit (iOS) and Health Connect (Android) behind a unified API.
 * Falls back to web-based manual entry when not running as a native app.
 */

import { Capacitor } from '@capacitor/core';

// Dynamic import helper — hides module path from Rollup's static analysis
// so the build doesn't fail when native-only plugins aren't installed
function dynamicImport(moduleName: string): Promise<any> {
  return new Function('m', 'return import(m)')(moduleName);
}

async function tryImport(moduleName: string): Promise<any> {
  try {
    return await dynamicImport(moduleName);
  } catch {
    return null;
  }
}

export interface NativeHealthData {
  steps: number;
  calories: number;
  heartRate: number | null; // BPM, null if unavailable
  activeMinutes: number;
}

export interface HealthPermissionStatus {
  steps: boolean;
  calories: boolean;
  heartRate: boolean;
}

// Check if running as a native app
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

/**
 * Request health data permissions.
 * On iOS: requests HealthKit authorization
 * On Android: requests Health Connect permissions
 * On Web: returns all false (uses manual entry)
 */
export async function requestHealthPermissions(): Promise<HealthPermissionStatus> {
  const platform = getPlatform();

  if (platform === 'web') {
    return { steps: false, calories: false, heartRate: false };
  }

  try {
    if (platform === 'ios') {
      return await requestHealthKitPermissions();
    } else {
      return await requestHealthConnectPermissions();
    }
  } catch (error) {
    console.error('Failed to request health permissions:', error);
    return { steps: false, calories: false, heartRate: false };
  }
}

/**
 * Fetch today's health data from the native health store.
 * Returns null if not available (web or permissions denied).
 */
export async function fetchTodayNativeHealth(): Promise<NativeHealthData | null> {
  const platform = getPlatform();

  if (platform === 'web') return null;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    if (platform === 'ios') {
      return await fetchHealthKitData(today, now);
    } else {
      return await fetchHealthConnectData(today, now);
    }
  } catch (error) {
    console.error('Failed to fetch native health data:', error);
    return null;
  }
}

// ---- iOS HealthKit ----
// Uses the native HealthKit plugin (installed via Capacitor plugin in Xcode)
// These functions call the native bridge — they'll only work in an actual iOS build

async function requestHealthKitPermissions(): Promise<HealthPermissionStatus> {
  try {
    // This calls the native HealthKit plugin
    // Plugin must be installed: npm install capacitor-health-kit
    const mod = await tryImport('capacitor-health-kit');
    const CapacitorHealthkit = mod?.CapacitorHealthkit || null;

    if (!CapacitorHealthkit) {
      return { steps: false, calories: false, heartRate: false };
    }

    await CapacitorHealthkit.requestAuthorization({
      all: [],
      read: [
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierAppleExerciseTime',
      ],
      write: [],
    });

    return { steps: true, calories: true, heartRate: true };
  } catch {
    return { steps: false, calories: false, heartRate: false };
  }
}

async function fetchHealthKitData(start: Date, end: Date): Promise<NativeHealthData | null> {
  try {
    const mod = await tryImport('capacitor-health-kit');
    const CapacitorHealthkit = mod?.CapacitorHealthkit || null;
    if (!CapacitorHealthkit) return null;

    const dateRange = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };

    const [stepsResult, caloriesResult, heartRateResult, exerciseResult] = await Promise.allSettled([
      CapacitorHealthkit.queryHKitSampleType({
        ...dateRange,
        sampleName: 'HKQuantityTypeIdentifierStepCount',
        limit: 0,
      }),
      CapacitorHealthkit.queryHKitSampleType({
        ...dateRange,
        sampleName: 'HKQuantityTypeIdentifierActiveEnergyBurned',
        limit: 0,
      }),
      CapacitorHealthkit.queryHKitSampleType({
        ...dateRange,
        sampleName: 'HKQuantityTypeIdentifierHeartRate',
        limit: 1,
      }),
      CapacitorHealthkit.queryHKitSampleType({
        ...dateRange,
        sampleName: 'HKQuantityTypeIdentifierAppleExerciseTime',
        limit: 0,
      }),
    ]);

    const steps = sumSamples(stepsResult);
    const calories = Math.round(sumSamples(caloriesResult));
    const heartRate = getLatestSample(heartRateResult);
    const activeMinutes = Math.round(sumSamples(exerciseResult));

    return { steps, calories, heartRate, activeMinutes };
  } catch {
    return null;
  }
}

// ---- Android Health Connect ----

async function requestHealthConnectPermissions(): Promise<HealthPermissionStatus> {
  try {
    // Uses @nicefan/capacitor-health-connect or similar plugin
    const mod = await tryImport('@nicefan/capacitor-health-connect');
    const HealthConnect = mod?.HealthConnect || null;
    if (!HealthConnect) return { steps: false, calories: false, heartRate: false };

    await HealthConnect.requestPermissions({
      permissions: ['Steps', 'TotalCaloriesBurned', 'HeartRate', 'ExerciseSession'],
    });

    return { steps: true, calories: true, heartRate: true };
  } catch {
    return { steps: false, calories: false, heartRate: false };
  }
}

async function fetchHealthConnectData(start: Date, end: Date): Promise<NativeHealthData | null> {
  try {
    const mod = await tryImport('@nicefan/capacitor-health-connect');
    const HealthConnect = mod?.HealthConnect || null;
    if (!HealthConnect) return null;

    const timeRange = {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };

    const [stepsResult, caloriesResult, heartRateResult] = await Promise.allSettled([
      HealthConnect.readRecords({ type: 'Steps', timeRange }),
      HealthConnect.readRecords({ type: 'TotalCaloriesBurned', timeRange }),
      HealthConnect.readRecords({ type: 'HeartRate', timeRange }),
    ]);

    const steps = sumAndroidRecords(stepsResult, 'count');
    const calories = Math.round(sumAndroidRecords(caloriesResult, 'energy'));
    const heartRate = getLatestAndroidRecord(heartRateResult);

    return { steps, calories, heartRate, activeMinutes: Math.round(steps / 100) };
  } catch {
    return null;
  }
}

// ---- Helpers ----

function sumSamples(result: PromiseSettledResult<any>): number {
  if (result.status !== 'fulfilled' || !result.value?.resultData) return 0;
  return result.value.resultData.reduce((sum: number, s: any) => sum + (s.quantity || s.value || 0), 0);
}

function getLatestSample(result: PromiseSettledResult<any>): number | null {
  if (result.status !== 'fulfilled' || !result.value?.resultData?.length) return null;
  const latest = result.value.resultData[result.value.resultData.length - 1];
  return Math.round(latest.quantity || latest.value || 0);
}

function sumAndroidRecords(result: PromiseSettledResult<any>, field: string): number {
  if (result.status !== 'fulfilled' || !result.value?.records) return 0;
  return result.value.records.reduce((sum: number, r: any) => sum + (r[field] || 0), 0);
}

function getLatestAndroidRecord(result: PromiseSettledResult<any>): number | null {
  if (result.status !== 'fulfilled' || !result.value?.records?.length) return null;
  const samples = result.value.records.flatMap((r: any) => r.samples || []);
  if (!samples.length) return null;
  return Math.round(samples[samples.length - 1].beatsPerMinute || 0);
}
