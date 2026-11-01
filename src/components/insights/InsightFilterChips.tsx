import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { InsightType } from '@/types';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

interface InsightFilterChipsProps {
  activeFilter: InsightType | 'all';
  onFilterChange: (filter: InsightType | 'all') => void;
  insightCounts: Record<string, number>;
}

const filters: Array<{ key: InsightType | 'all'; label: string; emoji: string }> = [
  { key: 'all', label: 'All', emoji: '📊' },
  { key: 'achievement', label: 'Wins', emoji: '🏆' },
  { key: 'prediction', label: 'Predictions', emoji: '🔮' },
  { key: 'optimization', label: 'Tips', emoji: '⚡' },
  { key: 'pattern', label: 'Trends', emoji: '📈' },
  { key: 'correlation', label: 'Patterns', emoji: '🔗' },
  { key: 'warning', label: 'Warnings', emoji: '⚠️' },
];

export function InsightFilterChips({
  activeFilter,
  onFilterChange,
  insightCounts,
}: InsightFilterChipsProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {filters.map((f) => {
          const count =
            f.key === 'all'
              ? Object.values(insightCounts).reduce((s, c) => s + c, 0)
              : insightCounts[f.key] ?? 0;

          const isActive = activeFilter === f.key;

          // hide empty categories except all
          if (f.key !== 'all' && count === 0) return null;

          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => onFilterChange(f.key)}
              activeOpacity={0.8}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={styles.emoji}>{f.emoji}</Text>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {f.label}
              </Text>
              {count > 0 && (
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <Text style={[styles.countText, isActive && styles.countTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingBottom: spacing.sm,
  },
  container: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.dark,
    gap: 6,
  },
  chipActive: {
    backgroundColor: `${colors.brand.primary}18`,
    borderColor: colors.brand.primary,
  },
  emoji: {
    fontSize: 13,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  labelActive: {
    color: colors.brand.primary,
    fontWeight: typography.weights.semibold,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countBadgeActive: {
    backgroundColor: `${colors.brand.primary}25`,
  },
  countText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.text.tertiary,
  },
  countTextActive: {
    color: colors.brand.primary,
  },
});
