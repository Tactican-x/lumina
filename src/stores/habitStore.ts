/**
 * Habit Store
 * Global state management for habits using Zustand
 */

import { create } from 'zustand';
import { Habit, HabitCompletion, HabitStreak, HabitCorrelation } from '@/types';
import * as habitRepo from '@/db/repositories/habits';
import { getTodayKey } from '@/utils/date';

export interface HabitWithStats extends Habit {
  streak: HabitStreak;
  completedToday: boolean;
  correlation?: HabitCorrelation;
  completionRate: number;
}

interface HabitState {
  // Data
  habits: HabitWithStats[];
  todayCompletions: HabitCompletion[];
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;

  // Actions
  fetchHabits: () => Promise<void>;
  getHabitById: (id: string) => HabitWithStats | undefined;
  createHabit: (data: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Habit>;
  updateHabit: (id: string, data: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  completeHabit: (id: string, data?: Partial<HabitCompletion>) => Promise<void>;
  uncompleteHabit: (id: string) => Promise<void>;
  reorderHabits: (orderedIds: string[]) => Promise<void>;
  refreshHabit: (id: string) => Promise<void>;
  
  // Computed
  getActiveHabits: () => HabitWithStats[];
  getTodayHabits: () => HabitWithStats[];
  getCompletedToday: () => HabitWithStats[];
  getPendingToday: () => HabitWithStats[];
  getStreaksAtRisk: () => HabitWithStats[];
  getHighImpactHabits: () => HabitWithStats[];
}

export const useHabitStore = create<HabitState>((set, get) => ({
  // Initial state
  habits: [],
  todayCompletions: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  // Fetch all habits with stats
  fetchHabits: async () => {
    set({ isLoading: true, error: null });

    try {
      const habits = await habitRepo.getActiveHabits();
      const todayCompletions = await habitRepo.getTodayCompletions();
      const completedIds = new Set(todayCompletions.map(c => c.habitId));

      // Fetch stats for each habit
      const habitsWithStats: HabitWithStats[] = await Promise.all(
        habits.map(async (habit) => {
          const [streakData, completionRate] = await Promise.all([
            habitRepo.calculateStreak(habit.id),
            habitRepo.calculateCompletionRate(habit.id, 30),
          ]);

          const streak: HabitStreak = {
            habitId: habit.id,
            currentStreak: streakData.currentStreak,
            longestStreak: streakData.longestStreak,
            lastCompletedDate: streakData.lastCompletedDate,
            totalCompletions: 0, // TODO: Calculate
            completionRate,
          };

          return {
            ...habit,
            streak,
            completedToday: completedIds.has(habit.id),
            completionRate,
          };
        })
      );

      set({
        habits: habitsWithStats,
        todayCompletions,
        isLoading: false,
        lastFetched: new Date(),
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch habits',
        isLoading: false,
      });
    }
  },

  // Get habit by ID
  getHabitById: (id: string) => {
    return get().habits.find(h => h.id === id);
  },

  // Create new habit
  createHabit: async (data) => {
    set({ isLoading: true, error: null });

    try {
      const newHabit = await habitRepo.createHabit(data);
      await get().fetchHabits(); // Refresh all
      return newHabit;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create habit',
        isLoading: false,
      });
      throw error;
    }
  },

  // Update habit
  updateHabit: async (id, data) => {
    set({ isLoading: true, error: null });

    try {
      await habitRepo.updateHabit(id, data);
      await get().fetchHabits();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update habit',
        isLoading: false,
      });
      throw error;
    }
  },

  // Delete habit
  deleteHabit: async (id) => {
    set({ isLoading: true, error: null });

    try {
      await habitRepo.deleteHabit(id);
      set(state => ({
        habits: state.habits.filter(h => h.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete habit',
        isLoading: false,
      });
      throw error;
    }
  },

  // Complete habit for today
  completeHabit: async (id, data) => {
    try {
      const completion = await habitRepo.completeHabit(id, data);

      set(state => ({
        habits: state.habits.map(h =>
          h.id === id
            ? {
                ...h,
                completedToday: true,
                streak: {
                  ...h.streak,
                  currentStreak: h.streak.currentStreak + (h.completedToday ? 0 : 1),
                  lastCompletedDate: getTodayKey(),
                },
              }
            : h
        ),
        todayCompletions: [...state.todayCompletions, completion],
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to complete habit',
      });
      throw error;
    }
  },

  // Uncomplete habit for today
  uncompleteHabit: async (id) => {
    try {
      await habitRepo.uncompleteHabit(id);

      set(state => ({
        habits: state.habits.map(h =>
          h.id === id
            ? {
                ...h,
                completedToday: false,
                streak: {
                  ...h.streak,
                  currentStreak: Math.max(0, h.streak.currentStreak - 1),
                },
              }
            : h
        ),
        todayCompletions: state.todayCompletions.filter(c => c.habitId !== id),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to uncomplete habit',
      });
      throw error;
    }
  },

  // Reorder habits
  reorderHabits: async (orderedIds) => {
    try {
      await habitRepo.reorderHabits(orderedIds);

      set(state => {
        const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
        return {
          habits: [...state.habits].sort(
            (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
          ),
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to reorder habits',
      });
      throw error;
    }
  },

  // Refresh single habit
  refreshHabit: async (id) => {
    try {
      const habit = await habitRepo.getHabitById(id);
      if (!habit) return;

      const [streakData, completionRate] = await Promise.all([
        habitRepo.calculateStreak(id),
        habitRepo.calculateCompletionRate(id, 30),
      ]);

      const isCompletedToday = await habitRepo.isHabitCompletedToday(id);

      set(state => ({
        habits: state.habits.map(h =>
          h.id === id
            ? {
                ...habit,
                streak: {
                  habitId: id,
                  currentStreak: streakData.currentStreak,
                  longestStreak: streakData.longestStreak,
                  lastCompletedDate: streakData.lastCompletedDate,
                  totalCompletions: 0,
                  completionRate,
                },
                completedToday: isCompletedToday,
                completionRate,
              }
            : h
        ),
      }));
    } catch (error) {
      console.error('Failed to refresh habit:', error);
    }
  },

  // Computed: Get active habits
  getActiveHabits: () => {
    return get().habits.filter(h => h.isActive);
  },

  // Computed: Get today's habits (based on frequency/target days)
  getTodayHabits: () => {
    const today = new Date().getDay();
    return get().habits.filter(h => {
      if (!h.isActive) return false;
      if (h.frequency === 'daily') return true;
      if (h.frequency === 'weekly' && h.targetDays) {
        return (h.targetDays as number[]).includes(today);
      }
      return true;
    });
  },

  // Computed: Get completed today
  getCompletedToday: () => {
    return get().getTodayHabits().filter(h => h.completedToday);
  },

  // Computed: Get pending today
  getPendingToday: () => {
    return get().getTodayHabits().filter(h => !h.completedToday);
  },

  // Computed: Get streaks at risk
  getStreaksAtRisk: () => {
    return get().habits.filter(
      h => h.streak.currentStreak > 0 && !h.completedToday
    );
  },

  // Computed: Get high-impact habits (correlation > 0.7)
  getHighImpactHabits: () => {
    return get().habits.filter(
      h => h.correlation && h.correlation.correlationCoefficient > 0.7
    );
  },
}));
