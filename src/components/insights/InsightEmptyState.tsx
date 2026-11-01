import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Brain, Sparkles } from '@/components/ui/Lucide';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

interface InsightEmptyStateProps {
  variant: 'no_insights' | 'all_read' | 'cold_start';
  daysTracked?: number;
}

export function InsightEmptyState({ variant, daysTracked = 0 }: InsightEmptyStateProps) {
  const config = {
    no_insights: {
      icon: Brain,
      title: 'No Insights Yet',
      message:
        'Complete a few habits today and the intelligence engine will generate personalized insights for you.',
      hint: 'Insights are generated after 3+ habits are completed each day.',
    },
    all_read: {
      icon: Sparkles,
      title: 'All Caught Up!',
      message:
        'You\'ve read all your insights. New ones will appear tomorrow based on your activity.',
      hint: 'Tip: Check back after completing your habits for fresh analysis.',
    },
    cold_start: {
      icon: Brain,
      title: `Day ${daysTracked} of 7`,
      message:
        daysTracked < 3
          ? 'Keep tracking your habits! The AI needs a few more days to find patterns in your data.'
          : `Just ${7 - daysTracked} more day${7 - daysTracked > 1 ? 's' : ''} until personalized correlations and predictions unlock.`,
      hint: 'Every day you track makes your insights more accurate.',
    },
  };

  const c = config[variant];
  const Icon = c.icon;

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon size={32} color={colors.brand.primary} />
      </View>

      <Text style={styles.title}>{c.title}</Text>
      <Text style={styles.message}>{c.message}</Text>

      {variant === 'cold_start' && daysTracked > 0 && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round((daysTracked / 7) * 100)}%` },
            ]}
          />
        </View>
      )}

      <Text style={styles.hint}>{c.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.brand.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  progressBar: {
    width: '60%',
    height: 6,
    backgroundColor: colors.background.tertiary,
    borderRadius: 3,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand.primary,
    borderRadius: 3,
  },
  hint: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});