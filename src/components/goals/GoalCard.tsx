/**
 * GoalCard Component
 * Displays a goal with progress and milestones
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  CheckCircle2,
} from '@/components/ui/Lucide';
import { GoalWithStats, MomentumStatus } from '@/types';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';
import { formatNumber } from '@/utils/format';

interface GoalCardProps {
  goal: GoalWithStats;
  onPress?: () => void;
  showMilestones?: boolean;
  compact?: boolean;
}

export function GoalCard({
  goal,
  onPress,
  showMilestones = false,
  compact = false,
}: GoalCardProps) {
  const MomentumIcon = getMomentumIcon(goal.momentum);
  const momentumColor = getMomentumColor(goal.momentum);
  const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.compactContainer}
      >
        <View style={[styles.compactIcon, { backgroundColor: `${goal.color}20` }]}>
          <Target size={18} color={goal.color} />
        </View>

        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {goal.title}
          </Text>
          <ProgressBar
            progress={goal.progressPercentage}
            height={4}
            color={goal.color}
          />
        </View>

        <Text style={[styles.compactProgress, { color: goal.color }]}>
          {goal.progressPercentage}%
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <Card variant="default" onPress={onPress} padding="md" style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${goal.color}20` }]}>
          <Target size={24} color={goal.color} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.title} numberOfLines={2}>
            {goal.title}
          </Text>

          <View style={styles.badges}>
            {/* Momentum badge */}
            <View style={[styles.momentumBadge, { backgroundColor: `${momentumColor}20` }]}>
              <MomentumIcon size={12} color={momentumColor} />
              <Text style={[styles.momentumText, { color: momentumColor }]}>
                {formatMomentum(goal.momentum)}
              </Text>
            </View>

            {/* On track / At risk badge */}
            {!goal.isOnTrack && goal.daysRemaining && goal.daysRemaining > 0 && (
              <Badge label="At Risk" variant="warning" size="sm" />
            )}
          </View>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressValue}>
            {goal.targetValue
              ? `${formatNumber(goal.currentValue)} / ${formatNumber(goal.targetValue)} ${goal.unit || ''}`
              : `${goal.progressPercentage}%`}
          </Text>
        </View>

        <ProgressBar
          progress={goal.progressPercentage}
          height={8}
          gradient={[goal.color, `${goal.color}cc`]}
          showLabel={false}
        />
      </View>

      {/* Footer stats */}
      <View style={styles.footer}>
        {goal.daysRemaining !== undefined && goal.daysRemaining > 0 && (
          <View style={styles.stat}>
            <Calendar size={14} color={colors.text.tertiary} />
            <Text style={styles.statText}>
              {goal.daysRemaining} day{goal.daysRemaining !== 1 ? 's' : ''} left
            </Text>
          </View>
        )}

        {goal.milestones.length > 0 && (
          <View style={styles.stat}>
            <CheckCircle2 size={14} color={colors.text.tertiary} />
            <Text style={styles.statText}>
              {completedMilestones}/{goal.milestones.length} milestones
            </Text>
          </View>
        )}

        {goal.successProbability !== undefined && (
          <View style={styles.stat}>
            <Target size={14} color={colors.text.tertiary} />
            <Text style={styles.statText}>
              {goal.successProbability}% likely
            </Text>
          </View>
        )}
      </View>

      {/* Milestones (optional) */}
      {showMilestones && goal.milestones.length > 0 && (
        <View style={styles.milestones}>
          {goal.milestones.slice(0, 3).map((milestone) => (
            <View
              key={milestone.id}
              style={[
                styles.milestone,
                milestone.isCompleted && styles.milestoneCompleted,
              ]}
            >
              <View
                style={[
                  styles.milestoneDot,
                  milestone.isCompleted && { backgroundColor: goal.color },
                ]}
              />
              <Text
                style={[
                  styles.milestoneText,
                  milestone.isCompleted && styles.milestoneTextCompleted,
                ]}
                numberOfLines={1}
              >
                {milestone.title}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

// Helper functions
function getMomentumIcon(momentum: MomentumStatus) {
  switch (momentum) {
    case 'accelerating':
      return TrendingUp;
    case 'slowing':
    case 'stalled':
      return TrendingDown;
    default:
      return Minus;
  }
}

function getMomentumColor(momentum: MomentumStatus): string {
  switch (momentum) {
    case 'accelerating':
      return colors.success.main;
    case 'slowing':
      return colors.warning.main;
    case 'stalled':
      return colors.danger.main;
    default:
      return colors.text.tertiary;
  }
}

function formatMomentum(momentum: MomentumStatus): string {
  return momentum.charAt(0).toUpperCase() + momentum.slice(1);
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: 6,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  momentumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
  },
  momentumText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  progressSection: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  progressValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  },
  milestones: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  milestoneCompleted: {
    opacity: 0.7,
  },
  milestoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.medium,
    marginRight: spacing.sm,
  },
  milestoneText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  milestoneTextCompleted: {
    textDecorationLine: 'line-through',
    color: colors.text.tertiary,
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
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  compactContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  compactTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    marginBottom: 4,
  },
  compactProgress: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
