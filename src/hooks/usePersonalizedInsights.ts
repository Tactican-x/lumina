/**
 * usePersonalizedInsights
 * Personalized ranking + feedback + shown tracking (no backend)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInsightStore } from '@/stores/insightStore';
import type { Insight, InsightType } from '@/types';

import { rankInsights, type InsightPersonalizationContext } from '@/lib/intelligence/insightRanking';
import {
  getInsightFeedbackMap,
  getInsightShownMap,
  markInsightHelpful,
  markInsightNotHelpful,
  recordInsightShown,
  type InsightFeedbackMap,
  type InsightShownMap,
} from '@/lib/intelligence/insightFeedback';

export function usePersonalizedInsights(ctx: InsightPersonalizationContext = {}) {
  const store = useInsightStore();

  const [feedbackMap, setFeedbackMap] = useState<InsightFeedbackMap>({});
  const [shownMap, setShownMap] = useState<InsightShownMap>({});

  // local throttling to reduce AsyncStorage writes
  const lastShownWriteRef = useRef<Record<string, number>>({});

  // Auto-fetch on mount if not already loaded
  useEffect(() => {
    if (store.insights.length === 0 && !store.isLoading) {
      store.fetchInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load persisted meta (feedback + shown)
  useEffect(() => {
    (async () => {
      const [fb, shown] = await Promise.all([getInsightFeedbackMap(), getInsightShownMap()]);
      setFeedbackMap(fb);
      setShownMap(shown);
    })().catch(() => {});
  }, []);

  const ranked = useMemo(() => {
    return rankInsights(store.insights, ctx, feedbackMap, shownMap);
  }, [store.insights, ctx, feedbackMap, shownMap]);

  const filteredRanked = useMemo(() => {
    if (store.activeFilter === 'all') return ranked;
    return ranked.filter((i) => i.type === store.activeFilter);
  }, [ranked, store.activeFilter]);

  const forToday = useMemo(() => filteredRanked.slice(0, 3), [filteredRanked]);
  const restInsights = useMemo(() => filteredRanked.slice(3), [filteredRanked]);

  const topInsight = useMemo(() => ranked[0] ?? null, [ranked]);

  const getFeedbackValue = useCallback(
    (insightId: string) => feedbackMap[insightId]?.helpful ?? 0,
    [feedbackMap]
  );

  const helpful = useCallback(async (id: string) => {
    // optimistic update
    setFeedbackMap((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), helpful: 1, updatedAt: Date.now() } }));
    try {
      const next = await markInsightHelpful(id);
      setFeedbackMap(next);
    } catch {
      // ignore
    }
  }, []);

  const notHelpful = useCallback(async (id: string) => {
    setFeedbackMap((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), helpful: -1, updatedAt: Date.now() } }));
    try {
      const next = await markInsightNotHelpful(id);
      setFeedbackMap(next);
    } catch {
      // ignore
    }
  }, []);

  const onShown = useCallback(async (id: string) => {
    const now = Date.now();
    const last = lastShownWriteRef.current[id] ?? 0;

    // throttle per insight (5 min) to avoid spammy writes while scrolling
    if (now - last < 5 * 60 * 1000) return;
    lastShownWriteRef.current[id] = now;

    // optimistic update
    setShownMap((prev) => {
      const p = prev[id] ?? {};
      return {
        ...prev,
        [id]: {
          lastShownAt: now,
          shownCount7d: (p.shownCount7d ?? 0) + 1,
          updatedAt: now,
        },
      };
    });

    try {
      const next = await recordInsightShown(id);
      setShownMap(next);
    } catch {
      // ignore
    }
  }, []);

  // Keep API similar to useInsights where possible
  return {
    // Data
    insights: filteredRanked,          // full personalized + filtered list
    forToday,
    restInsights,
    topInsight,
    unreadCount: store.unreadCount,

    // State
    isLoading: store.isLoading,
    error: store.error,
    activeFilter: store.activeFilter as InsightType | 'all',

    // Personalization helpers
    getFeedbackValue,
    helpful,
    notHelpful,
    onShown,

    // Actions (backed by existing store/repo)
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