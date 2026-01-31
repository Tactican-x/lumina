/**
 * useHabits Hook
 * Convenient hook for habit-related operations
 */

import { useCallback, useEffect } from 'react';
import { useHabitStore, HabitWithStats } from '@/stores/habitStore';
import { Habit, HabitCompletion } from '@/types';

export function useHabits() {
  const store = useHabitStore();

  // Auto-fetch on mount if not already loaded
  useEffect(() => {
    if (store.habits.length === 0 && !store.isLoading) {
      store.fetchHabits();
    }
  }, []);

  return {
    // Data
    habits: store.habits,
    todayHabits: store.getTodayHabits(),
    completedToday: store.getCompletedToday(),
    pendingToday: store.getPendingToday(),
    streaksAtRisk: store.getStreaksAtRisk(),
    highImpactHabits: store.getHighImpactHabits(),
    
    // State
    isLoading: store.isLoading,
    error: store.error,

    // Actions
    refresh: store.fetchHabits,
    getById: store.getHabitById,
    create: store.createHabit,
    update: store.updateHabit,
    remove: store.deleteHabit,
    complete: store.completeHabit,
    uncomplete: store.uncompleteHabit,
    reorder: store.reorderHabits,

    // Stats
    todayProgress: {
      completed: store.getCompletedToday().length,
      total: store.getTodayHabits().length,
      percentage: store.getTodayHabits().length > 0
        ? Math.round((store.getCompletedToday().length / store.getTodayHabits().length) * 100)
        : 0,
    },
  };
}

/**
 * Hook for a single habit
 */
export function useHabit(habitId: string) {
  const store = useHabitStore();
  const habit = store.getHabitById(habitId);

  const complete = useCallback(
    (data?: Partial<HabitCompletion>) => store.completeHabit(habitId, data),
    [habitId]
  );

  const uncomplete = useCallback(
    () => store.uncompleteHabit(habitId),
    [habitId]
  );

  const update = useCallback(
    (data: Partial<Habit>) => store.updateHabit(habitId, data),
    [habitId]
  );

  const remove = useCallback(
    () => store.deleteHabit(habitId),
    [habitId]
  );

  const refresh = useCallback(
    () => store.refreshHabit(habitId),
    [habitId]
  );

  return {
    habit,
    isLoading: store.isLoading,
    error: store.error,
    complete,
    uncomplete,
    update,
    remove,
    refresh,
  };
}

/**
 * Hook for habit completions
 */
export function useHabitCompletions(habitId: string) {
  const store = useHabitStore();
  const habit = store.getHabitById(habitId);

  return {
    completedToday: habit?.completedToday ?? false,
    currentStreak: habit?.streak.currentStreak ?? 0,
    longestStreak: habit?.streak.longestStreak ?? 0,
    completionRate: habit?.completionRate ?? 0,
    lastCompleted: habit?.streak.lastCompletedDate ?? null,
  };
}
