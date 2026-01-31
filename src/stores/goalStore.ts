/**
 * Goal Store
 * Global state management for goals using Zustand
 */

import { create } from 'zustand';
import { Goal, Milestone, GoalProgress, GoalWithStats, MomentumStatus } from '@/types';
import * as goalRepo from '@/db/repositories/goals';
import { daysUntil } from '@/utils/date';

interface GoalState {
  // Data
  goals: GoalWithStats[];
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;

  // Actions
  fetchGoals: () => Promise<void>;
  getGoalById: (id: string) => GoalWithStats | undefined;
  createGoal: (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Goal>;
  updateGoal: (id: string, data: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  updateProgress: (id: string, value: number, note?: string) => Promise<void>;
  
  // Milestone actions
  addMilestone: (goalId: string, data: Omit<Milestone, 'id' | 'goalId'>) => Promise<Milestone>;
  updateMilestone: (id: string, data: Partial<Milestone>) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  
  // Computed
  getActiveGoals: () => GoalWithStats[];
  getCompletedGoals: () => GoalWithStats[];
  getGoalsAtRisk: () => GoalWithStats[];
  getGoalsByCategory: (category: Goal['category']) => GoalWithStats[];
}

export const useGoalStore = create<GoalState>((set, get) => ({
  // Initial state
  goals: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  // Fetch all goals with stats
  fetchGoals: async () => {
    set({ isLoading: true, error: null });

    try {
      const goals = await goalRepo.getAllGoals();

      // Fetch stats for each goal
      const goalsWithStats: GoalWithStats[] = await Promise.all(
        goals.map(async (goal) => {
          const stats = await goalRepo.getGoalWithStats(goal.id);

          if (!stats) {
            return {
              ...goal,
              milestones: [],
              progressPercentage: 0,
              momentum: 'steady' as MomentumStatus,
              successProbability: 50,
              daysRemaining: goal.targetDate ? daysUntil(goal.targetDate) : undefined,
              isOnTrack: true,
            };
          }

          return {
            ...goal,
            milestones: stats.milestones,
            progressPercentage: stats.progressPercent,
            momentum: stats.momentum,
            successProbability: 50, // TODO: Calculate from predictions
            daysRemaining: stats.daysRemaining ?? undefined,
            isOnTrack: stats.isOnTrack,
          };
        })
      );

      set({
        goals: goalsWithStats,
        isLoading: false,
        lastFetched: new Date(),
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch goals',
        isLoading: false,
      });
    }
  },

  // Get goal by ID
  getGoalById: (id: string) => {
    return get().goals.find(g => g.id === id);
  },

  // Create new goal
  createGoal: async (data) => {
    set({ isLoading: true, error: null });

    try {
      const newGoal = await goalRepo.createGoal(data);

      // Auto-generate milestones if target value provided
      if (data.targetValue) {
        await goalRepo.generateMilestones(newGoal.id, data.targetValue, 4);
      }

      await get().fetchGoals();
      return newGoal;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create goal',
        isLoading: false,
      });
      throw error;
    }
  },

  // Update goal
  updateGoal: async (id, data) => {
    set({ isLoading: true, error: null });

    try {
      await goalRepo.updateGoal(id, data);
      await get().fetchGoals();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update goal',
        isLoading: false,
      });
      throw error;
    }
  },

  // Delete goal
  deleteGoal: async (id) => {
    set({ isLoading: true, error: null });

    try {
      await goalRepo.deleteGoal(id);
      set(state => ({
        goals: state.goals.filter(g => g.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete goal',
        isLoading: false,
      });
      throw error;
    }
  },

  // Update progress
  updateProgress: async (id, value, note) => {
    try {
      await goalRepo.updateGoalProgress(id, value, note);

      // Optimistically update local state
      set(state => ({
        goals: state.goals.map(g => {
          if (g.id !== id) return g;

          const newProgress = g.targetValue
            ? Math.round((value / g.targetValue) * 100)
            : 0;

          return {
            ...g,
            currentValue: value,
            progressPercentage: newProgress,
            status: g.targetValue && value >= g.targetValue ? 'completed' : g.status,
          };
        }),
      }));

      // Refresh to get accurate stats
      await get().fetchGoals();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update progress',
      });
      throw error;
    }
  },

  // Add milestone
  addMilestone: async (goalId, data) => {
    try {
      const milestone = await goalRepo.createMilestone({ ...data, goalId });
      await get().fetchGoals();
      return milestone;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add milestone',
      });
      throw error;
    }
  },

  // Update milestone
  updateMilestone: async (id, data) => {
    try {
      await goalRepo.updateMilestone(id, data);
      await get().fetchGoals();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update milestone',
      });
      throw error;
    }
  },

  // Delete milestone
  deleteMilestone: async (id) => {
    try {
      await goalRepo.deleteMilestone(id);
      await get().fetchGoals();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete milestone',
      });
      throw error;
    }
  },

  // Computed: Get active goals
  getActiveGoals: () => {
    return get().goals.filter(g => g.status === 'active');
  },

  // Computed: Get completed goals
  getCompletedGoals: () => {
    return get().goals.filter(g => g.status === 'completed');
  },

  // Computed: Get goals at risk (not on track)
  getGoalsAtRisk: () => {
    return get().goals.filter(g => g.status === 'active' && !g.isOnTrack);
  },

  // Computed: Get goals by category
  getGoalsByCategory: (category) => {
    return get().goals.filter(g => g.category === category);
  },
}));
