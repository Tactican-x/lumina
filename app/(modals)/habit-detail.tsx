import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StreakDisplay } from '@/components/habits/StreakBadge';
import { colors, spacing, typography } from '@/constants/theme';
import { useHabit } from '@/hooks';

export default function HabitDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habit, complete, uncomplete, remove, isLoading } = useHabit(String(id));

  if (!habit) {
    return (
      <View style={styles.screen}>
        <Modal visible onClose={() => router.back()} title="Habit">
          <Text style={{ color: colors.text.secondary }}>Habit not found.</Text>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title={habit.name}>
        <Card variant="default" padding="md" style={{ marginBottom: spacing.md }}>
          <Text style={styles.meta}>
            {habit.frequency} • {habit.timeOfDay} • {habit.energyRequired} energy
          </Text>
          <Text style={styles.desc}>{habit.description || 'No description'}</Text>
        </Card>

        <StreakDisplay
          currentStreak={habit.streak.currentStreak}
          longestStreak={habit.streak.longestStreak}
          completionRate={habit.completionRate}
        />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            title={habit.completedToday ? 'Undo Today' : 'Complete Today'}
            onPress={() => (habit.completedToday ? uncomplete() : complete())}
            gradient
          />
          <Button
            title="Delete"
            variant="danger"
            onPress={async () => {
              await remove();
              router.back();
            }}
            disabled={isLoading}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
  meta: { color: colors.text.tertiary, marginBottom: spacing.sm, textTransform: 'capitalize' },
  desc: { color: colors.text.secondary, lineHeight: 20 },
});
