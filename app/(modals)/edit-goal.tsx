import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { Modal } from '@/components/ui/Modal';
import { GoalForm } from '@/components/goals/GoalForm';
import { colors } from '@/constants/theme';
import { useGoals } from '@/hooks';

export default function EditGoalModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { goals, update, isLoading } = useGoals();

  const goal = goals.find((g) => g.id === id);

  if (!goal) {
    return (
      <View style={styles.screen}>
        <Modal visible onClose={() => router.back()} title="Edit Goal">
          <View />
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title="Edit Goal" variant="fullscreen">
        <GoalForm
          initialData={{
            title: goal.title,
            description: goal.description ?? undefined,
            category: goal.category,
            color: goal.color,
            targetValue: goal.targetValue ?? undefined,
            currentValue: goal.currentValue,
            unit: goal.unit ?? undefined,
            targetDate: goal.targetDate ?? undefined,
            status: goal.status,
          }}
          isLoading={isLoading}
          onCancel={() => router.back()}
          onSubmit={async (data) => {
            await update(id, data);
            router.back();
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
});