/**
 * Insight Store
 * Global state management for AI-generated insights
 */

import { create } from 'zustand';
import { Insight, InsightType, InsightPriority } from '@/types';
import * as insightRepo from '@/db/repositories/insights';

interface InsightState {
  // Data
  insights: Insight[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;

  // Filters
  activeFilter: InsightType | 'all';
  
  // Actions
  fetchInsights: () => Promise<void>;
  getInsightById: (id: string) => Insight | undefined;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissInsight: (id: string) => Promise<void>;
  setFilter: (filter: InsightType | 'all') => void;
  
  // Computed
  getFilteredInsights: () => Insight[];
  getWarnings: () => Insight[];
  getTopInsight: () => Insight | null;
  getInsightsByType: (type: InsightType) => Insight[];
  getInsightsForHabit: (habitId: string) => Insight[];
  getInsightsForGoal: (goalId: string) => Insight[];
}

export const useInsightStore = create<InsightState>((set, get) => ({
  // Initial state
  insights: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  lastFetched: null,
  activeFilter: 'all',

  // Fetch all insights
  fetchInsights: async () => {
    set({ isLoading: true, error: null });

    try {
      const [insights, unread] = await Promise.all([
        insightRepo.getAllInsights(),
        insightRepo.getUnreadInsights(),
      ]);

      set({
        insights,
        unreadCount: unread.length,
        isLoading: false,
        lastFetched: new Date(),
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch insights',
        isLoading: false,
      });
    }
  },

  // Get insight by ID
  getInsightById: (id: string) => {
    return get().insights.find(i => i.id === id);
  },

  // Mark insight as read
  markAsRead: async (id: string) => {
    try {
      await insightRepo.markInsightAsRead(id);

      set(state => ({
        insights: state.insights.map(i =>
          i.id === id ? { ...i, isRead: true } : i
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark insight as read:', error);
    }
  },

  // Mark all as read
  markAllAsRead: async () => {
    try {
      await insightRepo.markAllInsightsAsRead();

      set(state => ({
        insights: state.insights.map(i => ({ ...i, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all insights as read:', error);
    }
  },

  // Dismiss insight
  dismissInsight: async (id: string) => {
    try {
      await insightRepo.dismissInsight(id);

      set(state => ({
        insights: state.insights.filter(i => i.id !== id),
      }));
    } catch (error) {
      console.error('Failed to dismiss insight:', error);
    }
  },

  // Set filter
  setFilter: (filter: InsightType | 'all') => {
    set({ activeFilter: filter });
  },

  // Computed: Get filtered insights
  getFilteredInsights: () => {
    const { insights, activeFilter } = get();
    if (activeFilter === 'all') return insights;
    return insights.filter(i => i.type === activeFilter);
  },

  // Computed: Get warnings
  getWarnings: () => {
    return get().insights.filter(
      i => i.type === 'warning' && (i.priority === 'critical' || i.priority === 'high')
    );
  },

  // Computed: Get top insight (highest priority, most recent)
  getTopInsight: () => {
    const insights = get().insights;
    if (insights.length === 0) return null;

    const priorityOrder: Record<InsightPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    const sorted = [...insights].sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted[0];
  },

  // Computed: Get insights by type
  getInsightsByType: (type: InsightType) => {
    return get().insights.filter(i => i.type === type);
  },

  // Computed: Get insights for habit
  getInsightsForHabit: (habitId: string) => {
    return get().insights.filter(i => {
      const related = i.relatedHabitIds as string[] | null;
      return related?.includes(habitId);
    });
  },

  // Computed: Get insights for goal
  getInsightsForGoal: (goalId: string) => {
    return get().insights.filter(i => {
      const related = i.relatedGoalIds as string[] | null;
      return related?.includes(goalId);
    });
  },
}));
