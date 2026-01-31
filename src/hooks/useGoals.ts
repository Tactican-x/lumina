/**
 * useGoals Hook
 * Convenient hook for goal-related operations
 */

import { useCallback, useEffect } from 'react';
import { useGoalStore } from '@/stores/goalStore';
import { Goal, Milestone, GoalWithStats } from '@/types';

export function useGoals() {
  const store = useGoalStore();

  // Auto-fetch on mount if not already loaded
  useEffect(() => {
    if (store.goals.length === 0 && !store.isLoading) {
      store.fetchGoals();
    }
  }, []);

  return {
    // Data
    goals: store.goals,
    activeGoals: store.getActiveGoals(),
    completedGoals: store.getCompletedGoals(),
    goalsAtRisk: store.getGoalsAtRisk(),

    // State
    isLoading: store.isLoading,
    error: store.error,

    // Actions
    refresh: store.fetchGoals,
    getById: store.getGoalById,
    create: store.createGoal,
    update: store.updateGoal,
    remove: store.deleteGoal,
    updateProgress: store.updateProgress,
    getByCategory: store.getGoalsByCategory,

    // Stats
    overallProgress: store.getActiveGoals().length > 0
      ? Math.round(
          store.getActiveGoals().reduce((sum, g) => sum + g.progressPercentage, 0) /
          store.getActiveGoals().length
        )
      : 0,
  };
}

/**
 * Hook for a single goal
 */
export function useGoal(goalId: string) {
  const store = useGoalStore();
  const goal = store.getGoalById(goalId);

  const updateProgress = useCallback(
    (value: number, note?: string) => store.updateProgress(goalId, value, note),
    [goalId]
  );

  const update = useCallback(
    (data: Partial<Goal>) => store.updateGoal(goalId, data),
    [goalId]
  );

  const remove = useCallback(
    () => store.deleteGoal(goalId),
    [goalId]
  );

  const addMilestone = useCallback(
    (data: Omit<Milestone, 'id' | 'goalId'>) => store.addMilestone(goalId, data),
    [goalId]
  );

  return {
    goal,
    milestones: goal?.milestones ?? [],
    isLoading: store.isLoading,
    error: store.error,
    updateProgress,
    update,
    remove,
    addMilestone,
    updateMilestone: store.updateMilestone,
    deleteMilestone: store.deleteMilestone,
  };
}

/**
 * Hook for goal progress
 */
export function useGoalProgress(goalId: string) {
  const store = useGoalStore();
  const goal = store.getGoalById(goalId);

  return {
    currentValue: goal?.currentValue ?? 0,
    targetValue: goal?.targetValue ?? 0,
    percentage: goal?.progressPercentage ?? 0,
    momentum: goal?.momentum ?? 'steady',
    isOnTrack: goal?.isOnTrack ?? true,
    daysRemaining: goal?.daysRemaining ?? null,
    completedMilestones: goal?.milestones.filter(m => m.isCompleted).length ?? 0,
    totalMilestones: goal?.milestones.length ?? 0,
  };
}
