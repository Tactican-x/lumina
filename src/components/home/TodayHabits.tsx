/**
 * TodayHabits Component
 * Quick view of today's habits with completion
 * Default behavior: show ALL habits (no 5-item limit)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronRight, Plus, CheckCircle2 } from '@/components/ui/Lucide';
import { HabitWithStats } from '@/stores/habitStore';
import { HabitCard } from '@/components/habits/HabitCard';
import { CircularProgress } from '@/components/ui/ProgressBar';
import { Card } from '@/components/ui/Card';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';

interface TodayHabitsProps {
  habits: HabitWithStats[];
  onHabitComplete: (habit: HabitWithStats) => void;
  onHabitPress: (habit: HabitWithStats) => void;

  /** Optional: enables swipe-left delete on each habit row */
  onHabitDelete?: (habit: HabitWithStats) => void;

  onViewAll: () => void;
  onAddHabit: () => void;

  /**
   * Optional limit.
   * If not provided, it shows all habits.
   */
  maxDisplay?: number;
}

export function TodayHabits({
  habits,
  onHabitComplete,
  onHabitPress,
  onHabitDelete,
  onViewAll,
  onAddHabit,

  // Default: show ALL habits
  maxDisplay = habits.length,
}: TodayHabitsProps) {
  const completed = habits.filter((h) => h.completedToday).length;
  const total = habits.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const displayHabits = habits.slice(0, maxDisplay);
  const remaining = Math.max(0, habits.length - maxDisplay);

  if (habits.length === 0) {
    return (
      <Card variant="default" padding="md">
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>No habits for today</Text>
          <Text style={styles.emptySubtitle}>Start building your routine</Text>
          <TouchableOpacity onPress={onAddHabit} style={styles.addButton}>
            <Plus size={16} color={colors.brand.primary} />
            <Text style={styles.addButtonText}>Add Habit</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Today's Habits</Text>
          <Text style={styles.subtitle}>
            {completed}/{total} completed
          </Text>
        </View>

        <View style={styles.headerRight}>
          <CircularProgress
            progress={progress}
            size={48}
            strokeWidth={5}
            color={progress === 100 ? colors.success.main : colors.brand.primary}
            showLabel
            labelSize={12}
          />
        </View>
      </View>

      {/* Habit list */}
      <View style={styles.habitList}>
        {displayHabits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            onPress={() => onHabitPress(habit)}
            onComplete={() => onHabitComplete(habit)}
            onDelete={onHabitDelete ? () => onHabitDelete(habit) : undefined}
            compact
            showStats={false}
          />
        ))}
      </View>

      {/* View all / remaining (will only show if you set a maxDisplay smaller than habits.length) */}
      {remaining > 0 && (
        <TouchableOpacity onPress={onViewAll} style={styles.viewAll}>
          <Text style={styles.viewAllText}>
            +{remaining} more habit{remaining > 1 ? 's' : ''}
          </Text>
          <ChevronRight size={16} color={colors.brand.primary} />
        </TouchableOpacity>
      )}

      {/* All complete celebration */}
      {progress === 100 && (
        <View style={styles.celebration}>
          <CheckCircle2 size={20} color={colors.success.main} />
          <Text style={styles.celebrationText}>All habits completed! Great job! 🎉</Text>
        </View>
      )}
    </View>
  );
}

// Compact horizontal scroll version (unchanged)
export function TodayHabitsCompact({
  habits,
  onHabitComplete,
  onHabitPress,
}: {
  habits: HabitWithStats[];
  onHabitComplete: (habit: HabitWithStats) => void;
  onHabitPress: (habit: HabitWithStats) => void;
}) {
  const completed = habits.filter((h) => h.completedToday).length;
  const total = habits.length;

  return (
    <View style={styles.compactContainer}>
      <View style={styles.compactHeader}>
        <Text style={styles.compactTitle}>Habits</Text>
        <Text style={styles.compactProgress}>
          {completed}/{total}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.compactScroll}
      >
        {habits.map((habit) => (
          <TouchableOpacity
            key={habit.id}
            onPress={() => onHabitPress(habit)}
            onLongPress={() => onHabitComplete(habit)}
            activeOpacity={0.7}
            style={[
              styles.compactHabit,
              habit.completedToday && styles.compactHabitCompleted,
              { borderColor: habit.color },
            ]}
          >
            <Text style={styles.compactHabitEmoji}>{getHabitEmoji(habit.icon)}</Text>
            {habit.completedToday && (
              <View style={[styles.compactCheck, { backgroundColor: habit.color }]}>
                <CheckCircle2 size={10} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function getHabitEmoji(icon: string): string {
  const emojiMap: Record<string, string> = {
    brain: '🧠',
    dumbbell: '💪',
    'book-open': '📚',
    droplets: '💧',
    'pen-line': '✍️',
    heart: '❤️',
    sun: '☀️',
    moon: '🌙',
    coffee: '☕',
    salad: '🥗',
    meditation: '🧘',
    music: '🎵',
  };
  return emojiMap[icon] || '✨';
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {},
  headerRight: {},
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  habitList: {
    gap: spacing.xs,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  viewAllText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.brand.primary,
  },
  celebration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.success.main}15`,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  celebrationText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.success.main,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: `${colors.brand.primary}15`,
    borderRadius: borderRadius.lg,
  },
  addButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.brand.primary,
  },

  // Compact version
  compactContainer: {},
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  compactTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  compactProgress: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  compactScroll: {
    gap: spacing.sm,
  },
  compactHabit: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  compactHabitCompleted: {
    backgroundColor: colors.background.elevated,
  },
  compactHabitEmoji: {
    fontSize: 22,
  },
  compactCheck: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
});