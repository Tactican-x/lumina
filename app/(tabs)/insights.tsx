import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { InsightCard } from '@/components/insights/InsightCard';
import { InsightEmptyState } from '@/components/insights/InsightEmptyState';
import { InsightFilterChips } from '@/components/insights/InsightFilterChips';

import { useHabits, useTasks, useEnergy } from '@/hooks';
import { usePersonalizedInsights } from '@/hooks/usePersonalizedInsights';
import { handleInsightAction } from '@/lib/intelligence/insightActions';
import type { Insight, Task } from '@/types';

export default function InsightsScreen() {
  const { pendingToday, streaksAtRisk } = useHabits();
  const tasks = useTasks();
  const energy = useEnergy();

  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);

  const refreshOverdue = async () => {
    try {
      const overdue = await tasks.getOverdue();
      setOverdueTasks(overdue);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshOverdue().catch(() => {});
  }, [tasks.todayTasks.length, tasks.tasks.length]);

  const dueHabitIds = useMemo(() => pendingToday.map((h) => h.id), [pendingToday]);
  const streakRiskHabitIds = useMemo(() => streaksAtRisk.map((h) => h.id), [streaksAtRisk]);

  const overdueTaskIds = useMemo(() => overdueTasks.map((t) => t.id), [overdueTasks]);
  const todayTaskIds = useMemo(() => tasks.todayTasks.map((t) => t.id), [tasks.todayTasks]);

  const openTaskCount = useMemo(
    () => tasks.pendingTasks.length + tasks.inProgressTasks.length,
    [tasks.pendingTasks.length, tasks.inProgressTasks.length]
  );

  const urgentTaskCount = useMemo(
    () => tasks.tasks.filter((t) => t.priority === 'urgent').length,
    [tasks.tasks]
  );

  const highTaskCount = useMemo(
    () => tasks.tasks.filter((t) => t.priority === 'high').length,
    [tasks.tasks]
  );

  const highEnergyOpenTaskCount = useMemo(
    () => tasks.tasks.filter((t) => t.energyRequired === 'high').length,
    [tasks.tasks]
  );

  const lowEnergyOpenTaskCount = useMemo(
    () => tasks.tasks.filter((t) => t.energyRequired === 'low').length,
    [tasks.tasks]
  );

  const openGoalIds = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks.tasks) if (t.goalId) set.add(t.goalId);
    for (const t of overdueTasks) if (t.goalId) set.add(t.goalId);
    return Array.from(set);
  }, [tasks.tasks, overdueTasks]);

  const {
    insights,
    forToday,
    restInsights,
    unreadCount,
    isLoading,
    refresh,
    activeFilter,
    setFilter,
    dismiss,

    helpful,
    notHelpful,
    getFeedbackValue,
    onShown,
    markAllAsRead,
  } = usePersonalizedInsights({
    energyScore: energy.currentScore,
    energyPhase: energy.currentPhase,

    dueHabitIds,
    streakRiskHabitIds,

    openTaskCount,
    todayTaskCount: tasks.todayTasks.length,
    overdueTaskCount: overdueTasks.length,

    urgentTaskCount,
    highTaskCount,
    highEnergyOpenTaskCount,
    lowEnergyOpenTaskCount,

    todayTaskIds,
    overdueTaskIds,

    openGoalIds,
  });

  useEffect(() => {
    forToday.forEach((i) => onShown(i.id));
  }, [forToday, onShown]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const haptic = useCallback(
    (type: 'light' | 'success' | 'warning' = 'light') => {
      if (Platform.OS === 'web') return;
      try {
        if (type === 'light') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (type === 'success') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      } catch {}
    },
    []
  );

  const handleAction = useCallback(
    (insight: Insight) => {
      haptic('light');

      const payload = insight.actionPayload as Record<string, unknown> | null;

      if (insight.actionType === 'habit' && payload?.habitId) {
        router.push({
          pathname: '/(modals)/habit-detail',
          params: { id: String(payload.habitId) },
        });
        return;
      }
      if (insight.actionType === 'goal' && payload?.goalId) {
        router.push({
          pathname: '/(modals)/goal-detail',
          params: { id: String(payload.goalId) },
        });
        return;
      }
      if (insight.actionType === 'task' && payload?.taskId) {
        router.push({
          pathname: '/(modals)/task-detail',
          params: { id: String(payload.taskId) },
        });
        return;
      }

      handleInsightAction(insight);
    },
    [haptic]
  );

  const handleHelpful = useCallback(
    (id: string) => {
      haptic('success');
      helpful(id);
    },
    [haptic, helpful]
  );

  const handleNotHelpful = useCallback(
    (id: string) => {
      haptic('warning');
      notHelpful(id);
    },
    [haptic, notHelpful]
  );

  const handleDismiss = useCallback(
    (id: string) => {
      haptic('light');
      dismiss(id);
    },
    [haptic, dismiss]
  );

  const handleMarkAllRead = useCallback(async () => {
    haptic('light');
    try {
      await markAllAsRead();
    } catch {
      // ignore
    }
  }, [haptic, markAllAsRead]);

  const unreadInsights = useMemo(
    () => restInsights.filter((i) => !i.isRead),
    [restInsights]
  );

  const readInsights = useMemo(
    () => restInsights.filter((i) => i.isRead),
    [restInsights]
  );

  const totalInsightCount = forToday.length + restInsights.length;
  const showEmptyState = totalInsightCount === 0 && !isLoading && activeFilter === 'all';

  const insightCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ins of insights) {
      counts[ins.type] = (counts[ins.type] ?? 0) + 1;
    }
    return counts;
  }, [insights]);

  const onRefresh = useCallback(async () => {
    await Promise.all([refresh(), refreshOverdue()]);
  }, [refresh, refreshOverdue]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Neural</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={styles.markAllRead}>Mark all read</Text>
          </TouchableOpacity>
        </View>

        <InsightFilterChips
          activeFilter={activeFilter}
          onFilterChange={setFilter}
          insightCounts={insightCounts}
        />

        {showEmptyState ? (
          <View style={styles.emptyWrapper}>
            <InsightEmptyState variant="no_insights" />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={onRefresh}
                tintColor={colors.brand.primary}
                colors={[colors.brand.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {forToday.length > 0 && (
              <View style={styles.groupSection}>
                <Text style={styles.groupTitle}>For today</Text>
                {forToday.map((i) => (
                  <InsightCard
                    key={i.id}
                    insight={i}
                    onPress={() =>
                      router.push({
                        pathname: '/(modals)/insight-detail',
                        params: { id: i.id },
                      })
                    }
                    onDismiss={() => handleDismiss(i.id)}
                    onAction={() => handleAction(i)}
                    onHelpful={() => handleHelpful(i.id)}
                    onNotHelpful={() => handleNotHelpful(i.id)}
                    feedbackValue={getFeedbackValue(i.id)}
                    showDate
                  />
                ))}
              </View>
            )}

            {unreadInsights.length > 0 && (
              <View style={styles.groupSection}>
                <Text style={styles.groupTitle}>New</Text>
                {unreadInsights.map((i) => (
                  <InsightCard
                    key={i.id}
                    insight={i}
                    onPress={() =>
                      router.push({
                        pathname: '/(modals)/insight-detail',
                        params: { id: i.id },
                      })
                    }
                    onDismiss={() => handleDismiss(i.id)}
                    onAction={() => handleAction(i)}
                    onHelpful={() => handleHelpful(i.id)}
                    onNotHelpful={() => handleNotHelpful(i.id)}
                    feedbackValue={getFeedbackValue(i.id)}
                    showDate
                  />
                ))}
              </View>
            )}

            {readInsights.length > 0 && (
              <View style={styles.groupSection}>
                <Text style={styles.groupTitle}>Earlier</Text>
                {readInsights.map((i) => (
                  <InsightCard
                    key={i.id}
                    insight={i}
                    onPress={() =>
                      router.push({
                        pathname: '/(modals)/insight-detail',
                        params: { id: i.id },
                      })
                    }
                    onDismiss={() => handleDismiss(i.id)}
                    onAction={() => handleAction(i)}
                    onHelpful={() => handleHelpful(i.id)}
                    onNotHelpful={() => handleNotHelpful(i.id)}
                    feedbackValue={getFeedbackValue(i.id)}
                    showDate
                  />
                ))}
              </View>
            )}

            {unreadInsights.length === 0 && readInsights.length === 0 && activeFilter !== 'all' && (
              <View style={styles.inlineEmpty}>
                <Text style={styles.inlineEmptyText}>No insights for this filter right now</Text>
                <TouchableOpacity onPress={() => setFilter('all')} activeOpacity={0.7}>
                  <Text style={styles.inlineEmptyAction}>Show all insights</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  unreadBadge: {
    backgroundColor: `${colors.brand.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.brand.primary,
  },
  markAllRead: {
    fontSize: typography.sizes.sm,
    color: colors.brand.primary,
    fontWeight: typography.weights.medium,
  },
  emptyWrapper: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  groupSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  groupTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  inlineEmpty: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  inlineEmptyText: {
    fontSize: typography.sizes.base,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  inlineEmptyAction: {
    fontSize: typography.sizes.sm,
    color: colors.brand.primary,
    fontWeight: typography.weights.semibold,
  },
});
