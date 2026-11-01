import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Brain, ChevronRight } from '@/components/ui/Lucide';
import { InsightCardCompact } from '@/components/insights/InsightCard';
import { useInsightStore } from '@/stores/insightStore';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

/**
 * Drop this into your home screen to show the top insight
 * and drive engagement to the Neural tab.
 *
 * Usage: <InsightPreviewWidget />
 */
export function InsightPreviewWidget() {
  const insights = useInsightStore(s => s.insights);
  const unreadCount = useInsightStore(s => s.unreadCount);

  // Show top 2 unread, or top 2 overall if all read
  const previews = insights
    .filter(i => !i.isRead)
    .slice(0, 2);

  const showPreviews = previews.length > 0
    ? previews
    : insights.slice(0, 1);

  if (insights.length === 0) return null;

  const handleNavigate = () => {
    router.push('/(tabs)/insights');
  };

  return (
    <View style={styles.container}>
      {/* Section header */}
      <TouchableOpacity
        onPress={handleNavigate}
        activeOpacity={0.7}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <Brain size={18} color={colors.brand.primary} />
          <Text style={styles.headerTitle}>Neural Insights</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.seeAll}>See all</Text>
          <ChevronRight size={14} color={colors.text.tertiary} />
        </View>
      </TouchableOpacity>

      {/* Preview cards */}
      {showPreviews.map(insight => (
        <InsightCardCompact
          key={insight.id}
          insight={insight}
          onPress={handleNavigate}
          showDate
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  badge: {
    backgroundColor: colors.brand.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAll: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
});