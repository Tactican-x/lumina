/**
 * Insight Store
 * Global state management for AI-generated insights
 *
 * v2: Added personalized ranking, feedback loop, shown tracking,
 *     re-ranking without DB refetch, and unread badge count.
 */

import { create } from 'zustand';
import { Insight, InsightType, InsightPriority } from '@/types';
import * as insightRepo from '@/db/repositories/insights';
import {
  rankInsights,
  type InsightPersonalizationContext,
} from '@/lib/intelligence/insightRanking';
import {
  getInsightFeedbackMap,
  getInsightShownMap,
  markInsightHelpful as markHelpfulApi,
  markInsightNotHelpful as markNotHelpfulApi,
  type InsightFeedbackMap,
  type InsightShownMap,
} from '@/lib/intelligence/insightFeedback';

// ==========================================
// TYPES
// ==========================================

interface InsightState {
  // Data
  insights: Insight[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;

  // Feedback & shown maps (for ranking)
  feedbackMap: InsightFeedbackMap;
  shownMap: InsightShownMap;

  // Personalization context (updated externally)
  personalizationCtx: InsightPersonalizationContext;

  // Filters
  activeFilter: InsightType | 'all';

  // Actions — data loading
  fetchInsights: (ctx?: Partial<InsightPersonalizationContext>, options?: { silent?: boolean }) => Promise<void>;
  refreshRanking: (ctx?: Partial<InsightPersonalizationContext>) => void;
  setPersonalizationCtx: (ctx: Partial<InsightPersonalizationContext>) => void;

  // Actions — insight state
  getInsightById: (id: string) => Insight | undefined;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissInsight: (id: string) => Promise<void>;

  // Actions — feedback
  markHelpful: (id: string) => Promise<void>;
  markNotHelpful: (id: string) => Promise<void>;
  getFeedbackValue: (id: string) => 1 | -1 | 0;

  // Actions — filter
  setFilter: (filter: InsightType | 'all') => void;

  // Computed
  getFilteredInsights: () => Insight[];
  getWarnings: () => Insight[];
  getTopInsight: () => Insight | null;
  getInsightsByType: (type: InsightType) => Insight[];
  getInsightsForHabit: (habitId: string) => Insight[];
  getInsightsForGoal: (goalId: string) => Insight[];
}

// ==========================================
// STORE
// ==========================================

export const useInsightStore = create<InsightState>((set, get) => ({
  // ---- Initial state ----
  insights: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  lastFetched: null,
  feedbackMap: {},
  shownMap: {},
  personalizationCtx: { now: Date.now() },
  activeFilter: 'all',

  // ==========================================
  // FETCH + RANK
  // Full DB load → rank with context → update state
  // ==========================================
  fetchInsights: async (ctx, options) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      set({ isLoading: true, error: null });
    }

    try {
      // 1. Load raw insights from DB
      const raw = await insightRepo.getAllInsights();

      // 2. Load feedback & shown maps in parallel
      const [feedbackMap, shownMap] = await Promise.all([
        getInsightFeedbackMap(),
        getInsightShownMap(),
      ]);

      // 3. Build personalization context
      const prevCtx = get().personalizationCtx;
      const fullCtx: InsightPersonalizationContext = {
        ...prevCtx,
        now: Date.now(),
        ...ctx,
      };

      // 4. Rank insights with full context
      const ranked = rankInsights(
        raw as Insight[],
        fullCtx,
        feedbackMap,
        shownMap
      );

      // 5. Count unread
      const unreadCount = ranked.filter(i => !i.isRead).length;

      set({
        insights: ranked,
        feedbackMap,
        shownMap,
        unreadCount,
        isLoading: false,
        lastFetched: new Date(),
        personalizationCtx: fullCtx,
      });
    } catch (error) {
        if (!silent) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch insights',
          isLoading: false,
        });
        }
    }
  },

  // ==========================================
  // RE-RANK WITHOUT DB FETCH
  // Use when context changes but insight data hasn't
  // (e.g., user completes a habit, energy changes, tab focus)
  // ==========================================
  refreshRanking: (ctx) => {
    const { insights, feedbackMap, shownMap, personalizationCtx } = get();
    if (insights.length === 0) return;

    const fullCtx: InsightPersonalizationContext = {
      ...personalizationCtx,
      now: Date.now(),
      ...ctx,
    };

    const ranked = rankInsights(insights, fullCtx, feedbackMap, shownMap);
    const unreadCount = ranked.filter(i => !i.isRead).length;

    set({
      insights: ranked,
      unreadCount,
      personalizationCtx: fullCtx,
    });
  },

  // ==========================================
  // CONTEXT UPDATE (without re-ranking)
  // Call this to store context, then refreshRanking when ready
  // ==========================================
  setPersonalizationCtx: (ctx) => {
    const fullCtx: InsightPersonalizationContext = {
      ...get().personalizationCtx,
      ...ctx,
      now: Date.now(),
    };
    set({ personalizationCtx: fullCtx });
  },

  // ==========================================
  // INSIGHT LOOKUP
  // ==========================================
  getInsightById: (id: string) => {
    return get().insights.find(i => i.id === id);
  },

  // ==========================================
  // MARK AS READ
  // ==========================================
  markAsRead: async (id: string) => {
    try {
      await insightRepo.markInsightAsRead(id);

      set(state => {
        const insights = state.insights.map(i =>
          i.id === id ? { ...i, isRead: true } : i
        );
        return {
          insights,
          unreadCount: insights.filter(i => !i.isRead).length,
        };
      });
    } catch (error) {
      console.error('[InsightStore] Failed to mark insight as read:', error);
    }
  },

  // ==========================================
  // MARK ALL AS READ
  // ==========================================
  markAllAsRead: async () => {
    try {
      await insightRepo.markAllInsightsAsRead();

      set(state => ({
        insights: state.insights.map(i => ({ ...i, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('[InsightStore] Failed to mark all insights as read:', error);
    }
  },

  // ==========================================
  // DISMISS
  // ==========================================
  dismissInsight: async (id: string) => {
    try {
      await insightRepo.dismissInsight(id);

      set(state => {
        const insights = state.insights.filter(i => i.id !== id);
        return {
          insights,
          unreadCount: insights.filter(i => !i.isRead).length,
        };
      });
    } catch (error) {
      console.error('[InsightStore] Failed to dismiss insight:', error);
    }
  },

  // ==========================================
  // FEEDBACK
  // After marking, re-rank since feedback affects scores
  // ==========================================
  markHelpful: async (id: string) => {
    try {
      const feedbackMap = await markHelpfulApi(id);
      set({ feedbackMap });

      // Re-rank since feedback changes scores
      get().refreshRanking();
    } catch (error) {
      console.error('[InsightStore] Failed to mark helpful:', error);
    }
  },

  markNotHelpful: async (id: string) => {
    try {
      const feedbackMap = await markNotHelpfulApi(id);
      set({ feedbackMap });

      // Re-rank since feedback changes scores
      get().refreshRanking();
    } catch (error) {
      console.error('[InsightStore] Failed to mark not helpful:', error);
    }
  },

  getFeedbackValue: (id: string) => {
    const fb = get().feedbackMap[id];
    if (!fb) return 0;
    return fb.helpful ?? 0;
  },

  // ==========================================
  // FILTER
  // ==========================================
  setFilter: (filter: InsightType | 'all') => {
    set({ activeFilter: filter });
  },

  // ==========================================
  // COMPUTED — FILTERED INSIGHTS
  // ==========================================
  getFilteredInsights: () => {
    const { insights, activeFilter } = get();
    if (activeFilter === 'all') return insights;
    return insights.filter(i => i.type === activeFilter);
  },

  // ==========================================
  // COMPUTED — WARNINGS (critical + high priority)
  // ==========================================
  getWarnings: () => {
    return get().insights.filter(
      i =>
        i.type === 'warning' &&
        (i.priority === 'critical' || i.priority === 'high')
    );
  },

  // ==========================================
  // COMPUTED — TOP INSIGHT
  // Now uses the ranking order (first item = highest scored)
  // ==========================================
  getTopInsight: () => {
    const insights = get().insights;
    if (insights.length === 0) return null;

    // insights are already sorted by ranking score (descending)
    // so the first one is the most relevant
    return insights[0];
  },

  // ==========================================
  // COMPUTED — BY TYPE
  // ==========================================
  getInsightsByType: (type: InsightType) => {
    return get().insights.filter(i => i.type === type);
  },

  // ==========================================
  // COMPUTED — FOR HABIT
  // ==========================================
  getInsightsForHabit: (habitId: string) => {
    return get().insights.filter(i => {
      const related = i.relatedHabitIds as string[] | null;
      return related?.includes(habitId);
    });
  },

  // ==========================================
  // COMPUTED — FOR GOAL
  // ==========================================
  getInsightsForGoal: (goalId: string) => {
    return get().insights.filter(i => {
      const related = i.relatedGoalIds as string[] | null;
      return related?.includes(goalId);
    });
  },
}));
