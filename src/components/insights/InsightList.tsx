/**
 * InsightList Component
 * Displays a filterable list of insights
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  type ViewToken,
} from 'react-native';
import { InsightCard, InsightCardCompact } from './InsightCard';
import { Insight, InsightType } from '@/types';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';

interface InsightListProps {
  insights: Insight[];
  insightsForCounts?: Insight[];

  onInsightPress?: (insight: Insight) => void;
  onInsightAction?: (insight: Insight) => void;
  onInsightDismiss?: (insight: Insight) => void;

  onInsightHelpful?: (insight: Insight) => void;
  onInsightNotHelpful?: (insight: Insight) => void;
  getFeedbackValue?: (insight: Insight) => 1 | -1 | 0;

  onInsightShown?: (insight: Insight) => void;

  isLoading?: boolean;
  onRefresh?: () => void;
  compact?: boolean;
  emptyMessage?: string;
  filter?: InsightType | 'all';
  onFilterChange?: (filter: InsightType | 'all') => void;
  showFilters?: boolean;

  ListHeaderComponent?: React.ReactElement | null;
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
  insightsForCounts,

  onInsightPress,
  onInsightAction,
  onInsightDismiss,

  onInsightHelpful,
  onInsightNotHelpful,
  getFeedbackValue,

  onInsightShown,

  isLoading = false,
  onRefresh,
  compact = false,
  emptyMessage = 'No insights yet. Keep tracking to discover patterns!',
  filter = 'all',
  onFilterChange,
  showFilters = true,

  ListHeaderComponent = null,
}: InsightListProps) {
  const countsBase = insightsForCounts ?? insights;

  const filteredInsights =
    filter === 'all' ? insights : insights.filter((i) => i.type === filter);

  // viewability -> shown tracking
  const onInsightShownRef = useRef(onInsightShown);
  useEffect(() => {
    onInsightShownRef.current = onInsightShown;
  }, [onInsightShown]);

  const sessionSeenRef = useRef<Set<string>>(new Set());

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      const cb = onInsightShownRef.current;
      if (!cb) return;

      for (const v of viewableItems) {
        const item = v.item as Insight | undefined;
        if (!item?.id) continue;

        if (sessionSeenRef.current.has(item.id)) continue;
        sessionSeenRef.current.add(item.id);

        cb(item);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 250,
  }).current;

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
        onHelpful={onInsightHelpful ? () => onInsightHelpful(item) : undefined}
        onNotHelpful={onInsightNotHelpful ? () => onInsightNotHelpful(item) : undefined}
        feedbackValue={getFeedbackValue ? getFeedbackValue(item) : 0}
      />
    );
  };

  const renderEmpty = () => {
    // Filter-specific empty state: keep chips visible, show small inline message
    if (filter !== 'all') {
      const option = FILTER_OPTIONS.find((f) => f.value === filter);
      const emoji = option?.emoji ?? '📊';

      const emptyCopy: Record<string, { title: string; action: string }> = {
        correlation: {
          title: 'No patterns found yet',
          action: 'Show all insights',
        },
        prediction: {
          title: 'No predictions right now',
          action: 'Show all insights',
        },
        warning: {
          title: 'No warnings right now',
          action: 'Show all insights',
        },
        optimization: {
          title: 'No tips right now',
          action: 'Show all insights',
        },
        achievement: {
          title: 'No wins yet',
          action: 'Show all insights',
        },
        pattern: {
          title: 'No trends right now',
          action: 'Show all insights',
        },
      };

      const copy = emptyCopy[String(filter)] ?? {
        title: 'No insights right now',
        action: 'Show all insights',
      };

      return (
        <View style={styles.filterEmpty}>
          <Text style={styles.filterEmptyEmoji}>{emoji}</Text>
          <Text style={styles.filterEmptyTitle}>{copy.title}</Text>
          <Text style={styles.filterEmptyText}>
            Try another filter or return to all insights.
          </Text>

          {onFilterChange && (
            <TouchableOpacity
              onPress={() => onFilterChange('all')}
              activeOpacity={0.8}
              style={styles.filterEmptyButton}
            >
              <Text style={styles.filterEmptyButtonText}>{copy.action}</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Full empty state only when "all" truly has no insights
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🧠</Text>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
        <Text style={styles.emptySubtext}>
          Insights are generated as patterns emerge from your data
        </Text>
      </View>
    );
  };

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
          const count =
            option.value === 'all'
              ? countsBase.length
              : countsBase.filter((i) => i.type === option.value).length;

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

  const showEmptyInList = filteredInsights.length === 0;

  return (
    <View style={styles.container}>
      {renderFilters()}

      <FlatList
        data={filteredInsights}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          showEmptyInList && filter === 'all' ? styles.emptyListContainer : null,
        ]}
        ListHeaderComponent={ListHeaderComponent}
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
        onViewableItemsChanged={onInsightShown ? onViewableItemsChanged : undefined}
        viewabilityConfig={onInsightShown ? viewabilityConfig : undefined}
      />
    </View>
  );
}

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
              onHelpful={
                props.onInsightHelpful ? () => props.onInsightHelpful!(insight) : undefined
              }
              onNotHelpful={
                props.onInsightNotHelpful ? () => props.onInsightNotHelpful!(insight) : undefined
              }
              feedbackValue={props.getFeedbackValue ? props.getFeedbackValue(insight) : 0}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

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
  emptyListContainer: {
    flexGrow: 1,
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

  filterEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterEmptyEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  filterEmptyTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  filterEmptyText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  filterEmptyButton: {
    marginTop: spacing.sm,
    backgroundColor: `${colors.brand.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.brand.primary}35`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  filterEmptyButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.brand.primary,
    fontWeight: typography.weights.semibold,
  },
});
