// app/(modals)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        contentStyle: { backgroundColor: colors.background.primary },
      }}
    />
  );
}