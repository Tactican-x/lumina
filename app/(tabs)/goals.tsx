import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { Plus } from '@/components/ui/Lucide';
import { colors, spacing, typography } from '@/constants/theme';
import { GoalList } from '@/components/goals/GoalList';
import { useGoals } from '@/hooks';

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const { activeGoals, refresh, isLoading } = useGoals();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Goals</Text>
          <TouchableOpacity onPress={() => router.push('/(modals)/add-goal')}>
            <Plus color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <GoalList
          goals={activeGoals}
          isLoading={isLoading}
          onRefresh={refresh}
          onGoalPress={(g) => router.push({ pathname: '/(modals)/goal-detail', params: { id: g.id } })}
        />

        <TouchableOpacity
          style={[
            styles.fab,
            { bottom: tabBarHeight + insets.bottom + spacing.md },
          ]}
          onPress={() => router.push('/(modals)/add-goal')}
          activeOpacity={0.9}
        >
          <Plus color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});