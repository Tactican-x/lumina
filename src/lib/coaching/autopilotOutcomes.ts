// src/lib/coaching/autopilotOutcomes.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDateKey } from '@/utils/date';
import type { AutopilotBlockId, AutopilotPlannedItem } from '@/lib/coaching/autopilotPlan';

export type AutopilotOutcomeAction =
  | 'complete'
  | 'skip_today'
  | 'snooze'
  | 'move_block'
  | 'force_minimum'
  | 'start_small';

export type AutopilotOutcomeEvent = {
  id: string;
  at: number; // ms
  dateKey: string; // YYYY-MM-DD

  itemKey: string; // habit:ID | task:ID | starter:ID
  itemKind: 'habit' | 'task' | 'starter';
  itemId: string;

  action: AutopilotOutcomeAction;

  scheduledHour?: number;
  blockId?: AutopilotBlockId;

  // extras
  minutes?: number; // snooze minutes OR starter minutes
  energyScore?: number; // 0..100 optional context at action time
  parentTaskId?: string; // for starter
  itemMinutes?: number; // planned minutes of the item at action time (optional)
};

export type LearnedHabitTiming = { hour: number; n: number };
export type LearnedHabitBlock = { blockId: AutopilotBlockId; n: number };
export type LearnedHabitMinimum = { threshold: number; n: number };

export type LearnedTaskStarterMinutes = { minutes: number; n: number };
export type LearnedLongTaskPattern = {
  sampleSize: number;
  skipRate: number; // 0..1
  startSmallRate: number; // 0..1
  preferStarters: boolean;
};

export type AutopilotLearnedPrefs = {
  habitTimingById: Record<string, LearnedHabitTiming>;
  habitBlockById: Record<string, LearnedHabitBlock>;
  habitMinimumById: Record<string, LearnedHabitMinimum>;

  taskStarterMinutesAvg?: LearnedTaskStarterMinutes;
  longTaskPattern?: LearnedLongTaskPattern;
};

const KEY = 'lumina:autopilot:outcomes:v1';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function loadOutcomes(): Promise<AutopilotOutcomeEvent[]> {
  const raw = await AsyncStorage.getItem(KEY);
  const arr = safeJsonParse<AutopilotOutcomeEvent[]>(raw, []);
  return Array.isArray(arr) ? arr : [];
}

export async function appendOutcome(event: AutopilotOutcomeEvent): Promise<void> {
  const existing = await loadOutcomes();

  const next = [...existing, event]
    .filter((e) => Date.now() - e.at < 30 * 24 * 60 * 60 * 1000)
    .slice(-1500);

  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function logAutopilotOutcome(params: {
  now: Date;
  item: AutopilotPlannedItem;
  action: AutopilotOutcomeAction;
  energyScore?: number;
  minutes?: number;
  blockId?: AutopilotBlockId;
  parentTaskId?: string;
}): Promise<void> {
  const { now, item, action } = params;

  const event: AutopilotOutcomeEvent = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    at: now.getTime(),
    dateKey: formatDateKey(now),

    itemKey: item.key,
    itemKind: item.kind,
    itemId: item.id,

    action,

    scheduledHour: item.scheduledHour,
    blockId: params.blockId ?? item.blockId,

    minutes: params.minutes,
    energyScore: params.energyScore,
    parentTaskId: params.parentTaskId,

    // NEW (v2.1): capture planned minutes so we can learn "long task" patterns
    itemMinutes: typeof item.minutes === 'number' ? clamp(Math.round(item.minutes), 1, 240) : undefined,
  };

  await appendOutcome(event);
}

/* --------------------------- learning helpers --------------------------- */

function normalizeCompletionHourForPlanning(hour: number): number {
  // Our plan day is mostly 6..21. Late-night completions should map to evening.
  // 22,23,0..5 => 21 (9pm). Keeps learning stable & useful.
  if (hour >= 22) return 21;
  if (hour < 6) return 21;
  return clamp(hour, 6, 21);
}

function blockFromNormalizedHour(hour: number): AutopilotBlockId {
  // hour is already normalized into 6..21
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function modeNumber(xs: number[]): { value: number; n: number } | null {
  if (!xs.length) return null;
  const counts = new Map<number, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);

  let bestValue = xs[0];
  let bestN = -1;

  for (const [v, n] of counts.entries()) {
    if (n > bestN || (n === bestN && v < bestValue)) {
      bestValue = v;
      bestN = n;
    }
  }
  return { value: bestValue, n: bestN };
}

function modeBlock(xs: AutopilotBlockId[]): { value: AutopilotBlockId; n: number } | null {
  if (!xs.length) return null;
  const order: Record<AutopilotBlockId, number> = { morning: 0, afternoon: 1, evening: 2 };
  const counts = new Map<AutopilotBlockId, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);

  let best: AutopilotBlockId = xs[0];
  let bestN = -1;

  for (const [b, n] of counts.entries()) {
    if (n > bestN || (n === bestN && order[b] < order[best])) {
      best = b;
      bestN = n;
    }
  }
  return { value: best, n: bestN };
}

function avg(xs: number[]): number | null {
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Learning v2.1:
 * - Habit timing: mode normalized hour (n>=3)
 * - Habit block: mode normalized block (n>=3)
 * - Habit minimum threshold: from force_minimum + low-energy skips (n>=2)
 * - Task starter minutes avg: average minutes used for start_small (n>=3)
 * - Long task pattern: skip vs complete vs start_small for tasks with itemMinutes>=45
 */
export async function computeAutopilotLearnedPrefs(params: {
  now: Date;
  days?: number;
}): Promise<AutopilotLearnedPrefs> {
  const { now } = params;
  const days = params.days ?? 14;
  const since = now.getTime() - days * 24 * 60 * 60 * 1000;

  const outcomes = await loadOutcomes();
  const recent = outcomes.filter((e) => e.at >= since);

  // --- Habit timing + block preference ---
  const habitHoursById = new Map<string, number[]>();
  const habitBlocksById = new Map<string, AutopilotBlockId[]>();

  for (const e of recent) {
    if (e.itemKind !== 'habit') continue;
    if (e.action !== 'complete') continue;

    const rawHour = new Date(e.at).getHours();
    const hour = normalizeCompletionHourForPlanning(rawHour);
    const block = blockFromNormalizedHour(hour);

    const hs = habitHoursById.get(e.itemId) ?? [];
    hs.push(hour);
    habitHoursById.set(e.itemId, hs);

    const bs = habitBlocksById.get(e.itemId) ?? [];
    bs.push(block);
    habitBlocksById.set(e.itemId, bs);
  }

  const habitTimingById: Record<string, LearnedHabitTiming> = {};
  for (const [habitId, hours] of habitHoursById.entries()) {
    const m = modeNumber(hours);
    if (!m) continue;
    if (m.n < 3) continue;
    habitTimingById[habitId] = { hour: clamp(m.value, 6, 21), n: m.n };
  }

  const habitBlockById: Record<string, LearnedHabitBlock> = {};
  for (const [habitId, blocks] of habitBlocksById.entries()) {
    const m = modeBlock(blocks);
    if (!m) continue;
    if (m.n < 3) continue;
    habitBlockById[habitId] = { blockId: m.value, n: m.n };
  }

  // --- Habit minimum threshold ---
  const habitForceMinEnergyById = new Map<string, number[]>();
  const habitSkipEnergyById = new Map<string, number[]>();

  for (const e of recent) {
    if (e.itemKind !== 'habit') continue;

    if (e.action === 'force_minimum' && typeof e.energyScore === 'number') {
      const arr = habitForceMinEnergyById.get(e.itemId) ?? [];
      arr.push(clamp(e.energyScore, 0, 100));
      habitForceMinEnergyById.set(e.itemId, arr);
    }

    if (e.action === 'skip_today' && typeof e.energyScore === 'number') {
      const arr = habitSkipEnergyById.get(e.itemId) ?? [];
      arr.push(clamp(e.energyScore, 0, 100));
      habitSkipEnergyById.set(e.itemId, arr);
    }
  }

  const habitMinimumById: Record<string, LearnedHabitMinimum> = {};
  const habitIds = new Set<string>([
    ...habitForceMinEnergyById.keys(),
    ...habitSkipEnergyById.keys(),
  ]);

  for (const habitId of habitIds) {
    const forceArr = habitForceMinEnergyById.get(habitId) ?? [];
    const skipArr = habitSkipEnergyById.get(habitId) ?? [];
    const n = forceArr.length + skipArr.length;
    if (n < 2) continue;

    const forceAvg = avg(forceArr);
    const skipAvg = avg(skipArr);

    let threshold: number | null = null;
    if (forceAvg != null) threshold = clamp(Math.round(forceAvg + 5), 30, 70);
    else if (skipAvg != null) threshold = clamp(Math.round(skipAvg + 10), 30, 70);

    if (threshold == null) continue;
    habitMinimumById[habitId] = { threshold, n };
  }

  // --- Task starter minutes avg + long task pattern ---
  const starterMinutes: number[] = [];

  let longSkip = 0;
  let longComplete = 0;
  let longStartSmall = 0;

  for (const e of recent) {
    if (e.action === 'start_small' && typeof e.minutes === 'number') {
      starterMinutes.push(clamp(Math.round(e.minutes), 5, 10));
    }

    if (e.itemKind === 'task' && typeof e.itemMinutes === 'number' && e.itemMinutes >= 45) {
      if (e.action === 'skip_today') longSkip += 1;
      if (e.action === 'complete') longComplete += 1;
      if (e.action === 'start_small') longStartSmall += 1;
    }
  }

  const starterAvg = avg(starterMinutes);
  const taskStarterMinutesAvg =
    starterAvg != null && starterMinutes.length >= 3
      ? { minutes: clamp(Math.round(starterAvg), 5, 10), n: starterMinutes.length }
      : undefined;

  const sampleSize = longSkip + longComplete + longStartSmall;
  const skipRate = sampleSize > 0 ? longSkip / sampleSize : 0;
  const startSmallRate = sampleSize > 0 ? longStartSmall / sampleSize : 0;

  const preferStarters =
    longStartSmall >= 3 || (longSkip >= 3 && sampleSize >= 5 && skipRate >= 0.4);

  const longTaskPattern: LearnedLongTaskPattern | undefined =
    sampleSize >= 5
      ? { sampleSize, skipRate, startSmallRate, preferStarters }
      : undefined;

  return {
    habitTimingById,
    habitBlockById,
    habitMinimumById,
    taskStarterMinutesAvg,
    longTaskPattern,
  };
}