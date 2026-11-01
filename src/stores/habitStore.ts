/**
 * Habit Store
 * Global state management for habits using Zustand
 *
 * v2: Optimistic updates for complete/uncomplete — no visual jumping
 */

import { create } from 'zustand';
import { InteractionManager } from 'react-native';
import { Habit, HabitCompletion, HabitStreak, HabitCorrelation } from '@/types';
import * as habitRepo from '@/db/repositories/habits';
import { getTodayKey } from '@/utils/date';
import { generateDailyInsightsIfNeeded } from '@/lib/intelligence/dailyInsightsRunner';
import { useInsightStore } from '@/stores/insightStore';

import { syncAllReminders } from '@/lib/notifications/reminders';

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
  fetchHabits: (options?: { silent?: boolean }) => Promise<void>;
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
  fetchHabits: async (options) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      set({ isLoading: true, error: null });
    }

    try {
      const habits = await habitRepo.getActiveHabits();
      const todayCompletions = await habitRepo.getTodayCompletions();
      const completedIds = new Set(todayCompletions.map((c) => c.habitId));

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
            totalCompletions: 0,
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
      if (!silent) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch habits',
          isLoading: false,
        });
      }
    }
  },

  getHabitById: (id: string) => get().habits.find((h) => h.id === id),

  createHabit: async (data) => {
    set({ isLoading: true, error: null });

    try {
      const newHabit = await habitRepo.createHabit(data);
      await get().fetchHabits();

      syncAllReminders().catch(() => {});

      return newHabit;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create habit',
        isLoading: false,
      });
      throw error;
    }
  },

  updateHabit: async (id, data) => {
    set({ isLoading: true, error: null });

    try {
      await habitRepo.updateHabit(id, data);
      await get().fetchHabits();

      syncAllReminders().catch(() => {});
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update habit',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteHabit: async (id) => {
    // Optimistic delete
    const prevHabits = get().habits;
    const prevCompletions = get().todayCompletions;

    set((state) => ({
      habits: state.habits.filter((h) => h.id !== id),
      todayCompletions: state.todayCompletions.filter((c) => c.habitId !== id),
    }));

    try {
      await habitRepo.deleteHabit(id);
      syncAllReminders().catch(() => {});
    } catch (error) {
      // Revert on failure
      set({
        habits: prevHabits,
        todayCompletions: prevCompletions,
        error: error instanceof Error ? error.message : 'Failed to delete habit',
      });
      throw error;
    }
  },

  // Complete habit for today — SMOOTH OPTIMISTIC UPDATE
  completeHabit: async (id, data) => {
    // 1. Instant optimistic update — ONE set(), ONE re-render
    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === id
          ? {
              ...h,
              completedToday: true,
              streak: {
                ...h.streak,
                currentStreak: h.streak.currentStreak + 1,
              },
            }
          : h
      ),
      todayCompletions: [
        ...state.todayCompletions,
        {
          id: `optimistic-${id}-${Date.now()}`,
          habitId: id,
          date: getTodayKey(),
          completedAt: new Date(),
        } as HabitCompletion,
      ],
    }));

    // 2. DB write + background sync — deferred until animations finish
    InteractionManager.runAfterInteractions(async () => {
      try {
        await habitRepo.completeHabit(id, data as any);

        // Silent background sync — only updates if data actually differs
        const [todayCompletions, streakData, completionRate] = await Promise.all([
          habitRepo.getTodayCompletions(),
          habitRepo.calculateStreak(id),
          habitRepo.calculateCompletionRate(id, 30),
        ]);

        const current = get().habits.find((h) => h.id === id);
        if (
          current &&
          (current.streak.currentStreak !== streakData.currentStreak ||
            current.completionRate !== completionRate)
        ) {
          set((state) => ({
            todayCompletions,
            habits: state.habits.map((h) =>
              h.id === id
                ? {
                    ...h,
                    streak: {
                      ...h.streak,
                      currentStreak: streakData.currentStreak,
                      longestStreak: streakData.longestStreak,
                      lastCompletedDate: streakData.lastCompletedDate,
                      completionRate,
                    },
                    completionRate,
                  }
                : h
            ),
          }));
        }

        // Trigger insight generation silently
        generateDailyInsightsIfNeeded({ minDistinctHabitsCompletedToday: 3 })
          .then((result) => {
            if (result && result.createdCount > 0) {
              useInsightStore.getState().fetchInsights(undefined, { silent: true }).catch(() => {});
            }
          })
          .catch(() => {});
      } catch (error) {
        // Revert optimistic update on failure
        set((state) => ({
          habits: state.habits.map((h) =>
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
          todayCompletions: state.todayCompletions.filter(
            (c) => !(c.habitId === id && c.id.startsWith('optimistic-'))
          ),
          error: error instanceof Error ? error.message : 'Failed to complete habit',
        }));
      }
    });
  },

  // Uncomplete habit for today — SMOOTH OPTIMISTIC UPDATE
  uncompleteHabit: async (id) => {
    const prevHabit = get().habits.find((h) => h.id === id);
    const prevCompletions = [...get().todayCompletions];

    // 1. Instant optimistic update
    set((state) => ({
      habits: state.habits.map((h) =>
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
      todayCompletions: state.todayCompletions.filter((c) => c.habitId !== id),
    }));

    // 2. Defer DB work until animations finish
    InteractionManager.runAfterInteractions(async () => {
      try {
        await habitRepo.uncompleteHabit(id);

        const [todayCompletions, streakData, completionRate] = await Promise.all([
          habitRepo.getTodayCompletions(),
          habitRepo.calculateStreak(id),
          habitRepo.calculateCompletionRate(id, 30),
        ]);

        const current = get().habits.find((h) => h.id === id);
        if (current && current.streak.currentStreak !== streakData.currentStreak) {
          set((state) => ({
            todayCompletions,
            habits: state.habits.map((h) =>
              h.id === id
                ? {
                    ...h,
                    streak: {
                      ...h.streak,
                      currentStreak: streakData.currentStreak,
                      longestStreak: streakData.longestStreak,
                      lastCompletedDate: streakData.lastCompletedDate,
                      completionRate,
                    },
                    completionRate,
                  }
                : h
            ),
          }));
        }
      } catch (error) {
        if (prevHabit) {
          set({
            habits: get().habits.map((h) => (h.id === id ? prevHabit : h)),
            todayCompletions: prevCompletions,
            error: error instanceof Error ? error.message : 'Failed to uncomplete habit',
          });
        }
      }
    });
  },

  reorderHabits: async (orderedIds) => {
    // Optimistic reorder
    const prevHabits = [...get().habits];

    set((state) => {
      const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
      return {
        habits: [...state.habits].sort(
          (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
        ),
      };
    });

    try {
      await habitRepo.reorderHabits(orderedIds);
    } catch (error) {
      // Revert
      set({ habits: prevHabits });
      set({
        error: error instanceof Error ? error.message : 'Failed to reorder habits',
      });
      throw error;
    }
  },

  refreshHabit: async (id) => {
    try {
      const habit = await habitRepo.getHabitById(id);
      if (!habit) return;

      const [streakData, completionRate, isCompletedToday] = await Promise.all([
        habitRepo.calculateStreak(id),
        habitRepo.calculateCompletionRate(id, 30),
        habitRepo.isHabitCompletedToday(id),
      ]);

      set((state) => ({
        habits: state.habits.map((h) =>
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

  getActiveHabits: () => get().habits.filter((h) => h.isActive),

  getTodayHabits: () => {
    const today = new Date().getDay();
    return get().habits.filter((h) => {
      if (!h.isActive) return false;
      if (h.frequency === 'daily') return true;
      if (h.frequency === 'weekly' && h.targetDays) {
        return (h.targetDays as number[]).includes(today);
      }
      return true;
    });
  },

  getCompletedToday: () => get().getTodayHabits().filter((h) => h.completedToday),

  getPendingToday: () => get().getTodayHabits().filter((h) => !h.completedToday),

  getStreaksAtRisk: () =>
    get().habits.filter((h) => h.streak.currentStreak > 0 && !h.completedToday),

  getHighImpactHabits: () =>
    get().habits.filter(
      (h) => h.correlation && (h.correlation as any).correlationCoefficient > 0.7
    ),
}));
