/**
 * HabitCard Component
 * Displays a single habit with completion status, streak, and stats
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Check,
  Flame,
  TrendingUp,
  Clock,
  Zap,
} from '@/components/ui/Lucide';
import { HabitWithStats } from '@/stores/habitStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';
import { useUIStore } from '@/stores';
import { formatStreak } from '@/utils/format';

interface HabitCardProps {
  habit: HabitWithStats;
  onPress?: () => void;
  onComplete?: () => void;
  showStats?: boolean;
  compact?: boolean;
}

export function HabitCard({
  habit,
  onPress,
  onComplete,
  showStats = true,
  compact = false,
}: HabitCardProps) {
  const enableHaptics = useUIStore(state => state.enableHaptics);

  const handleComplete = () => {
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onComplete?.();
  };

  const energyColors = {
    low: colors.success.main,
    medium: colors.warning.main,
    high: colors.danger.main,
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.compactContainer}
      >
        <View
          style={[
            styles.compactIcon,
            { backgroundColor: `${habit.color}20` },
          ]}
        >
          <Text style={styles.compactEmoji}>{getHabitEmoji(habit.icon)}</Text>
        </View>

        <View style={styles.compactContent}>
          <Text style={styles.compactName} numberOfLines={1}>
            {habit.name}
          </Text>
          {habit.streak.currentStreak > 0 && (
            <View style={styles.compactStreak}>
              <Flame size={12} color={colors.warning.main} />
              <Text style={styles.compactStreakText}>
                {habit.streak.currentStreak}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={handleComplete}
          style={[
            styles.compactCheckbox,
            habit.completedToday && styles.compactCheckboxCompleted,
            { borderColor: habit.color },
            habit.completedToday && { backgroundColor: habit.color },
          ]}
        >
          {habit.completedToday && <Check size={16} color="#fff" />}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <Card
      variant="default"
      onPress={onPress}
      padding="md"
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${habit.color}20` },
            ]}
          >
            <Text style={styles.emoji}>{getHabitEmoji(habit.icon)}</Text>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.name} numberOfLines={1}>
              {habit.name}
            </Text>
            
            <View style={styles.badges}>
              {habit.streak.currentStreak > 0 && (
                <View style={styles.streakBadge}>
                  <Flame size={12} color={colors.warning.main} />
                  <Text style={styles.streakText}>
                    {formatStreak(habit.streak.currentStreak)}
                  </Text>
                </View>
              )}

              {habit.correlation && habit.correlation.correlationCoefficient > 0.7 && (
                <Badge
                  label="High Impact"
                  variant="success"
                  size="sm"
                  icon={<TrendingUp size={10} color={colors.success.main} />}
                />
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleComplete}
          activeOpacity={0.7}
          style={[
            styles.checkbox,
            habit.completedToday && styles.checkboxCompleted,
          ]}
        >
          {habit.completedToday ? (
            <LinearGradient
              colors={[habit.color, `${habit.color}cc`]}
              style={styles.checkboxGradient}
            >
              <Check size={20} color="#fff" strokeWidth={3} />
            </LinearGradient>
          ) : (
            <View style={[styles.checkboxEmpty, { borderColor: habit.color }]} />
          )}
        </TouchableOpacity>
      </View>

      {showStats && (
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Clock size={14} color={colors.text.tertiary} />
            <Text style={styles.statText}>
              {habit.timeOfDay === 'anytime' ? 'Any time' : habit.timeOfDay}
            </Text>
          </View>

          <View style={styles.stat}>
            <Zap size={14} color={energyColors[habit.energyRequired]} />
            <Text style={styles.statText}>
              {habit.energyRequired} energy
            </Text>
          </View>

          <View style={styles.stat}>
            <TrendingUp size={14} color={colors.text.tertiary} />
            <Text style={styles.statText}>
              {habit.completionRate}% rate
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}

// Helper function to get emoji from icon name
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
    run: '🏃',
    meditation: '🧘',
    music: '🎵',
    code: '💻',
    paintbrush: '🎨',
    default: '✨',
  };

  return emojiMap[icon] || emojiMap.default;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  emoji: {
    fontSize: 22,
  },
  titleContainer: {
    flex: 1,
  },
  name: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.warning.main,
  },
  checkbox: {
    width: 36,
    height: 36,
    marginLeft: spacing.sm,
  },
  checkboxCompleted: {},
  checkboxGradient: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxEmpty: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  stats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textTransform: 'capitalize',
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  compactIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  compactEmoji: {
    fontSize: 16,
  },
  compactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    flex: 1,
  },
  compactStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  compactStreakText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.warning.main,
  },
  compactCheckbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactCheckboxCompleted: {},
});
