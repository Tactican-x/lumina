/**
 * HabitList Component
 * Displays a list of habits with sections
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { HabitCard } from './HabitCard';
import { HabitWithStats } from '@/stores/habitStore';
import { colors, spacing, typography } from '@/constants/theme';

interface HabitListProps {
  habits: HabitWithStats[];
  onHabitPress?: (habit: HabitWithStats) => void;
  onHabitComplete?: (habit: HabitWithStats) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  showStats?: boolean;
  compact?: boolean;
  emptyMessage?: string;
  sectionTitle?: string;
}

export function HabitList({
  habits,
  onHabitPress,
  onHabitComplete,
  isLoading = false,
  onRefresh,
  showStats = true,
  compact = false,
  emptyMessage = 'No habits yet. Create your first habit!',
  sectionTitle,
}: HabitListProps) {
  const renderItem = ({ item }: { item: HabitWithStats }) => (
    <HabitCard
      habit={item}
      onPress={() => onHabitPress?.(item)}
      onComplete={() => onHabitComplete?.(item)}
      showStats={showStats}
      compact={compact}
    />
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🌱</Text>
      <Text style={styles.emptyText}>{emptyMessage}</Text>
    </View>
  );

  const renderHeader = () => {
    if (!sectionTitle) return null;

    return (
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>
    );
  };

  return (
    <FlatList
      data={habits}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.container,
        habits.length === 0 && styles.emptyContainer,
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

// Grouped habit list (by time of day or completion status)
interface GroupedHabitListProps extends Omit<HabitListProps, 'habits'> {
  pendingHabits: HabitWithStats[];
  completedHabits: HabitWithStats[];
}

export function GroupedHabitList({
  pendingHabits,
  completedHabits,
  ...props
}: GroupedHabitListProps) {
  return (
    <View style={styles.groupedContainer}>
      {pendingHabits.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            To Do ({pendingHabits.length})
          </Text>
          {pendingHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onPress={() => props.onHabitPress?.(habit)}
              onComplete={() => props.onHabitComplete?.(habit)}
              showStats={props.showStats}
              compact={props.compact}
            />
          ))}
        </View>
      )}

      {completedHabits.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Completed ({completedHabits.length})
          </Text>
          {completedHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onPress={() => props.onHabitPress?.(habit)}
              onComplete={() => props.onHabitComplete?.(habit)}
              showStats={props.showStats}
              compact={props.compact}
            />
          ))}
        </View>
      )}

      {pendingHabits.length === 0 && completedHabits.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyText}>
            {props.emptyMessage || 'No habits yet'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    paddingBottom: 100, // Space for FAB
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  groupedContainer: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.lg,
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
