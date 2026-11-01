// src/hooks/useAutopilotPlan.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Task } from '@/types';

import { useHabits } from '@/hooks/useHabits';
import { useTasks } from '@/hooks/useTasks';
import { useEnergy, useEnergyPatterns } from '@/hooks/useEnergy';

import {
  generateAutopilotPlan,
  type AutopilotPlan,
  type AutopilotPlannedItem,
  type AutopilotBlockId,
} from '@/lib/coaching/autopilotPlan';

import {
  computeAndMaybeDeliverNudges,
  dismissNudge as dismissNudgePersisted,
  type AutopilotNudge,
} from '@/lib/coaching/autopilotNudges';

import {
  loadAutopilotOverrides,
  setAutopilotItemOverride,
  clearAutopilotItemOverride,
  type AutopilotItemOverride,
} from '@/lib/coaching/autopilotOverrides';

import {
  loadStarters,
  upsertStarterForTask,
  completeStarter,
  type AutopilotStarter,
} from '@/lib/coaching/autopilotStarters';

import { computeAutopilotLearnedPrefs, logAutopilotOutcome } from '@/lib/coaching/autopilotOutcomes';

import { loadAutopilotPrefs, type AutopilotPrefs } from '@/lib/coaching/autopilotPrefs';

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const x of items) map.set(x.id, x);
  return [...map.values()];
}

export function useAutopilotPlan() {
  const { todayHabits, complete: completeHabit, refresh: refreshHabits } = useHabits();
  const { todayTasks, complete: completeTask, getOverdue, refresh: refreshTasks } = useTasks();
  const { currentScore, refresh: refreshEnergy } = useEnergy();
  const { hourlyPattern } = useEnergyPatterns();

  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [plan, setPlan] = useState<AutopilotPlan | null>(null);
  const [nudges, setNudges] = useState<AutopilotNudge[]>([]);
  const [overrides, setOverrides] = useState<Record<string, AutopilotItemOverride>>({});
  const [starters, setStarters] = useState<AutopilotStarter[]>([]);
  const [prefs, setPrefs] = useState<AutopilotPrefs | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prefsUpdatedAtRef = useRef<number>(0);

  const energyByHour = useMemo(() => {
    const map: Record<number, number> = {};
    for (const h of hourlyPattern) map[h.hour] = h.avgScore;
    for (let i = 0; i < 24; i++) if (map[i] == null) map[i] = 50;
    return map;
  }, [hourlyPattern]);

  const streakRiskCount = useMemo(() => {
    const hour = new Date().getHours();
    return todayHabits.filter((h) => {
      const streak = h.streak?.currentStreak ?? 0;
      if (streak <= 0) return false;
      if (h.completedToday) return false;

      if (h.timeOfDay === 'morning') return hour >= 12;
      if (h.timeOfDay === 'afternoon') return hour >= 17;
      if (h.timeOfDay === 'evening') return hour >= 20;
      return hour >= 20;
    }).length;
  }, [todayHabits]);

  // Refs avoid dependency loops
  const habitsRef = useRef(todayHabits);
  const tasksRef = useRef(todayTasks);
  const energyRef = useRef(energyByHour);
  const streakRiskRef = useRef(streakRiskCount);

  useEffect(() => void (habitsRef.current = todayHabits), [todayHabits]);
  useEffect(() => void (tasksRef.current = todayTasks), [todayTasks]);
  useEffect(() => void (energyRef.current = energyByHour), [energyByHour]);
  useEffect(() => void (streakRiskRef.current = streakRiskCount), [streakRiskCount]);

  const recompute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();

      const [loadedOverrides, loadedStarters, learned, loadedPrefs] = await Promise.all([
        loadAutopilotOverrides(now),
        loadStarters(now),
        computeAutopilotLearnedPrefs({ now, days: 14 }),
        loadAutopilotPrefs(),
      ]);

      setOverrides(loadedOverrides);
      setStarters(loadedStarters);
      setPrefs(loadedPrefs);
      prefsUpdatedAtRef.current = loadedPrefs.updatedAt;

      let overdue: Task[] = [];
      try {
        overdue = await getOverdue();
      } catch {
        overdue = [];
      }
      setOverdueTasks(overdue);

      const tasksForPlanner = dedupeById([...tasksRef.current, ...overdue]);

      const nextPlan = generateAutopilotPlan({
        habits: habitsRef.current as any,
        tasks: tasksForPlanner,
        energyByHour: energyRef.current,
        now,
        overrides: loadedOverrides,
        starters: loadedStarters,
        learned,
        limits: {
          maxMainItems: loadedPrefs.planMainMaxItems,
          maxStarters: loadedPrefs.starterMaxItems,
          maxOverdueRescue: 3,
        },
      });

      setPlan(nextPlan);

      const { nudges: centerNudges } = await computeAndMaybeDeliverNudges({
        plan: nextPlan,
        now,
        streakRiskCount: streakRiskRef.current,
        prefs: loadedPrefs,
      });

      setNudges(centerNudges);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate Autopilot Plan');
    } finally {
      setIsLoading(false);
    }
  }, [getOverdue]);

  useEffect(() => {
    recompute();
    const id = setInterval(recompute, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [recompute]);

  // Recompute when data content changes (stable signatures)
  const habitsSig = useMemo(
    () =>
      todayHabits
        .map((h) => `${h.id}:${h.completedToday ? 1 : 0}:${h.streak?.currentStreak ?? 0}`)
        .join('|'),
    [todayHabits]
  );

  const tasksSig = useMemo(
    () => todayTasks.map((t) => `${t.id}:${t.status}:${t.priority}`).join('|'),
    [todayTasks]
  );

  const energySig = useMemo(() => hourlyPattern.map((h) => h.avgScore).join(','), [hourlyPattern]);

  useEffect(() => {
    const t = setTimeout(() => {
      recompute();
    }, 150);
    return () => clearTimeout(t);
  }, [habitsSig, tasksSig, energySig, recompute]);

  // Poll prefs changes so settings apply immediately
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const p = await loadAutopilotPrefs();
        if (p.updatedAt !== prefsUpdatedAtRef.current) {
          prefsUpdatedAtRef.current = p.updatedAt;
          setPrefs(p);
          recompute();
        }
      } catch {}
    }, 10_000);

    return () => clearInterval(id);
  }, [recompute]);

  const refresh = useCallback(async () => {
    await Promise.allSettled([refreshHabits(), refreshTasks(), refreshEnergy()]);
    await recompute();
  }, [refreshHabits, refreshTasks, refreshEnergy, recompute]);

  const completePlannedItem = useCallback(
    async (item: AutopilotPlannedItem) => {
      const now = new Date();

      if (item.kind === 'habit') {
        await completeHabit(item.id);
      } else if (item.kind === 'task') {
        await completeTask(item.id);
      } else {
        await completeStarter({ now, starterId: item.id });
      }

      await logAutopilotOutcome({
        now,
        item,
        action: 'complete',
        energyScore: currentScore,
        parentTaskId: item.kind === 'starter' ? item.parentTaskId : undefined,
      });

      await refresh();
    },
    [completeHabit, completeTask, refresh, currentScore]
  );

  const skipToday = useCallback(
    async (item: AutopilotPlannedItem) => {
      const now = new Date();

      await setAutopilotItemOverride({ now, itemKey: item.key, patch: { skipped: true } });

      await logAutopilotOutcome({ now, item, action: 'skip_today', energyScore: currentScore });

      await recompute();
    },
    [recompute, currentScore]
  );

  const snoozeMinutes = useCallback(
    async (item: AutopilotPlannedItem, minutes: number) => {
      const now = new Date();
      const until = now.getTime() + minutes * 60_000;

      await setAutopilotItemOverride({
        now,
        itemKey: item.key,
        patch: { skipped: false, snoozedUntil: until },
      });

      await logAutopilotOutcome({ now, item, action: 'snooze', minutes, energyScore: currentScore });

      await recompute();
    },
    [recompute, currentScore]
  );

  const moveToBlock = useCallback(
    async (item: AutopilotPlannedItem, blockId: AutopilotBlockId) => {
      const now = new Date();

      await setAutopilotItemOverride({
        now,
        itemKey: item.key,
        patch: { skipped: false, pinnedBlockId: blockId },
      });

      await logAutopilotOutcome({ now, item, action: 'move_block', blockId, energyScore: currentScore });

      await recompute();
    },
    [recompute, currentScore]
  );

  const makeMinimum = useCallback(
    async (item: AutopilotPlannedItem) => {
      if (item.kind !== 'habit') return;

      const now = new Date();

      await setAutopilotItemOverride({
        now,
        itemKey: item.key,
        patch: { skipped: false, forceMinimum: true },
      });

      await logAutopilotOutcome({ now, item, action: 'force_minimum', energyScore: currentScore });

      await recompute();
    },
    [recompute, currentScore]
  );

  const clearOverride = useCallback(
    async (item: AutopilotPlannedItem) => {
      const now = new Date();
      await clearAutopilotItemOverride({ now, itemKey: item.key });
      await recompute();
    },
    [recompute]
  );

  const startSmallTask = useCallback(
    async (taskItem: AutopilotPlannedItem) => {
      if (taskItem.kind !== 'task') return;

      const now = new Date();
      const suggestion = taskItem.starterSuggestion;
      const minutes = suggestion?.minutes ?? 8;
      const instructions = suggestion?.instructions;

      await upsertStarterForTask({
        now,
        taskId: taskItem.id,
        taskTitle: taskItem.title,
        minutes,
        instructions,
      });

      // Snooze full task for 1 hour
      await setAutopilotItemOverride({
        now,
        itemKey: taskItem.key,
        patch: { skipped: false, snoozedUntil: now.getTime() + 60 * 60 * 1000 },
      });

      await logAutopilotOutcome({ now, item: taskItem, action: 'start_small', minutes, energyScore: currentScore });

      await recompute();
    },
    [recompute, currentScore]
  );

  const dismissNudge = useCallback(async (id: string) => {
    const now = new Date();
    await dismissNudgePersisted(now, id);
    setNudges((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return {
    plan,
    nudges,
    overrides,
    starters,
    prefs,
    overdueTasks,
    currentEnergyScore: currentScore,

    isLoading,
    error,

    refresh,
    completePlannedItem,
    dismissNudge,

    skipToday,
    snoozeMinutes,
    moveToBlock,
    makeMinimum,
    clearOverride,

    startSmallTask,
  };
}