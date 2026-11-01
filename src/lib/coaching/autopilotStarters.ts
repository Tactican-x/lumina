// src/lib/coaching/autopilotStarters.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDateKey } from '@/utils/date';

export type AutopilotStarter = {
  id: string;        // stable per day + task (no Date.now)
  dateKey: string;   // YYYY-MM-DD
  taskId: string;
  taskTitle: string;

  title: string;     // "Starter: <task>"
  minutes: number;   // 5–10
  instructions: string;

  createdAt: number;   // ms
  completedAt?: number; // ms
};

const KEY_PREFIX = 'lumina:autopilot:starters:v1';

function storageKey(dateKey: string) {
  return `${KEY_PREFIX}:${dateKey}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function loadStarters(now: Date): Promise<AutopilotStarter[]> {
  const dateKey = formatDateKey(now);
  const raw = await AsyncStorage.getItem(storageKey(dateKey));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AutopilotStarter[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => s && s.dateKey === dateKey);
  } catch {
    return [];
  }
}

async function saveStarters(dateKey: string, starters: AutopilotStarter[]) {
  await AsyncStorage.setItem(storageKey(dateKey), JSON.stringify(starters));
}

/**
 * Upsert starter for a task (at most 1 starter per task per day).
 * Id is deterministic: `${dateKey}:task:${taskId}`
 */
export async function upsertStarterForTask(params: {
  now: Date;
  taskId: string;
  taskTitle: string;
  minutes?: number;        // default computed
  instructions?: string;   // optional override
}): Promise<AutopilotStarter[]> {
  const { now, taskId, taskTitle } = params;

  const dateKey = formatDateKey(now);
  const starters = await loadStarters(now);

  const id = `${dateKey}:task:${taskId}`;

  const minutes = clamp(Math.round(params.minutes ?? 8), 5, 10);
  const title = `Starter: ${taskTitle}`;
  const instructions =
    params.instructions ??
    'Set a timer. Do the very first step only (open the doc, outline 3 bullets, or write the first sentence).';

  const existing = starters.find((s) => s.id === id);

  const next: AutopilotStarter = existing
    ? {
        ...existing,
        taskTitle,
        title,
        minutes,
        instructions,
        // keep createdAt if it already existed
      }
    : {
        id,
        dateKey,
        taskId,
        taskTitle,
        title,
        minutes,
        instructions,
        createdAt: now.getTime(),
      };

  const updated = [
    // remove old version if any
    ...starters.filter((s) => s.id !== id),
    next,
  ].sort((a, b) => a.createdAt - b.createdAt);

  await saveStarters(dateKey, updated);
  return updated;
}

export async function completeStarter(params: { now: Date; starterId: string }): Promise<AutopilotStarter[]> {
  const { now, starterId } = params;
  const dateKey = formatDateKey(now);
  const starters = await loadStarters(now);

  const updated = starters.map((s) =>
    s.id === starterId ? { ...s, completedAt: now.getTime() } : s
  );

  await saveStarters(dateKey, updated);
  return updated;
}

export async function deleteStarter(params: { now: Date; starterId: string }): Promise<AutopilotStarter[]> {
  const { now, starterId } = params;
  const dateKey = formatDateKey(now);
  const starters = await loadStarters(now);

  const updated = starters.filter((s) => s.id !== starterId);
  await saveStarters(dateKey, updated);
  return updated;
}