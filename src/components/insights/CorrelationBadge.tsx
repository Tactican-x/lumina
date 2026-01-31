/**
 * CorrelationBadge Component
 * Visual indicator for habit-performance correlations
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, Minus, Info } from '@/components/ui/Lucide';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';
import { formatCorrelation } from '@/utils/format';
import { getCorrelationColor } from '@/utils/colors';

interface CorrelationBadgeProps {
  correlation: number; // -1 to 1
  confidence?: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  showLabel?: boolean;
  onPress?: () => void;
}

export function CorrelationBadge({
  correlation,
  confidence,
  size = 'md',
  showValue = true,
  showLabel = false,
  onPress,
}: CorrelationBadgeProps) {
  const absCorrelation = Math.abs(correlation);
  const color = getCorrelationColor(correlation);
  const Icon = correlation > 0.1 ? TrendingUp : correlation < -0.1 ? TrendingDown : Minus;

  const { strength, label } = getCorrelationStrength(correlation);

  const sizes = {
    sm: { padding: spacing.xs, iconSize: 12, fontSize: 10 },
    md: { padding: spacing.sm, iconSize: 14, fontSize: 12 },
    lg: { padding: spacing.md, iconSize: 18, fontSize: 14 },
  };

  const s = sizes[size];

  const content = (
    <View
      style={[
        styles.container,
        { padding: s.padding, backgroundColor: `${color}20` },
      ]}
    >
      <Icon size={s.iconSize} color={color} />

      {showValue && (
        <Text style={[styles.value, { fontSize: s.fontSize, color }]}>
          {formatCorrelation(correlation)}
        </Text>
      )}

      {showLabel && (
        <Text style={[styles.label, { fontSize: s.fontSize - 2 }]}>
          {label}
        </Text>
      )}

      {confidence !== undefined && size === 'lg' && (
        <Text style={styles.confidence}>
          {Math.round(confidence)}% conf
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// High Impact Badge (for habits with strong correlations)
export function HighImpactBadge({
  correlation,
  onPress,
}: {
  correlation: number;
  onPress?: () => void;
}) {
  if (Math.abs(correlation) < 0.7) return null;

  const isPositive = correlation > 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.highImpactContainer}
    >
      <LinearGradient
        colors={
          isPositive
            ? [colors.success.main, colors.success.dark]
            : [colors.danger.main, colors.danger.dark]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.highImpactBadge}
      >
        <TrendingUp size={12} color="#fff" />
        <Text style={styles.highImpactText}>High Impact</Text>
        {onPress && <Info size={10} color="rgba(255,255,255,0.7)" />}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Correlation explanation card
export function CorrelationExplainer({
  correlation,
  habitName,
  confidence,
  sampleSize,
}: {
  correlation: number;
  habitName: string;
  confidence: number;
  sampleSize: number;
}) {
  const { strength, description } = getCorrelationStrength(correlation);
  const color = getCorrelationColor(correlation);
  const direction = correlation >= 0 ? 'positively' : 'negatively';

  return (
    <View style={styles.explainerContainer}>
      <View style={styles.explainerHeader}>
        <CorrelationBadge
          correlation={correlation}
          confidence={confidence}
          size="lg"
          showValue
        />
      </View>

      <Text style={styles.explainerTitle}>
        {habitName} {direction} correlates with your performance
      </Text>

      <Text style={styles.explainerDescription}>{description}</Text>

      <View style={styles.explainerStats}>
        <View style={styles.explainerStat}>
          <Text style={styles.explainerStatLabel}>Strength</Text>
          <Text style={[styles.explainerStatValue, { color }]}>{strength}</Text>
        </View>

        <View style={styles.explainerStat}>
          <Text style={styles.explainerStatLabel}>Confidence</Text>
          <Text style={styles.explainerStatValue}>{confidence}%</Text>
        </View>

        <View style={styles.explainerStat}>
          <Text style={styles.explainerStatLabel}>Data Points</Text>
          <Text style={styles.explainerStatValue}>{sampleSize}</Text>
        </View>
      </View>

      <View style={styles.explainerNote}>
        <Info size={14} color={colors.text.tertiary} />
        <Text style={styles.explainerNoteText}>
          Correlation shows relationship strength, not causation. More data improves accuracy.
        </Text>
      </View>
    </View>
  );
}

// Helper function
function getCorrelationStrength(r: number): {
  strength: string;
  label: string;
  description: string;
} {
  const abs = Math.abs(r);
  const direction = r >= 0 ? 'positive' : 'negative';

  if (abs >= 0.9) {
    return {
      strength: 'Very Strong',
      label: 'Very Strong',
      description: `This shows a very strong ${direction} relationship. When you do this habit, your performance almost always follows.`,
    };
  }
  if (abs >= 0.7) {
    return {
      strength: 'Strong',
      label: 'Strong',
      description: `This habit has a strong ${direction} relationship with your performance. It's likely a key driver.`,
    };
  }
  if (abs >= 0.5) {
    return {
      strength: 'Moderate',
      label: 'Moderate',
      description: `There's a moderate ${direction} relationship here. This habit influences your outcomes, but other factors also matter.`,
    };
  }
  if (abs >= 0.3) {
    return {
      strength: 'Weak',
      label: 'Weak',
      description: `This shows a weak ${direction} correlation. The relationship exists but isn't very strong.`,
    };
  }
  return {
    strength: 'Negligible',
    label: 'None',
    description: 'There\'s no significant relationship between this habit and your performance.',
  };
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  value: {
    fontWeight: typography.weights.semibold,
    fontFamily: 'monospace',
  },
  label: {
    color: colors.text.secondary,
  },
  confidence: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginLeft: spacing.xs,
  },

  // High impact badge
  highImpactContainer: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  highImpactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 4,
  },
  highImpactText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: '#fff',
  },

  // Explainer
  explainerContainer: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  explainerHeader: {
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  explainerTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  explainerDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  explainerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  explainerStat: {
    alignItems: 'center',
  },
  explainerStatLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  explainerStatValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  explainerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  explainerNoteText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    lineHeight: 16,
  },
});
