// src/lib/coaching/autopilotPlan.ts
import type { Task, TaskPriority } from '@/types';
import type { EnergyLevel, TimeOfDay } from '@/types/habit';
import { formatDateKey } from '@/utils/date';

import type { AutopilotItemOverride } from '@/lib/coaching/autopilotOverrides';
import type { AutopilotStarter } from '@/lib/coaching/autopilotStarters';
import type { AutopilotLearnedPrefs } from '@/lib/coaching/autopilotOutcomes';

export type AutopilotBlockId = 'morning' | 'afternoon' | 'evening';
export type AutopilotItemKind = 'habit' | 'task' | 'starter';

export type EnergyByHour = Record<number, number>; // 0..23 -> 0..100

export interface PlannerHabitLike {
  id: string;
  name: string;
  description?: string;
  timeOfDay: TimeOfDay;
  energyRequired: EnergyLevel;
  reminderTime?: string | null;
  completedToday?: boolean;
  streak?: {
    currentStreak: number;
    lastCompletedDate?: string | null;
  };
}

export interface MinimumVersion {
  title: string;
  minutes: number;
  instructions: string;
}

export interface StarterSuggestion {
  minutes: number; // 5–10
  title: string;
  instructions: string;
}

export interface AutopilotPlannedItem {
  key: string; // habit:ID | task:ID | starter:ID
  kind: AutopilotItemKind;
  id: string;

  title: string;
  description?: string;

  minutes: number;
  energyRequired: 'low' | 'medium' | 'high';

  scheduledHour: number; // 0..23
  blockId: AutopilotBlockId;

  why: string[];

  minimumVersion?: MinimumVersion;
  streakProtect?: boolean;

  priority?: TaskPriority;
  dueAt?: Date | null;
  overdue?: boolean;

  parentTaskId?: string;

  starterSuggestion?: StarterSuggestion;
}

export interface AutopilotBlock {
  id: AutopilotBlockId;
  label: string;
  startHour: number;
  endHour: number;
  items: AutopilotPlannedItem[];
}

export interface AutopilotPlan {
  dateKey: string;
  createdAt: Date;

  energy: {
    peakHour: number;
    troughHour: number;
  };

  overdueRescue: AutopilotPlannedItem[];
  blocks: AutopilotBlock[];
  nextUp: AutopilotPlannedItem | null;

  meta: {
    totalPlannedCount: number;
    mainPlannedCount: number;
  };
}

export function generateAutopilotPlan(params: {
  habits: PlannerHabitLike[];
  tasks: Task[];
  energyByHour: EnergyByHour;
  now: Date;
  overrides?: Record<string, AutopilotItemOverride>;
  starters?: AutopilotStarter[];
  learned?: AutopilotLearnedPrefs;

  limits?: {
    maxMainItems?: number;
    maxStarters?: number;
    maxOverdueRescue?: number;
  };
}): AutopilotPlan {
  const { habits, tasks, energyByHour, now, overrides = {}, starters = [], learned } = params;

  const maxMain = clamp(params.limits?.maxMainItems ?? 7, 5, 12);
  const maxStarters = clamp(params.limits?.maxStarters ?? 2, 0, 3);
  const maxOverdue = clamp(params.limits?.maxOverdueRescue ?? 3, 1, 3);

  const dateKey = formatDateKey(now);
  const nowHour = now.getHours();

  const blocks: AutopilotBlock[] = [
    { id: 'morning', label: 'Morning', startHour: 6, endHour: 12, items: [] },
    { id: 'afternoon', label: 'Afternoon', startHour: 12, endHour: 17, items: [] },
    { id: 'evening', label: 'Evening', startHour: 17, endHour: 22, items: [] },
  ];

  const energyStats = getEnergyStats(energyByHour);

  // Starters
  const starterCandidates = starters
    .filter((s) => s?.dateKey === dateKey && !s.completedAt)
    .filter((s) => !overrides[`starter:${s.id}`]?.skipped)
    .filter((s) => {
      const o = overrides[`starter:${s.id}`];
      return !(typeof o?.snoozedUntil === 'number' && o.snoozedUntil > now.getTime());
    })
    .sort((a, b) => a.createdAt - b.createdAt);

  const starterItemsScored = starterCandidates.map((s) =>
    scoreAndScheduleStarter(s, energyByHour, now, blocks, overrides[`starter:${s.id}`])
  );

  // Overdue Rescue
  const { overdue, notOverdue } = partitionTasksByOverdue(tasks, now);

  const overdueFiltered = overdue.filter((t) => {
    const key = `task:${t.id}`;
    const o = overrides[key];
    if (o?.skipped) return false;
    if (typeof o?.snoozedUntil === 'number' && o.snoozedUntil > now.getTime()) return false;
    return true;
  });

  const overdueRescueTasks = pickOverdueRescue(overdueFiltered, maxOverdue).map((t) =>
    plannedTask({
      task: t,
      now,
      forced: {
        scheduledHour: clampHour(nowHour),
        blockId: hourToBlockId(clampHour(nowHour), blocks),
        overdue: true,
        why: [
          'Overdue Rescue: keep this list small to avoid overwhelm.',
          'Smallest/highest priority overdue tasks first.',
        ],
      },
      override: overrides[`task:${t.id}`],
      blocks,
    })
  );

  // Candidates
  const habitCandidates = habits
    .filter((h) => !!h && !h.completedToday)
    .filter((h) => !overrides[`habit:${h.id}`]?.skipped)
    .sort(stableBy((h) => h.id));

  const taskCandidates = notOverdue
    .filter((t) => t.status === 'pending' || t.status === 'in_progress')
    .filter((t) => !overrides[`task:${t.id}`]?.skipped)
    .filter((t) => {
      const o = overrides[`task:${t.id}`];
      return !(typeof o?.snoozedUntil === 'number' && o.snoozedUntil > now.getTime());
    })
    .sort(stableBy((t) => t.id));

  const habitItemsScored = habitCandidates.map((h) =>
    scoreAndScheduleHabit(
      h,
      energyByHour,
      now,
      blocks,
      overrides[`habit:${h.id}`],
      learned?.habitTimingById?.[h.id],
      learned?.habitBlockById?.[h.id],
      learned?.habitMinimumById?.[h.id]
    )
  );

  const taskItemsScored = taskCandidates.map((t) =>
    scoreAndScheduleTask(
      t,
      energyByHour,
      now,
      blocks,
      overrides[`task:${t.id}`],
      learned?.taskStarterMinutesAvg?.minutes,
      learned?.longTaskPattern
    )
  );

  // Selection
  const MAX_MAIN = maxMain;
  const selected: AutopilotPlannedItem[] = [];

  // Starters first (user initiated)
  for (const s of starterItemsScored
    .sort((a, b) => b.score - a.score || a.item.key.localeCompare(b.item.key))
    .slice(0, maxStarters)
    .map((x) => x.item)) {
    if (selected.length >= MAX_MAIN) break;
    selected.push(s);
  }

  // Streak protection habits
  const streakProtectHabits = habitItemsScored
    .filter((x) => x.item.streakProtect)
    .sort((a, b) => b.score - a.score || a.item.key.localeCompare(b.item.key))
    .slice(0, 3)
    .map((x) => x.item);

  for (const h of streakProtectHabits) {
    if (selected.length >= MAX_MAIN) break;
    selected.push(h);
  }

  // Top tasks
  const topTasks = taskItemsScored
    .sort((a, b) => b.score - a.score || a.item.key.localeCompare(b.item.key))
    .slice(0, 3)
    .map((x) => x.item);

  for (const t of topTasks) {
    if (selected.length >= MAX_MAIN) break;
    selected.push(t);
  }

  // Fill remaining
  const pool = [...starterItemsScored, ...habitItemsScored, ...taskItemsScored]
    .sort((a, b) => b.score - a.score || a.item.key.localeCompare(b.item.key))
    .map((x) => x.item);

  const seenKeys = new Set(selected.map((i) => i.key));
  for (const item of pool) {
    if (selected.length >= MAX_MAIN) break;
    if (seenKeys.has(item.key)) continue;
    selected.push(item);
    seenKeys.add(item.key);
  }

  const mainItems = selected.slice(0, MAX_MAIN);

  // Put into blocks
  for (const item of mainItems) {
    const b = blocks.find((bb) => bb.id === item.blockId);
    if (b) b.items.push(item);
  }
  for (const b of blocks) {
    b.items.sort((a, c) => a.scheduledHour - c.scheduledHour || a.title.localeCompare(c.title));
  }

  const allMainInOrder = blocks.flatMap((b) => b.items).sort((a, b) => a.scheduledHour - b.scheduledHour);

  const nextUp = pickNextUp({
    nowHour,
    energyNow: energyByHour[nowHour] ?? 50,
    overdueRescue: overdueRescueTasks,
    main: allMainInOrder,
  });

  const totalPlannedCount = overdueRescueTasks.length + allMainInOrder.length;

  return {
    dateKey,
    createdAt: now,
    energy: energyStats,
    overdueRescue: overdueRescueTasks,
    blocks,
    nextUp,
    meta: {
      totalPlannedCount,
      mainPlannedCount: allMainInOrder.length,
    },
  };
}

/* --------------------------------- helpers -------------------------------- */

function stableBy<T>(key: (t: T) => string) {
  return (a: T, b: T) => key(a).localeCompare(key(b));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function clampHour(h: number) {
  return clamp(h, 0, 23);
}

function clampWorkHour(h: number) {
  return clamp(h, 6, 21);
}

function getEnergyStats(energyByHour: EnergyByHour): { peakHour: number; troughHour: number } {
  let peakHour = 10;
  let troughHour = 14;
  let best = -Infinity;
  let worst = Infinity;

  for (let hour = 0; hour < 24; hour++) {
    const v = energyByHour[hour] ?? 50;
    if (v > best) {
      best = v;
      peakHour = hour;
    }
    if (v < worst) {
      worst = v;
      troughHour = hour;
    }
  }
  return { peakHour, troughHour };
}

function hourToBlockId(hour: number, blocks: AutopilotBlock[]): AutopilotBlockId {
  const b =
    blocks.find((x) => hour >= x.startHour && hour < x.endHour) ??
    (hour < blocks[0].startHour ? blocks[0] : blocks[blocks.length - 1]);
  return b.id;
}

function hoursInBlock(block: AutopilotBlock): number[] {
  const hours: number[] = [];
  for (let h = block.startHour; h < block.endHour; h++) hours.push(h);
  return hours;
}

function parseReminderHour(reminderTime?: string | null): number | null {
  if (!reminderTime) return null;
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(reminderTime.trim());
  if (!m) return null;
  return Number(m[1]);
}

function preferredBlocksForTimeOfDay(timeOfDay: TimeOfDay): AutopilotBlockId[] {
  switch (timeOfDay) {
    case 'morning':
      return ['morning'];
    case 'afternoon':
      return ['afternoon'];
    case 'evening':
      return ['evening'];
    case 'anytime':
    default:
      return ['morning', 'afternoon', 'evening'];
  }
}

function energyMatch(required: 'low' | 'medium' | 'high', energyScore: number): number {
  const e = clamp(energyScore, 0, 100);
  if (required === 'high') return clamp((e - 55) / 45, 0, 1);
  if (required === 'low') return clamp((70 - e) / 70, 0, 1);
  return clamp(1 - Math.abs(e - 60) / 60, 0, 1);
}

function taskPriorityWeight(p: TaskPriority): number {
  switch (p) {
    case 'urgent':
      return 30;
    case 'high':
      return 20;
    case 'medium':
      return 10;
    case 'low':
    default:
      return 0;
  }
}

function defaultHabitMinutes(required: 'low' | 'medium' | 'high'): number {
  if (required === 'high') return 15;
  if (required === 'medium') return 10;
  return 5;
}

function minimumVersionForHabit(h: PlannerHabitLike): MinimumVersion {
  const required = h.energyRequired as 'low' | 'medium' | 'high';
  const minutes = required === 'high' ? 5 : required === 'medium' ? 3 : 2;
  return {
    title: `Minimum version (${minutes}m)`,
    minutes,
    instructions: 'Set a timer. Do the first tiny step only. The goal is consistency, not intensity.',
  };
}

function isStreakProtect(h: PlannerHabitLike, now: Date): boolean {
  const streak = h.streak?.currentStreak ?? 0;
  if (streak <= 0) return false;

  const hour = now.getHours();
  if (h.timeOfDay === 'morning') return hour >= 12;
  if (h.timeOfDay === 'afternoon') return hour >= 17;
  if (h.timeOfDay === 'evening') return hour >= 20;
  return hour >= 20;
}

function minHourFromSnooze(override: AutopilotItemOverride | undefined, now: Date): number | null {
  const ts = override?.snoozedUntil;
  if (typeof ts !== 'number') return null;
  if (ts <= now.getTime()) return null;
  const d = new Date(ts);
  return clampWorkHour(d.getHours());
}

function applyHourConstraints(params: {
  hours: number[];
  now: Date;
  override?: AutopilotItemOverride;
  blocks: AutopilotBlock[];
}): { hours: number[]; pinnedWhy?: string } {
  const { hours, now, override, blocks } = params;

  let constrained = [...hours].map(clampHour);

  if (override?.pinnedBlockId) {
    const b = blocks.find((x) => x.id === override.pinnedBlockId);
    if (b) {
      const blockHours = new Set(hoursInBlock(b));
      constrained = constrained.filter((h) => blockHours.has(h));
      return { hours: constrained, pinnedWhy: `Moved to ${b.label}.` };
    }
  }

  const minH = minHourFromSnooze(override, now);
  if (minH != null) constrained = constrained.filter((h) => h >= minH);

  constrained = constrained.filter((h) => h >= 6 && h <= 21);
  return { hours: constrained };
}

function uniqueHours(hours: number[]) {
  const s = new Set<number>();
  for (const h of hours) s.add(clampHour(h));
  return [...s].sort((a, b) => a - b);
}

function range(start: number, endInclusive: number) {
  const out: number[] = [];
  for (let i = start; i <= endInclusive; i++) out.push(i);
  return out;
}

function buildStarterSuggestion(taskTitle: string, taskMinutes: number, learnedMinutes?: number): StarterSuggestion {
  const minutes =
    typeof learnedMinutes === 'number'
      ? clamp(Math.round(learnedMinutes), 5, 10)
      : clamp(Math.round(taskMinutes * 0.15), 5, 10);

  return {
    minutes,
    title: `Start small (${minutes}m)`,
    instructions: `Set a ${minutes}-minute timer. Do only the first step for "${taskTitle}". Stop when the timer ends.`,
  };
}

function scoreAndScheduleStarter(
  starter: AutopilotStarter,
  energyByHour: EnergyByHour,
  now: Date,
  blocks: AutopilotBlock[],
  override?: AutopilotItemOverride
): { item: AutopilotPlannedItem; score: number } {
  const nowHour = clampHour(now.getHours());
  const baseHours = uniqueHours([nowHour, nowHour + 1, nowHour + 2]);

  const constrained = applyHourConstraints({ hours: baseHours, now, override, blocks });
  const candidateHours = constrained.hours.length ? constrained.hours : baseHours;

  const required: AutopilotPlannedItem['energyRequired'] = 'low';

  let bestHour = candidateHours[0] ?? nowHour;
  let bestScore = -Infinity;

  for (const hour of candidateHours) {
    const e = energyByHour[hour] ?? 50;
    const eMatch = energyMatch(required, e);
    const soonBoost = hour === nowHour ? 1 : hour === nowHour + 1 ? 0.75 : 0.5;
    const score = eMatch * 25 + soonBoost * 30 + 50;
    if (score > bestScore) {
      bestScore = score;
      bestHour = hour;
    }
  }

  const bId = hourToBlockId(bestHour, blocks);

  const why: string[] = [
    'Starter step: reduce friction and build momentum.',
    `Small enough to finish (~${starter.minutes}m).`,
  ];
  if (constrained.pinnedWhy) why.push(constrained.pinnedWhy);

  const item: AutopilotPlannedItem = {
    key: `starter:${starter.id}`,
    kind: 'starter',
    id: starter.id,
    parentTaskId: starter.taskId,
    title: starter.title,
    description: starter.instructions,
    minutes: starter.minutes,
    energyRequired: required,
    scheduledHour: bestHour,
    blockId: bId,
    why,
  };

  return { item, score: bestScore };
}

function scoreAndScheduleHabit(
  habit: PlannerHabitLike,
  energyByHour: EnergyByHour,
  now: Date,
  blocks: AutopilotBlock[],
  override?: AutopilotItemOverride,
  learnedTiming?: { hour: number; n: number },
  learnedBlock?: { blockId: AutopilotBlockId; n: number },
  learnedMinimum?: { threshold: number; n: number }
): { item: AutopilotPlannedItem; score: number } {
  const preferredBlockIds = preferredBlocksForTimeOfDay(habit.timeOfDay);
  const preferredHours = blocks
    .filter((b) => preferredBlockIds.includes(b.id))
    .flatMap(hoursInBlock);

  const reminderHour = parseReminderHour(habit.reminderTime);

  const learnedHourRaw = learnedTiming?.hour;
  const learnedHour = typeof learnedHourRaw === 'number' ? clampWorkHour(learnedHourRaw) : null;
  const learnedHours = learnedHour != null ? uniqueHours([learnedHour, learnedHour - 1, learnedHour + 1]) : [];

  const learnedBlockHours =
    learnedBlock?.blockId && blocks.find((b) => b.id === learnedBlock.blockId)
      ? hoursInBlock(blocks.find((b) => b.id === learnedBlock.blockId)!)
      : [];

  const baseCandidateHours = uniqueHours([
    ...preferredHours,
    ...(reminderHour != null ? [reminderHour, reminderHour - 1, reminderHour + 1] : []),
    ...learnedHours,
    ...learnedBlockHours,
  ]);

  const constrained = applyHourConstraints({ hours: baseCandidateHours, now, override, blocks });
  const candidateHours = constrained.hours.length ? constrained.hours : preferredHours;

  const required = habit.energyRequired as 'low' | 'medium' | 'high';

  let bestHour = candidateHours[0] ?? 9;
  let bestScore = -Infinity;

  for (const hour of candidateHours) {
    const e = energyByHour[hour] ?? 50;
    const eMatch = energyMatch(required, e);

    const timeMatch = preferredHours.includes(hour) ? 1 : 0.4;
    const streak = habit.streak?.currentStreak ?? 0;
    const streakBoost = streak > 0 ? clamp(streak / 14, 0, 1) : 0;
    const reminderBoost = reminderHour != null && Math.abs(hour - reminderHour) <= 1 ? 0.25 : 0;

    const learnedBoost = learnedHour != null && Math.abs(hour - learnedHour) <= 1 ? 12 : 0;
    const learnedBlockBoost =
      learnedBlock?.blockId && hourToBlockId(hour, blocks) === learnedBlock.blockId ? 10 : 0;

    const score =
      eMatch * 40 +
      timeMatch * 20 +
      streakBoost * 25 +
      reminderBoost * 15 +
      learnedBoost +
      learnedBlockBoost;

    if (score > bestScore) {
      bestScore = score;
      bestHour = hour;
    }
  }

  const bId = hourToBlockId(bestHour, blocks);
  const streakProtect = isStreakProtect(habit, now);

  const why: string[] = [];
  const eScore = energyByHour[bestHour] ?? 50;

  why.push(`Energy fit: ${eScore}% at ${formatHour(bestHour)}.`);
  if (habit.timeOfDay !== 'anytime') why.push(`Matches your ${habit.timeOfDay} preference.`);
  if (reminderHour != null) why.push(`Near your reminder time (${formatHour(reminderHour)}).`);
  if (habit.streak?.currentStreak) why.push(`Streak support: ${habit.streak.currentStreak} days.`);
  if (learnedHour != null) why.push(`Learned timing: usually around ${formatHour(learnedHour)} (n=${learnedTiming?.n}).`);
  if (learnedBlock?.blockId) why.push(`Learned block: usually ${learnedBlock.blockId} (n=${learnedBlock.n}).`);
  if (constrained.pinnedWhy) why.push(constrained.pinnedWhy);

  const minV = minimumVersionForHabit(habit);

  let minutes = defaultHabitMinutes(required);
  let title = habit.name;

  const threshold = learnedMinimum?.threshold;

  if (override?.forceMinimum) {
    minutes = minV.minutes;
    title = `${habit.name} — ${minV.title}`;
    why.push('You chose the minimum version to protect consistency.');
  } else if (typeof threshold === 'number') {
    // v2.1: minimum earlier, especially when streak is at risk
    const streakBias = streakProtect ? 10 : 0;
    const effectiveThreshold = clamp(threshold + streakBias, 30, 80);

    if (eScore < effectiveThreshold) {
      minutes = minV.minutes;
      title = `${habit.name} — ${minV.title}`;
      why.push(`Minimum recommended: your pattern suggests minimum works best below ~${effectiveThreshold}%.`);
    }
  } else if (streakProtect && eScore < 45) {
    // fallback: protect streak on low energy even without learned threshold
    minutes = minV.minutes;
    title = `${habit.name} — ${minV.title}`;
    why.push('Streak protection: energy is low—minimum keeps consistency.');
  }

  const item: AutopilotPlannedItem = {
    key: `habit:${habit.id}`,
    kind: 'habit',
    id: habit.id,
    title,
    description: habit.description,
    minutes,
    energyRequired: required,
    scheduledHour: bestHour,
    blockId: bId,
    why,
    minimumVersion: minV,
    streakProtect,
  };

  const score = bestScore + (streakProtect ? 10 : 0);
  return { item, score };
}

function scoreAndScheduleTask(
  task: Task,
  energyByHour: EnergyByHour,
  now: Date,
  blocks: AutopilotBlock[],
  override?: AutopilotItemOverride,
  learnedStarterMinutes?: number,
  longTaskPattern?: AutopilotLearnedPrefs['longTaskPattern']
): { item: AutopilotPlannedItem; score: number } {
  const required = task.energyRequired ?? 'medium';
  const scheduledHour = getTaskScheduledHour(task, now);

  const baseCandidateHours =
    scheduledHour != null ? uniqueHours([scheduledHour, scheduledHour - 1, scheduledHour + 1]) : range(8, 21);

  const constrained = applyHourConstraints({ hours: baseCandidateHours, now, override, blocks });
  const candidateHours = constrained.hours.length ? constrained.hours : baseCandidateHours;

  let bestHour = candidateHours[0] ?? 10;
  let bestScore = -Infinity;

  for (const hour of candidateHours) {
    const e = energyByHour[clampHour(hour)] ?? 50;
    const eMatch = energyMatch(required, e);

    const priorityBoost = taskPriorityWeight(task.priority);
    const minutes = clamp(task.estimatedMinutes ?? 30, 5, 120);
    const smallnessBoost = minutes <= 20 ? 10 : minutes <= 45 ? 5 : 0;

    const dueAt = coerceDate(task.dueDate);
    const dueUrgency =
      dueAt && isSameCalendarDay(dueAt, now) ? clamp((hour <= 14 ? 1 : 0.6) * 10, 0, 10) : 0;

    const score = eMatch * 40 + priorityBoost + smallnessBoost + dueUrgency;

    if (score > bestScore) {
      bestScore = score;
      bestHour = clampHour(hour);
    }
  }

  const bId = hourToBlockId(bestHour, blocks);

  const eScore = energyByHour[bestHour] ?? 50;
  const why: string[] = [`Energy fit: ${eScore}% at ${formatHour(bestHour)}.`];
  if (task.priority === 'urgent' || task.priority === 'high') why.push(`Priority: ${task.priority}.`);
  const est = clamp(task.estimatedMinutes ?? 30, 5, 120);
  why.push(`Sized to finish: ~${est} min.`);
  if (scheduledHour != null) why.push(`Respects your scheduled time (${formatHour(scheduledHour)}).`);
  const dueAt = coerceDate(task.dueDate);
  if (dueAt) why.push(`Due: ${dueAt.toLocaleDateString()}.`);
  if (constrained.pinnedWhy) why.push(constrained.pinnedWhy);

  const item = plannedTask({
    task,
    now,
    forced: { scheduledHour: bestHour, blockId: bId, why },
    override,
    blocks,
  });

  // Starter suggestion for long tasks (personalized minutes if learned)
  if (item.minutes >= 45) {
    item.starterSuggestion = buildStarterSuggestion(item.title, item.minutes, learnedStarterMinutes);
    if (typeof learnedStarterMinutes === 'number') {
      item.why.push(`Learned starter size: you often start with ~${clamp(Math.round(learnedStarterMinutes), 5, 10)}m.`);
    }
  }

  // v2.1: de-emphasize long tasks when user tends to avoid them unless energy is high
  let score = bestScore;
  if (longTaskPattern?.preferStarters && item.minutes >= 60 && eScore < 70) {
    score -= 8;
    item.why.push('Pattern: big tasks are easier when you start with a small first step.');
  }

  return { item, score };
}

function plannedTask(params: {
  task: Task;
  now: Date;
  forced: Partial<Pick<AutopilotPlannedItem, 'scheduledHour' | 'blockId' | 'why' | 'overdue'>>;
  override?: AutopilotItemOverride;
  blocks: AutopilotBlock[];
}): AutopilotPlannedItem {
  const { task, forced } = params;
  const dueAt = coerceDate(task.dueDate);

  let blockId = forced.blockId ?? 'morning';
  if (params.override?.pinnedBlockId) blockId = params.override.pinnedBlockId;

  return {
    key: `task:${task.id}`,
    kind: 'task',
    id: task.id,
    title: task.title,
    description: task.description,
    minutes: clamp(task.estimatedMinutes ?? 30, 5, 120),
    energyRequired: task.energyRequired ?? 'medium',
    scheduledHour: forced.scheduledHour ?? 10,
    blockId,
    why: forced.why ?? [],
    priority: task.priority,
    dueAt,
    overdue: !!forced.overdue,
  };
}

function getTaskScheduledHour(task: Task, now: Date): number | null {
  const s = coerceDate(task.scheduledFor);
  if (!s) return null;
  if (!isSameCalendarDay(s, now)) return null;
  return s.getHours();
}

function coerceDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}

function isSameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function partitionTasksByOverdue(tasks: Task[], now: Date): { overdue: Task[]; notOverdue: Task[] } {
  const overdue: Task[] = [];
  const notOverdue: Task[] = [];
  const nowTime = now.getTime();

  for (const t of tasks) {
    const due = coerceDate(t.dueDate);
    const isPending = t.status === 'pending' || t.status === 'in_progress';
    const isOverdue = !!due && due.getTime() < nowTime && isPending;
    if (isOverdue) overdue.push(t);
    else notOverdue.push(t);
  }

  return { overdue, notOverdue };
}

function pickOverdueRescue(overdue: Task[], max: number): Task[] {
  const items = [...overdue];

  items.sort((a, b) => {
    const pa = taskPriorityWeight(a.priority);
    const pb = taskPriorityWeight(b.priority);
    if (pb !== pa) return pb - pa;

    const ma = clamp(a.estimatedMinutes ?? 30, 5, 120);
    const mb = clamp(b.estimatedMinutes ?? 30, 5, 120);
    if (ma !== mb) return ma - mb;

    const da = coerceDate(a.dueDate)?.getTime() ?? Infinity;
    const db = coerceDate(b.dueDate)?.getTime() ?? Infinity;
    if (da !== db) return da - db;

    return a.title.localeCompare(b.title);
  });

  return items.slice(0, clamp(max, 1, 3));
}

function pickNextUp(params: {
  nowHour: number;
  energyNow: number;
  overdueRescue: AutopilotPlannedItem[];
  main: AutopilotPlannedItem[];
}): AutopilotPlannedItem | null {
  const { nowHour, energyNow, overdueRescue, main } = params;

  if (overdueRescue.length > 0 && energyNow <= 65) return overdueRescue[0];

  const upcoming = main
    .filter((i) => i.scheduledHour >= nowHour && i.scheduledHour <= nowHour + 2)
    .sort((a, b) => a.scheduledHour - b.scheduledHour);

  if (upcoming.length > 0) return upcoming[0];

  const later = main.filter((i) => i.scheduledHour >= nowHour).sort((a, b) => a.scheduledHour - b.scheduledHour);
  if (later.length > 0) return later[0];

  if (main.length > 0) return main[0];
  if (overdueRescue.length > 0) return overdueRescue[0];

  return null;
}

function formatHour(hour: number) {
  const d = new Date();
  d.setHours(clampHour(hour), 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}