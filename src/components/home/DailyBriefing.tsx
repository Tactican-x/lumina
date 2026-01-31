/**
 * DailyBriefing Component
 * Morning/evening briefing with personalized summary
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sun, Moon, Sparkles, AlertTriangle, CheckCircle2 } from '@/components/ui/Lucide';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';
import { getTimeOfDayGreeting, getCurrentHour } from '@/utils/date';

interface DailyBriefingProps {
  userName?: string;
  todayHabits: { completed: number; total: number };
  todayTasks: { completed: number; total: number };
  energyScore: number;
  topInsight?: string;
  streaksAtRisk: number;
  onPress?: () => void;
}

export function DailyBriefing({
  userName,
  todayHabits,
  todayTasks,
  energyScore,
  topInsight,
  streaksAtRisk,
  onPress,
}: DailyBriefingProps) {
  const greeting = getTimeOfDayGreeting();
  const hour = getCurrentHour();
  const isEvening = hour >= 18;
  const Icon = isEvening ? Moon : Sun;

  const habitProgress = todayHabits.total > 0
    ? Math.round((todayHabits.completed / todayHabits.total) * 100)
    : 0;

  const getGreetingMessage = () => {
    if (isEvening) {
      if (habitProgress >= 80) {
        return "Great day! You crushed it. 🎉";
      } else if (habitProgress >= 50) {
        return "Solid progress today. Well done!";
      } else {
        return "Tomorrow is a fresh start.";
      }
    } else {
      if (hour < 10) {
        return "Ready to make today count?";
      } else if (hour < 14) {
        return "You're doing great. Keep it up!";
      } else {
        return "Strong finish to the day!";
      }
    }
  };

  return (
    <Card variant="gradient" gradient={getGradient(hour)} onPress={onPress} padding="none">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon size={24} color="#fff" />
          </View>
          <View style={styles.greeting}>
            <Text style={styles.greetingText}>
              {greeting}{userName ? `, ${userName}` : ''}!
            </Text>
            <Text style={styles.message}>{getGreetingMessage()}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          {/* Habits */}
          <View style={styles.stat}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Habits</Text>
              <Text style={styles.statValue}>
                {todayHabits.completed}/{todayHabits.total}
              </Text>
            </View>
            <ProgressBar
              progress={habitProgress}
              height={6}
              color="rgba(255,255,255,0.9)"
              style={styles.progressBar}
            />
          </View>

          {/* Tasks */}
          <View style={styles.stat}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Tasks</Text>
              <Text style={styles.statValue}>
                {todayTasks.completed}/{todayTasks.total}
              </Text>
            </View>
            <ProgressBar
              progress={
                todayTasks.total > 0
                  ? (todayTasks.completed / todayTasks.total) * 100
                  : 0
              }
              height={6}
              color="rgba(255,255,255,0.9)"
              style={styles.progressBar}
            />
          </View>

          {/* Energy */}
          <View style={styles.stat}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Energy</Text>
              <Text style={styles.statValue}>{energyScore}%</Text>
            </View>
            <ProgressBar
              progress={energyScore}
              height={6}
              color="rgba(255,255,255,0.9)"
              style={styles.progressBar}
            />
          </View>
        </View>

        {/* Alerts/Insights */}
        {(streaksAtRisk > 0 || topInsight) && (
          <View style={styles.alerts}>
            {streaksAtRisk > 0 && (
              <View style={styles.alert}>
                <AlertTriangle size={14} color={colors.warning.light} />
                <Text style={styles.alertText}>
                  {streaksAtRisk} streak{streaksAtRisk > 1 ? 's' : ''} at risk today
                </Text>
              </View>
            )}

            {topInsight && (
              <View style={styles.alert}>
                <Sparkles size={14} color={colors.purple.light} />
                <Text style={styles.alertText} numberOfLines={1}>
                  {topInsight}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Card>
  );
}

// Get gradient based on time of day
function getGradient(hour: number): [string, string] {
  if (hour >= 5 && hour < 8) {
    // Early morning - warm sunrise
    return ['#f97316', '#ea580c'];
  } else if (hour >= 8 && hour < 12) {
    // Morning - energetic blue
    return ['#3b82f6', '#2563eb'];
  } else if (hour >= 12 && hour < 17) {
    // Afternoon - vibrant
    return ['#06b6d4', '#0891b2'];
  } else if (hour >= 17 && hour < 20) {
    // Evening - sunset
    return ['#a855f7', '#7c3aed'];
  } else {
    // Night - calm
    return ['#6366f1', '#4f46e5'];
  }
}

// Evening reflection variant
export function EveningReflection({
  habitsCompleted,
  habitsTotal,
  tasksCompleted,
  topAchievement,
  tomorrowForecast,
  onPress,
}: {
  habitsCompleted: number;
  habitsTotal: number;
  tasksCompleted: number;
  topAchievement?: string;
  tomorrowForecast: number;
  onPress?: () => void;
}) {
  const completionRate = habitsTotal > 0 ? Math.round((habitsCompleted / habitsTotal) * 100) : 0;

  return (
    <Card variant="gradient" gradient={['#6366f1', '#4f46e5']} onPress={onPress} padding="md">
      <View style={styles.reflectionHeader}>
        <Moon size={20} color="#fff" />
        <Text style={styles.reflectionTitle}>Today's Reflection</Text>
      </View>

      <View style={styles.reflectionStats}>
        <View style={styles.reflectionStat}>
          <Text style={styles.reflectionValue}>{habitsCompleted}/{habitsTotal}</Text>
          <Text style={styles.reflectionLabel}>Habits</Text>
        </View>
        <View style={styles.reflectionDivider} />
        <View style={styles.reflectionStat}>
          <Text style={styles.reflectionValue}>{tasksCompleted}</Text>
          <Text style={styles.reflectionLabel}>Tasks Done</Text>
        </View>
        <View style={styles.reflectionDivider} />
        <View style={styles.reflectionStat}>
          <Text style={styles.reflectionValue}>{tomorrowForecast}%</Text>
          <Text style={styles.reflectionLabel}>Tomorrow</Text>
        </View>
      </View>

      {topAchievement && (
        <View style={styles.achievement}>
          <CheckCircle2 size={14} color={colors.success.light} />
          <Text style={styles.achievementText}>{topAchievement}</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: '#fff',
    marginBottom: 2,
  },
  message: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  stats: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stat: {},
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  statValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
  progressBar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  alerts: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    gap: spacing.xs,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  alertText: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },

  // Evening reflection
  reflectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reflectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },
  reflectionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  reflectionStat: {
    alignItems: 'center',
  },
  reflectionValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  reflectionLabel: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  reflectionDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  achievementText: {
    fontSize: typography.sizes.sm,
    color: '#fff',
    flex: 1,
  },
});
