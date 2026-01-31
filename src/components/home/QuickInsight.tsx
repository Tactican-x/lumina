/**
 * QuickInsight Component
 * Displays the most important insight on home screen
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Zap,
  GitBranch,
} from '@/components/ui/Lucide';
import { Insight, InsightType } from '@/types';
import { Card } from '@/components/ui/Card';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';

interface QuickInsightProps {
  insight: Insight | null;
  onPress?: () => void;
  onViewAll?: () => void;
}

const insightIcons: Record<InsightType, typeof Sparkles> = {
  correlation: GitBranch,
  pattern: TrendingUp,
  prediction: Sparkles,
  warning: AlertTriangle,
  optimization: Zap,
  achievement: Sparkles,
};

const insightGradients: Record<InsightType, [string, string]> = {
  correlation: ['#3b82f6', '#2563eb'],
  pattern: ['#10b981', '#059669'],
  prediction: ['#a855f7', '#9333ea'],
  warning: ['#f59e0b', '#d97706'],
  optimization: ['#06b6d4', '#0891b2'],
  achievement: ['#eab308', '#ca8a04'],
};

export function QuickInsight({ insight, onPress, onViewAll }: QuickInsightProps) {
  if (!insight) {
    return (
      <Card variant="default" padding="md" style={styles.emptyCard}>
        <View style={styles.emptyContent}>
          <Sparkles size={24} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No insights yet</Text>
          <Text style={styles.emptySubtitle}>
            Keep tracking to discover patterns
          </Text>
        </View>
      </Card>
    );
  }

  const Icon = insightIcons[insight.type];
  const gradient = insightGradients[insight.type];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={16} color={colors.text.tertiary} />
          <Text style={styles.headerTitle}>Latest Insight</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} style={styles.viewAll}>
            <Text style={styles.viewAllText}>View all</Text>
            <ChevronRight size={14} color={colors.brand.primary} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.iconContainer}>
            <Icon size={24} color="#fff" />
          </View>

          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={2}>
              {insight.title}
            </Text>
            <Text style={styles.summary} numberOfLines={2}>
              {insight.summary}
            </Text>
          </View>

          {insight.confidence && (
            <View style={styles.confidence}>
              <Text style={styles.confidenceValue}>
                {Math.round(insight.confidence)}%
              </Text>
              <Text style={styles.confidenceLabel}>confidence</Text>
            </View>
          )}

          <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// Multiple insights preview
export function InsightPreviewList({
  insights,
  onInsightPress,
  onViewAll,
}: {
  insights: Insight[];
  onInsightPress: (insight: Insight) => void;
  onViewAll: () => void;
}) {
  if (insights.length === 0) {
    return <QuickInsight insight={null} onViewAll={onViewAll} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={16} color={colors.text.tertiary} />
          <Text style={styles.headerTitle}>Insights</Text>
          {insights.filter((i) => !i.isRead).length > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {insights.filter((i) => !i.isRead).length}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onViewAll} style={styles.viewAll}>
          <Text style={styles.viewAllText}>View all</Text>
          <ChevronRight size={14} color={colors.brand.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.previewList}>
        {insights.slice(0, 3).map((insight) => {
          const Icon = insightIcons[insight.type];
          const gradient = insightGradients[insight.type];

          return (
            <TouchableOpacity
              key={insight.id}
              onPress={() => onInsightPress(insight)}
              activeOpacity={0.7}
              style={styles.previewItem}
            >
              <LinearGradient
                colors={gradient}
                style={styles.previewIcon}
              >
                <Icon size={14} color="#fff" />
              </LinearGradient>

              <View style={styles.previewContent}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {insight.title}
                </Text>
                <Text style={styles.previewSummary} numberOfLines={1}>
                  {insight.summary}
                </Text>
              </View>

              {!insight.isRead && <View style={styles.previewDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  unreadBadge: {
    backgroundColor: colors.danger.main,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    marginLeft: 4,
  },
  unreadCount: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: typography.sizes.sm,
    color: colors.brand.primary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: '#fff',
    marginBottom: 4,
  },
  summary: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  confidence: {
    alignItems: 'center',
  },
  confidenceValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  confidenceLabel: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },

  // Empty state
  emptyCard: {},
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },

  // Preview list
  previewList: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  previewIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContent: {
    flex: 1,
  },
  previewTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  previewSummary: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.primary,
  },
});
