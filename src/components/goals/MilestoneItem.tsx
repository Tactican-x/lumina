/**
 * MilestoneItem Component
 * Single milestone display with completion toggle
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Check, Circle } from '@/components/ui/Lucide';
import * as Haptics from 'expo-haptics';
import { Milestone } from '@/types';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';
import { useUIStore } from '@/stores';
import { formatDisplayDate } from '@/utils/date';

interface MilestoneItemProps {
  milestone: Milestone;
  goalColor: string;
  onToggle?: () => void;
  onPress?: () => void;
  showDate?: boolean;
}

export function MilestoneItem({
  milestone,
  goalColor,
  onToggle,
  onPress,
  showDate = true,
}: MilestoneItemProps) {
  const enableHaptics = useUIStore((state) => state.enableHaptics);
  const scale = useSharedValue(1);

  const handleToggle = () => {
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    scale.value = withSpring(0.95, { damping: 15 }, () => {
      scale.value = withSpring(1);
    });

    onToggle?.();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        onPress={handleToggle}
        style={styles.checkbox}
        activeOpacity={0.7}
      >
        {milestone.isCompleted ? (
          <View style={[styles.checkboxFilled, { backgroundColor: goalColor }]}>
            <Check size={14} color="#fff" strokeWidth={3} />
          </View>
        ) : (
          <View style={[styles.checkboxEmpty, { borderColor: goalColor }]} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onPress}
        style={styles.content}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <Text
          style={[
            styles.title,
            milestone.isCompleted && styles.titleCompleted,
          ]}
          numberOfLines={2}
        >
          {milestone.title}
        </Text>

        {milestone.description && (
          <Text style={styles.description} numberOfLines={1}>
            {milestone.description}
          </Text>
        )}

        {showDate && milestone.targetDate && (
          <Text style={styles.date}>
            {milestone.isCompleted && milestone.completedAt
              ? `Completed ${formatDisplayDate(new Date(milestone.completedAt))}`
              : `Due ${formatDisplayDate(new Date(milestone.targetDate))}`}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: goalColor }]}>
          {milestone.targetValue}
        </Text>
      </View>
    </Animated.View>
  );
}

// Milestone list with progress line
interface MilestoneListProps {
  milestones: Milestone[];
  goalColor: string;
  currentValue: number;
  onToggle?: (milestone: Milestone) => void;
  onPress?: (milestone: Milestone) => void;
}

export function MilestoneTimeline({
  milestones,
  goalColor,
  currentValue,
  onToggle,
  onPress,
}: MilestoneListProps) {
  const sortedMilestones = [...milestones].sort(
    (a, b) => a.targetValue - b.targetValue
  );

  return (
    <View style={styles.timeline}>
      {sortedMilestones.map((milestone, index) => {
        const isReached = currentValue >= milestone.targetValue;
        const isLast = index === sortedMilestones.length - 1;

        return (
          <View key={milestone.id} style={styles.timelineItem}>
            {/* Progress line */}
            {!isLast && (
              <View style={styles.lineContainer}>
                <View
                  style={[
                    styles.line,
                    isReached && { backgroundColor: goalColor },
                  ]}
                />
              </View>
            )}

            {/* Milestone dot */}
            <View
              style={[
                styles.dot,
                isReached && { backgroundColor: goalColor, borderColor: goalColor },
                milestone.isCompleted && styles.dotCompleted,
              ]}
            >
              {milestone.isCompleted && (
                <Check size={10} color="#fff" strokeWidth={3} />
              )}
            </View>

            {/* Milestone content */}
            <TouchableOpacity
              onPress={() => onPress?.(milestone)}
              style={styles.timelineContent}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.timelineTitle,
                  milestone.isCompleted && styles.titleCompleted,
                ]}
              >
                {milestone.title}
              </Text>
              <Text style={styles.timelineValue}>
                {milestone.targetValue}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // MilestoneItem
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  checkbox: {
    marginRight: spacing.sm,
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    borderWidth: 2,
  },
  checkboxFilled: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.text.tertiary,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  date: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  valueContainer: {
    marginLeft: spacing.sm,
    paddingLeft: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: colors.border.dark,
  },
  value: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },

  // Timeline
  timeline: {
    paddingLeft: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  lineContainer: {
    position: 'absolute',
    left: 9,
    top: 20,
    bottom: -spacing.lg,
    width: 2,
  },
  line: {
    flex: 1,
    backgroundColor: colors.border.dark,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    zIndex: 1,
  },
  dotCompleted: {
    borderWidth: 0,
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  timelineTitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    flex: 1,
  },
  timelineValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
  },
});
