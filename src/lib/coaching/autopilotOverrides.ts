// src/lib/coaching/autopilotOverrides.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDateKey } from '@/utils/date';
import type { AutopilotBlockId } from '@/lib/coaching/autopilotPlan';

export type AutopilotItemKey = `habit:${string}` | `task:${string}`;

export type AutopilotItemOverride = {
  skipped?: boolean;
  snoozedUntil?: number; // ms timestamp
  pinnedBlockId?: AutopilotBlockId;
  forceMinimum?: boolean; // habits only
};

type StoredOverrides = {
  dateKey: string;
  items: Record<string, AutopilotItemOverride>;
};

const KEY_PREFIX = 'lumina:autopilot:overrides:v1';

function storageKey(dateKey: string) {
  return `${KEY_PREFIX}:${dateKey}`;
}

export async function loadAutopilotOverrides(now: Date): Promise<Record<string, AutopilotItemOverride>> {
  const dateKey = formatDateKey(now);
  const raw = await AsyncStorage.getItem(storageKey(dateKey));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as StoredOverrides;
    if (!parsed || parsed.dateKey !== dateKey || typeof parsed.items !== 'object' || !parsed.items) return {};
    return parsed.items ?? {};
  } catch {
    return {};
  }
}

async function saveAutopilotOverrides(dateKey: string, items: Record<string, AutopilotItemOverride>) {
  const payload: StoredOverrides = { dateKey, items };
  await AsyncStorage.setItem(storageKey(dateKey), JSON.stringify(payload));
}

export async function setAutopilotItemOverride(params: {
  now: Date;
  itemKey: string;
  patch: AutopilotItemOverride;
}): Promise<Record<string, AutopilotItemOverride>> {
  const { now, itemKey, patch } = params;
  const dateKey = formatDateKey(now);
  const current = await loadAutopilotOverrides(now);

  const prev = current[itemKey] ?? {};
  const next: AutopilotItemOverride = { ...prev, ...patch };

  // Cleanups: if skipped, no need to keep other constraints, but harmless.
  // If snoozedUntil is in the past, remove it.
  if (typeof next.snoozedUntil === 'number' && next.snoozedUntil <= now.getTime()) {
    delete next.snoozedUntil;
  }

  const updated = { ...current, [itemKey]: next };
  await saveAutopilotOverrides(dateKey, updated);
  return updated;
}

export async function clearAutopilotItemOverride(params: {
  now: Date;
  itemKey: string;
}): Promise<Record<string, AutopilotItemOverride>> {
  const { now, itemKey } = params;
  const dateKey = formatDateKey(now);
  const current = await loadAutopilotOverrides(now);
  if (!current[itemKey]) return current;

  const updated = { ...current };
  delete updated[itemKey];
  await saveAutopilotOverrides(dateKey, updated);
  return updated;
}