/**
 * InsightList Component
 * Displays a filterable list of insights
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { InsightCard, InsightCardCompact } from './InsightCard';
import { Insight, InsightType } from '@/types';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';

interface InsightListProps {
  insights: Insight[];
  onInsightPress?: (insight: Insight) => void;
  onInsightAction?: (insight: Insight) => void;
  onInsightDismiss?: (insight: Insight) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  compact?: boolean;
  emptyMessage?: string;
  filter?: InsightType | 'all';
  onFilterChange?: (filter: InsightType | 'all') => void;
  showFilters?: boolean;
}

const FILTER_OPTIONS: { value: InsightType | 'all'; label: string; emoji: string }[] = [
  { value: 'all', label: 'All', emoji: '✨' },
  { value: 'correlation', label: 'Patterns', emoji: '🔗' },
  { value: 'prediction', label: 'Predictions', emoji: '🔮' },
  { value: 'warning', label: 'Warnings', emoji: '⚠️' },
  { value: 'optimization', label: 'Tips', emoji: '💡' },
  { value: 'achievement', label: 'Wins', emoji: '🏆' },
];

export function InsightList({
  insights,
  onInsightPress,
  onInsightAction,
  onInsightDismiss,
  isLoading = false,
  onRefresh,
  compact = false,
  emptyMessage = 'No insights yet. Keep tracking to discover patterns!',
  filter = 'all',
  onFilterChange,
  showFilters = true,
}: InsightListProps) {
  const filteredInsights = filter === 'all'
    ? insights
    : insights.filter((i) => i.type === filter);

  const renderItem = ({ item }: { item: Insight }) => {
    if (compact) {
      return (
        <InsightCardCompact
          insight={item}
          onPress={() => onInsightPress?.(item)}
        />
      );
    }

    return (
      <InsightCard
        insight={item}
        onPress={() => onInsightPress?.(item)}
        onAction={() => onInsightAction?.(item)}
        onDismiss={() => onInsightDismiss?.(item)}
      />
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🧠</Text>
      <Text style={styles.emptyText}>{emptyMessage}</Text>
      <Text style={styles.emptySubtext}>
        Insights are generated as patterns emerge from your data
      </Text>
    </View>
  );

  const renderFilters = () => {
    if (!showFilters || !onFilterChange) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filters}
      >
        {FILTER_OPTIONS.map((option) => {
          const count = option.value === 'all'
            ? insights.length
            : insights.filter((i) => i.type === option.value).length;

          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onFilterChange(option.value)}
              style={[
                styles.filterChip,
                filter === option.value && styles.filterChipActive,
              ]}
            >
              <Text style={styles.filterEmoji}>{option.emoji}</Text>
              <Text
                style={[
                  styles.filterLabel,
                  filter === option.value && styles.filterLabelActive,
                ]}
              >
                {option.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.filterCount,
                    filter === option.value && styles.filterCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      filter === option.value && styles.filterCountTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {renderFilters()}

      <FlatList
        data={filteredInsights}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          filteredInsights.length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={colors.text.secondary}
            />
          ) : undefined
        }
      />
    </View>
  );
}

// Grouped insights by priority
export function PrioritizedInsightList({
  insights,
  ...props
}: Omit<InsightListProps, 'filter' | 'onFilterChange' | 'showFilters'>) {
  const critical = insights.filter((i) => i.priority === 'critical');
  const high = insights.filter((i) => i.priority === 'high');
  const medium = insights.filter((i) => i.priority === 'medium');
  const low = insights.filter((i) => i.priority === 'low');

  const sections = [
    { title: '🚨 Urgent', data: critical },
    { title: '⚡ Important', data: high },
    { title: '💡 Insights', data: medium },
    { title: '📝 Notes', data: low },
  ].filter((s) => s.data.length > 0);

  if (sections.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🧠</Text>
        <Text style={styles.emptyText}>No insights yet</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.prioritizedList}
      showsVerticalScrollIndicator={false}
    >
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.data.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onPress={() => props.onInsightPress?.(insight)}
              onAction={() => props.onInsightAction?.(insight)}
              onDismiss={() => props.onInsightDismiss?.(insight)}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filters: {
    maxHeight: 50,
  },
  filtersContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.brand.primary,
  },
  filterEmoji: {
    fontSize: 12,
  },
  filterLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  filterLabelActive: {
    color: '#fff',
    fontWeight: typography.weights.medium,
  },
  filterCount: {
    backgroundColor: colors.background.elevated,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: colors.text.tertiary,
  },
  filterCountTextActive: {
    color: '#fff',
  },
  list: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  prioritizedList: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    maxWidth: 280,
  },
});
