import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initializeDatabase } from '@/db/database';
import { seedIfNeeded } from '@/db/seed';
import { colors } from '@/constants/theme';
import { useUIStore } from '@/stores';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const hasCompletedOnboarding = useUIStore((s) => s.hasCompletedOnboarding);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        await initializeDatabase();
        await seedIfNeeded();
        if (!cancelled) setReady(true);
      } catch (e) {
        console.error('Boot failed:', e);
        if (!cancelled) setReady(true);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!hasCompletedOnboarding) {
      router.replace('/onboarding');
    }
  }, [ready, hasCompletedOnboarding]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <SafeAreaProvider>
        <StatusBar style="light" />

        {!ready ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Preparing Lumina…</Text>
          </View>
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background.primary },
            }}
          >
            <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.text.secondary,
  },
});