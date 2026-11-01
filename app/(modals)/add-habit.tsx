import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { Modal } from '@/components/ui/Modal';
import { HabitForm } from '@/components/habits/HabitForm';
import { colors } from '@/constants/theme';
import { useHabits } from '@/hooks';

export default function AddHabitModal() {
  const { create, isLoading } = useHabits();

  return (
    <View style={styles.screen}>
      <Modal
        visible
        onClose={() => router.back()}
        title="Add Habit"
        variant="fullscreen"
      >
        <HabitForm
          isLoading={isLoading}
          onCancel={() => router.back()}
          onSubmit={async (data) => {
            // HabitForm's data shape should match your store's create() input.
            // If TS complains here, paste HabitForm.tsx and I’ll align types perfectly.
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