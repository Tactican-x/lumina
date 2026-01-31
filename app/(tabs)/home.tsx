import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Plus, Settings } from '@/components/ui/Lucide';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { DailyBriefing } from '@/components/home/DailyBriefing';
import { EnergyPhaseDisplay } from '@/components/home/EnergyPhase';
import { TodayHabits } from '@/components/home/TodayHabits';
import { QuickInsight } from '@/components/home/QuickInsight';
import { EnergyChart } from '@/components/charts/EnergyChart';

import { useHabits, useEnergy, useInsights, useTasks, useEnergyPatterns } from '@/hooks';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const { todayHabits, complete, uncomplete, refresh: refreshHabits, todayProgress } = useHabits();
  const { currentScore, currentPhase, isEstimated, refresh: refreshEnergy } = useEnergy();
  const { topInsight, refresh: refreshInsights } = useInsights();
  const { todayTasks } = useTasks();
  const { hourlyPattern } = useEnergyPatterns();

  const onRefresh = async () => {
    await Promise.all([refreshHabits(), refreshEnergy(), refreshInsights()]);
  };

  const streaksAtRisk = todayHabits.filter((h) => h.streak.currentStreak > 0 && !h.completedToday).length;

  const chartData = hourlyPattern.map((h) => ({ hour: h.hour, score: h.avgScore }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + 110,
          },
        ]}
      >
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>Home</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
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
          todayTasks={{ completed: 0, total: todayTasks.length }}
          energyScore={currentScore}
          topInsight={topInsight?.summary}
          streaksAtRisk={streaksAtRisk}
          onPress={() => router.push('/(tabs)/insights')}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Right now</Text>
          <EnergyPhaseDisplay
            phase={currentPhase}
            score={currentScore}
            isEstimated={isEstimated}
            onPress={() => router.push('/(tabs)/insights')}
            onLogEnergy={() => router.push('/(modals)/settings')}
            showTips
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your energy map</Text>
          <Card variant="default" padding="md">
            <EnergyChart data={chartData} showCurrentIndicator showLabels />
          </Card>
        </View>

        <View style={styles.section}>
          <QuickInsight
            insight={topInsight}
            onPress={() =>
              topInsight &&
              router.push({ pathname: '/(modals)/insight-detail', params: { id: topInsight.id } })
            }
            onViewAll={() => router.push('/(tabs)/insights')}
          />
        </View>

        <View style={styles.section}>
          <TodayHabits
            habits={todayHabits}
            onHabitPress={(h) => router.push({ pathname: '/(modals)/habit-detail', params: { id: h.id } })}
            onHabitComplete={(h) => (h.completedToday ? uncomplete(h.id) : complete(h.id))}
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
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  refreshHint: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  refreshHintText: {
    color: colors.text.tertiary,
    fontSize: typography.sizes.sm,
  },
});