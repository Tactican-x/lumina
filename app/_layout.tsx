// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, AppState } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initializeDatabase } from '@/db/database';
import { seedIfNeeded } from '@/db/seed';
import { colors } from '@/constants/theme';
import { useUIStore } from '@/stores';

import { syncAllReminders } from '@/lib/notifications/reminders';
import { onAppLaunchInsightCleanup } from '@/lib/intelligence/dailyInsightsRunner';

// Focus completion -> Coach Inbox (MVP polish)
import { loadFocusSession, stopFocusSession, getRemainingSec } from '@/lib/coaching/focusSession';
import { postInboxNudge } from '@/lib/coaching/autopilotNudges';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  const hasCompletedOnboarding = useUIStore((s) => s.hasCompletedOnboarding);
  const hasHydrated = useUIStore((s) => s.hasHydrated);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        await initializeDatabase();
        await seedIfNeeded();
      } catch (e) {
        console.error('Boot failed:', e);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep reminders in sync after boot + hydration
  useEffect(() => {
    if (!ready || !hasHydrated) return;
    syncAllReminders().catch((e) => console.warn('syncAllReminders failed:', e));
  }, [ready, hasHydrated]);

  // Insight lifecycle cleanup on launch (expire, archive, delete stale insights)
  useEffect(() => {
    if (!ready || !hasHydrated) return;
    onAppLaunchInsightCleanup().catch((e) =>
      console.warn('Insight cleanup failed:', e)
    );
  }, [ready, hasHydrated]);

  useEffect(() => {
    if (!ready || !hasHydrated) return;

    if (!hasCompletedOnboarding) {
      router.replace('/onboarding');
    }
  }, [ready, hasHydrated, hasCompletedOnboarding]);

  // Root focus completion check
  useEffect(() => {
    if (!ready || !hasHydrated) return;

    let inFlight = false;

    const checkFocusCompletion = async () => {
      if (inFlight) return;
      inFlight = true;

      try {
        const s = await loadFocusSession();
        if (!s) return;
        if (s.endsAt == null) return;

        const remaining = getRemainingSec(s, Date.now());
        if (remaining > 0) return;

        await postInboxNudge(new Date(), {
          id: `focus_complete:${s.itemKey}:${s.startedAt}`,
          kind: 'focus_complete',
          title: 'Focus complete',
          message: s.title,
          createdAt: Date.now(),
        });

        await stopFocusSession();
      } catch (e) {
        console.warn('Focus completion check failed:', e);
      } finally {
        inFlight = false;
      }
    };

    checkFocusCompletion();

    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') checkFocusCompletion();
    });

    return () => sub.remove();
  }, [ready, hasHydrated]);

  const showLoading = !ready || !hasHydrated;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <SafeAreaProvider>
        <StatusBar style="light" />

        {showLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Preparing Lumina…</Text>
          </View>
        ) : (
          <Stack
            initialRouteName="index"
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background.primary },
            }}
          >
            {/* Hub / main menu */}
            <Stack.Screen name="index" />

            <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal' }} />

            {/* Existing Lumina module */}
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />

            {/* NEW: Money module (standalone) */}
            <Stack.Screen name="(money)" />

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