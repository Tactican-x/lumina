import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { Modal } from '@/components/ui/Modal';
import { GoalForm } from '@/components/goals/GoalForm';
import { colors } from '@/constants/theme';
import { useGoals } from '@/hooks';

export default function AddGoalModal() {
  const { create, isLoading } = useGoals();

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title="Add Goal" variant="fullscreen">
        <GoalForm
          isLoading={isLoading}
          onCancel={() => router.back()}
          onSubmit={async (data) => {
            await create(data as any);
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