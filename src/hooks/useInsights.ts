/**
 * useInsights Hook
 * Convenient hook for insight-related operations
 */

import { useCallback, useEffect } from 'react';
import { useInsightStore } from '@/stores/insightStore';
import { InsightType } from '@/types';

export function useInsights() {
  const store = useInsightStore();

  // Auto-fetch on mount if not already loaded
  useEffect(() => {
    if (store.insights.length === 0 && !store.isLoading) {
      store.fetchInsights();
    }
  }, []);

  return {
    // Data
    insights: store.insights,
    filteredInsights: store.getFilteredInsights(),
    warnings: store.getWarnings(),
    topInsight: store.getTopInsight(),
    unreadCount: store.unreadCount,

    // State
    isLoading: store.isLoading,
    error: store.error,
    activeFilter: store.activeFilter,

    // Actions
    refresh: store.fetchInsights,
    getById: store.getInsightById,
    markAsRead: store.markAsRead,
    markAllAsRead: store.markAllAsRead,
    dismiss: store.dismissInsight,
    setFilter: store.setFilter,
    getByType: store.getInsightsByType,
    getForHabit: store.getInsightsForHabit,
    getForGoal: store.getInsightsForGoal,
  };
}

/**
 * Hook for a single insight
 */
export function useInsight(insightId: string) {
  const store = useInsightStore();
  const insight = store.getInsightById(insightId);

  const markAsRead = useCallback(() => {
    store.markAsRead(insightId);
  }, [insightId]);

  const dismiss = useCallback(() => {
    store.dismissInsight(insightId);
  }, [insightId]);

  // Auto-mark as read when viewing
  useEffect(() => {
    if (insight && !insight.isRead) {
      markAsRead();
    }
  }, [insight?.id]);

  return {
    insight,
    markAsRead,
    dismiss,
  };
}

/**
 * Hook for insight counts by type
 */
export function useInsightCounts() {
  const store = useInsightStore();

  return {
    total: store.insights.length,
    unread: store.unreadCount,
    byType: {
      correlation: store.getInsightsByType('correlation').length,
      pattern: store.getInsightsByType('pattern').length,
      prediction: store.getInsightsByType('prediction').length,
      warning: store.getInsightsByType('warning').length,
      optimization: store.getInsightsByType('optimization').length,
      achievement: store.getInsightsByType('achievement').length,
    },
  };
}
