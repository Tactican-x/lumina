/**
 * StreakBadge Component
 * Visual indicator for habit streaks with animation
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Flame, Award, Zap, Crown } from '@/components/ui/Lucide';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';

interface StreakBadgeProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

export function StreakBadge({
  streak,
  size = 'md',
  showLabel = true,
  animated = true,
}: StreakBadgeProps) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (animated && streak > 0) {
      // Subtle pulse animation
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );

      // Subtle rotation for flame
      rotate.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 500 }),
          withTiming(5, { duration: 500 }),
          withTiming(0, { duration: 500 })
        ),
        -1,
        true
      );
    }
  }, [streak, animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  if (streak <= 0) {
    return null;
  }

  const { icon: Icon, color, label } = getStreakInfo(streak);
  const sizes = getSizes(size);

  return (
    <View style={[styles.container, sizes.container]}>
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <Icon size={sizes.icon} color={color} />
      </Animated.View>

      <Text style={[styles.count, sizes.text, { color }]}>
        {streak}
      </Text>

      {showLabel && (
        <Text style={[styles.label, sizes.label]}>
          {label}
        </Text>
      )}
    </View>
  );
}

// Large streak display for detail screens
export function StreakDisplay({
  currentStreak,
  longestStreak,
  completionRate,
}: {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
}) {
  const { color } = getStreakInfo(currentStreak);

  return (
    <View style={styles.displayContainer}>
      {/* Main streak */}
      <View style={styles.mainStreak}>
        <StreakBadge streak={currentStreak} size="lg" animated />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{longestStreak}</Text>
          <Text style={styles.statLabel}>Longest</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.stat}>
          <Text style={styles.statValue}>{completionRate}%</Text>
          <Text style={styles.statLabel}>Rate</Text>
        </View>
      </View>

      {/* Streak milestone */}
      {currentStreak > 0 && (
        <View style={styles.milestone}>
          <Text style={styles.milestoneText}>
            {getNextMilestone(currentStreak)}
          </Text>
        </View>
      )}
    </View>
  );
}

// Helper functions
function getStreakInfo(streak: number): {
  icon: typeof Flame;
  color: string;
  label: string;
} {
  if (streak >= 100) {
    return { icon: Crown, color: '#ffd700', label: 'Legendary' };
  }
  if (streak >= 30) {
    return { icon: Award, color: '#a855f7', label: 'Champion' };
  }
  if (streak >= 7) {
    return { icon: Zap, color: '#3b82f6', label: 'On Fire' };
  }
  return { icon: Flame, color: colors.warning.main, label: 'streak' };
}

function getSizes(size: 'sm' | 'md' | 'lg') {
  const sizes = {
    sm: {
      container: { gap: 2 },
      icon: 14,
      text: { fontSize: 12 },
      label: { fontSize: 10 },
    },
    md: {
      container: { gap: 4 },
      icon: 18,
      text: { fontSize: 16 },
      label: { fontSize: 12 },
    },
    lg: {
      container: { gap: 8 },
      icon: 32,
      text: { fontSize: 28 },
      label: { fontSize: 14 },
    },
  };
  return sizes[size];
}

function getNextMilestone(current: number): string {
  const milestones = [7, 14, 21, 30, 50, 75, 100, 150, 200, 365];
  const next = milestones.find((m) => m > current);

  if (!next) {
    return `🏆 ${current} days - Legendary status!`;
  }

  const remaining = next - current;
  return `${remaining} day${remaining > 1 ? 's' : ''} until ${next}-day milestone! 🎯`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {},
  count: {
    fontWeight: typography.weights.bold,
  },
  label: {
    color: colors.text.tertiary,
  },

  // Display
  displayContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  mainStreak: {
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.light,
  },
  milestone: {
    marginTop: spacing.lg,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  milestoneText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
