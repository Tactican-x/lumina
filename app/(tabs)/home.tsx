// app/(tabs)/home.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Plus, Settings } from '@/components/ui/Lucide';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, typography } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { DailyBriefing } from '@/components/home/DailyBriefing';
import { AutopilotCard } from '@/components/home/AutopilotCard';
import { EnergyPhaseDisplay } from '@/components/home/EnergyPhase';
import { TodayHabits } from '@/components/home/TodayHabits';
import { QuickInsight } from '@/components/home/QuickInsight';
import { InsightPreviewWidget } from '@/components/insights/InsightPreviewWidget';
import { EnergyChart } from '@/components/charts/EnergyChart';

import { useHabits, useEnergy, useTasks, useEnergyPatterns } from '@/hooks';
import { useHabitStore } from '@/stores/habitStore';
import { usePersonalizedInsights } from '@/hooks/usePersonalizedInsights';
import { useInsightStore } from '@/stores/insightStore';
import type { Task } from '@/types';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const { todayHabits, complete, uncomplete, remove, refresh: refreshHabits, todayProgress } = useHabits();
  const { currentScore, currentPhase, isEstimated, refresh: refreshEnergy } = useEnergy();
  const tasks = useTasks();
  const { hourlyPattern } = useEnergyPatterns();

  // Insight unread count for briefing
  const insightUnreadCount = useInsightStore((s) => s.unreadCount);

  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);

  const dueHabitIds = useMemo(
    () => todayHabits.filter((h) => !h.completedToday).map((h) => h.id),
    [todayHabits]
  );

  const streakRiskHabitIds = useMemo(
    () => todayHabits.filter((h) => h.streak.currentStreak > 0 && !h.completedToday).map((h) => h.id),
    [todayHabits]
  );

  const refreshOverdue = useCallback(async () => {
    try {
      const overdue = await tasks.getOverdue();
      setOverdueTasks(overdue);
    } catch {
      // ignore
    }
  }, [tasks]);

  useEffect(() => {
    refreshOverdue().catch(() => {});
  }, [refreshOverdue]);

  const overdueTaskIds = useMemo(() => overdueTasks.map((t) => t.id), [overdueTasks]);

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

  const todayTaskIds = useMemo(() => tasks.todayTasks.map((t) => t.id), [tasks.todayTasks]);

  const openGoalIds = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks.tasks) if (t.goalId) set.add(t.goalId);
    for (const t of overdueTasks) if (t.goalId) set.add(t.goalId);
    return Array.from(set);
  }, [tasks.tasks, overdueTasks]);

  const { topInsight, refresh: refreshInsights, onShown: recordShown } = usePersonalizedInsights({
    energyScore: currentScore,
    energyPhase: currentPhase,

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

  // Record home "top insight" as shown
  useEffect(() => {
    if (topInsight) recordShown(topInsight.id);
  }, [topInsight?.id, recordShown]);

  const lastFocusRefreshAt = useRef<number>(0);

  // Silent refresh — used on tab focus (no scroll jump)
  const refreshAllSilent = useCallback(async () => {
    await Promise.all([
      useHabitStore.getState().fetchHabits({ silent: true }),
      tasks.refresh(),
      refreshEnergy(),
      refreshInsights(),
      refreshOverdue(),
    ]);
  }, [tasks, refreshEnergy, refreshInsights, refreshOverdue]);

  // Explicit refresh — shows loading (pull-to-refresh / tap)
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshHabits(),
      tasks.refresh(),
      refreshEnergy(),
      refreshInsights(),
      refreshOverdue(),
    ]);
  }, [refreshHabits, tasks, refreshEnergy, refreshInsights, refreshOverdue]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const THROTTLE_MS = 15_000;

      if (now - lastFocusRefreshAt.current > THROTTLE_MS) {
        lastFocusRefreshAt.current = now;
        refreshAllSilent().catch(() => {});
      }
    }, [refreshAllSilent])
  );

  const onRefresh = async () => {
    await refreshAll();
  };

  const streaksAtRisk = todayHabits.filter(
    (h) => h.streak.currentStreak > 0 && !h.completedToday
  ).length;
  const chartData = hourlyPattern.map((h) => ({ hour: h.hour, score: h.avgScore }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: spacing.md, paddingBottom: insets.bottom + 110 },
        ]}
      >
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>Home</Text>

          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => router.push('/(modals)/coach-inbox')}
              style={styles.iconButton}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.text.secondary} />
              {/* Notification badge could go here too */}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(modals)/settings')}>
              <Settings color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(modals)/add-habit')}>
              <Plus color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        <DailyBriefing
          todayHabits={{ completed: todayProgress.completed, total: todayProgress.total }}
          todayTasks={{ completed: tasks.todayCounts.completed, total: tasks.todayCounts.total }}
          energyScore={currentScore}
          topInsight={topInsight?.summary}
          streaksAtRisk={streaksAtRisk}
          onPress={() => router.push('/(tabs)/insights')}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Autopilot</Text>
          <AutopilotCard />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Right now</Text>
          <EnergyPhaseDisplay
            phase={currentPhase}
            score={currentScore}
            isEstimated={isEstimated}
            onPress={() => router.push('/(tabs)/insights')}
            onLogEnergy={() => router.push('/(modals)/log-energy')}
            showTips
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your energy map</Text>
          <Card variant="default" padding="md">
            <EnergyChart data={chartData} showCurrentIndicator showLabels />
          </Card>
        </View>

        {/* Neural Insights section — shows top insight + preview widget */}
        <View style={styles.section}>
          {/* Quick insight card (your existing component) */}
          <QuickInsight
            insight={topInsight}
            onPress={() =>
              topInsight &&
              router.push({
                pathname: '/(modals)/insight-detail',
                params: { id: topInsight.id },
              })
            }
            onViewAll={() => router.push('/(tabs)/insights')}
          />

          {/* Preview widget showing 2 unread insights with "See all" */}
          <InsightPreviewWidget />
        </View>

        <View style={styles.section}>
          <TodayHabits
            habits={todayHabits}
            onHabitPress={(h) =>
              router.push({
                pathname: '/(modals)/habit-detail',
                params: { id: h.id },
              })
            }
            onHabitComplete={(h) => (h.completedToday ? uncomplete(h.id) : complete(h.id))}
            onHabitDelete={(h) => remove(h.id)}
            onViewAll={() => onRefresh()}
            onAddHabit={() => router.push('/(modals)/add-habit')}
          />
        </View>

        <TouchableOpacity style={styles.refreshHint} onPress={onRefresh}>
          <Text style={styles.refreshHintText}>Tap here to refresh</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  container: { flex: 1, backgroundColor: colors.background.primary },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  iconButton: {
    position: 'relative',
  },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  refreshHint: { alignItems: 'center', paddingVertical: spacing.sm },
  refreshHintText: { color: colors.text.tertiary, fontSize: typography.sizes.sm },
});
