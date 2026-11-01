// src/lib/coaching/autopilotPrefs.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AutopilotPrefs = {
  updatedAt: number; // ms (used to detect changes)

  planMainMaxItems: number; // 5..12
  starterMaxItems: number; // 0..3

  nudgesEnabled: boolean;
  nudgeTypes: {
    nextUp: boolean;
    streakRisk: boolean;
    digest: boolean;
  };

  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string;   // HH:MM
  };
};

const KEY = 'lumina:autopilot:prefs:v1';

const DEFAULT_PREFS: AutopilotPrefs = {
  updatedAt: 0,
  planMainMaxItems: 7,
  starterMaxItems: 2,
  nudgesEnabled: true,
  nudgeTypes: { nextUp: true, streakRisk: true, digest: true },
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isHHMM(v: string) {
  return /^([01]?\d|2[0-3]):([0-5]\d)$/.test((v ?? '').trim());
}

function parseHHMMToMinutes(v: string): number | null {
  if (!isHHMM(v)) return null;
  const [hh, mm] = v.split(':').map(Number);
  return hh * 60 + mm;
}

function deepMergePrefs(base: AutopilotPrefs, patch: Partial<AutopilotPrefs>): AutopilotPrefs {
  const merged: AutopilotPrefs = {
    ...base,
    ...patch,
    nudgeTypes: { ...base.nudgeTypes, ...(patch.nudgeTypes ?? {}) },
    quietHours: { ...base.quietHours, ...(patch.quietHours ?? {}) },
  };

  merged.planMainMaxItems = clamp(Number(merged.planMainMaxItems ?? 7), 5, 12);
  merged.starterMaxItems = clamp(Number(merged.starterMaxItems ?? 2), 0, 3);

  if (!isHHMM(merged.quietHours.start)) merged.quietHours.start = DEFAULT_PREFS.quietHours.start;
  if (!isHHMM(merged.quietHours.end)) merged.quietHours.end = DEFAULT_PREFS.quietHours.end;

  merged.nudgesEnabled = !!merged.nudgesEnabled;
  merged.nudgeTypes.nextUp = !!merged.nudgeTypes.nextUp;
  merged.nudgeTypes.streakRisk = !!merged.nudgeTypes.streakRisk;
  merged.nudgeTypes.digest = !!merged.nudgeTypes.digest;

  merged.quietHours.enabled = !!merged.quietHours.enabled;

  return merged;
}

export async function loadAutopilotPrefs(): Promise<AutopilotPrefs> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULT_PREFS;

  try {
    const parsed = JSON.parse(raw) as Partial<AutopilotPrefs>;
    return deepMergePrefs(DEFAULT_PREFS, parsed);
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveAutopilotPrefs(prefs: AutopilotPrefs): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
}

export async function updateAutopilotPrefs(patch: Partial<AutopilotPrefs>): Promise<AutopilotPrefs> {
  const current = await loadAutopilotPrefs();
  const next = deepMergePrefs(current, patch);
  next.updatedAt = Date.now();
  await saveAutopilotPrefs(next);
  return next;
}

export function isWithinQuietHours(now: Date, prefs: AutopilotPrefs): boolean {
  if (!prefs.quietHours.enabled) return false;

  const startM = parseHHMMToMinutes(prefs.quietHours.start);
  const endM = parseHHMMToMinutes(prefs.quietHours.end);
  if (startM == null || endM == null) return false;

  const nowM = now.getHours() * 60 + now.getMinutes();

  // Same => treat as disabled
  if (startM === endM) return false;

  // Normal window (e.g., 13:00–17:00)
  if (startM < endM) return nowM >= startM && nowM < endM;

  // Wrap window (e.g., 22:00–07:00)
  return nowM >= startM || nowM < endM;
}