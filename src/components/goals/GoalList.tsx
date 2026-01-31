/**
 * GoalList Component
 * Displays a list of goals with filtering
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { GoalCard } from './GoalCard';
import { GoalWithStats, GoalCategory } from '@/types';
import { colors, spacing, typography } from '@/constants/theme';

interface GoalListProps {
  goals: GoalWithStats[];
  onGoalPress?: (goal: GoalWithStats) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  showMilestones?: boolean;
  compact?: boolean;
  emptyMessage?: string;
  sectionTitle?: string;
}

export function GoalList({
  goals,
  onGoalPress,
  isLoading = false,
  onRefresh,
  showMilestones = false,
  compact = false,
  emptyMessage = 'No goals yet. Set your first goal!',
  sectionTitle,
}: GoalListProps) {
  const renderItem = ({ item }: { item: GoalWithStats }) => (
    <GoalCard
      goal={item}
      onPress={() => onGoalPress?.(item)}
      showMilestones={showMilestones}
      compact={compact}
    />
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🎯</Text>
      <Text style={styles.emptyText}>{emptyMessage}</Text>
    </View>
  );

  const renderHeader = () => {
    if (!sectionTitle) return null;

    return <Text style={styles.sectionTitle}>{sectionTitle}</Text>;
  };

  return (
    <FlatList
      data={goals}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.container,
        goals.length === 0 && styles.emptyContainer,
      ]}
      ListHeaderComponent={renderHeader}
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
  );
}

// Categorized goal list
interface CategorizedGoalListProps extends Omit<GoalListProps, 'goals'> {
  goals: GoalWithStats[];
  showCategories?: boolean;
}

export function CategorizedGoalList({
  goals,
  showCategories = true,
  ...props
}: CategorizedGoalListProps) {
  if (!showCategories) {
    return <GoalList goals={goals} {...props} />;
  }

  // Group by category
  const groupedGoals = goals.reduce((acc, goal) => {
    const category = goal.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(goal);
    return acc;
  }, {} as Record<GoalCategory, GoalWithStats[]>);

  const categoryLabels: Record<GoalCategory, string> = {
    health: '❤️ Health',
    career: '💼 Career',
    finance: '💰 Finance',
    relationships: '👥 Relationships',
    learning: '📚 Learning',
    creativity: '🎨 Creativity',
    other: '✨ Other',
  };

  const categories = Object.keys(groupedGoals) as GoalCategory[];

  if (categories.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🎯</Text>
        <Text style={styles.emptyText}>
          {props.emptyMessage || 'No goals yet'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.categorizedContainer}>
      {categories.map((category) => (
        <View key={category} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>
            {categoryLabels[category]}
          </Text>
          {groupedGoals[category].map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onPress={() => props.onGoalPress?.(goal)}
              showMilestones={props.showMilestones}
              compact={props.compact}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  categorizedContainer: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
