// app/(modals)/coach-inbox.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { formatRelativeTime } from '@/utils/date';

import {
  loadInboxNudges,
  dismissNudge,
  dismissAllNudges,
  snoozeNudges,
  clearSnooze,
  type AutopilotNudge,
} from '@/lib/coaching/autopilotNudges';

function iconFor(kind: AutopilotNudge['kind']) {
  switch (kind) {
    case 'next_up':
      return { name: 'play-outline' as const, color: colors.brand.primary };
    case 'streak_risk':
      return { name: 'flame-outline' as const, color: colors.warning.light };
    case 'digest':
    default:
      return { name: 'newspaper-outline' as const, color: colors.text.secondary };
  }
}

export default function CoachInboxModal() {
  const [nudges, setNudges] = useState<AutopilotNudge[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loadInboxNudges(new Date());
      setNudges(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onOpenNudge = useCallback((n: AutopilotNudge) => {
    // Simple routing: take user to the plan.
    router.push('/(modals)/autopilot-plan');
  }, []);

  const headerSubtitle = useMemo(() => {
    if (loading) return 'Loading…';
    if (nudges.length === 0) return 'No nudges yet today.';
    return `${nudges.length} nudge${nudges.length === 1 ? '' : 's'} today`;
  }, [loading, nudges.length]);

  return (
    <View style={styles.screen}>
      <Modal visible onClose={() => router.back()} title="Coach Inbox" variant="fullscreen">
        <View style={styles.content}>
          <Card variant="default" padding="md">
            <Text style={styles.subtitle}>{headerSubtitle}</Text>

            <View style={styles.headerActions}>
              <Button
                title="Snooze 4h"
                variant="ghost"
                onPress={async () => {
                  await snoozeNudges(new Date(), 240);
                  Alert.alert('Snoozed', 'New nudges are paused for 4 hours.');
                }}
              />
              <Button
                title="Unsnooze"
                variant="ghost"
                onPress={async () => {
                  await clearSnooze(new Date());
                  Alert.alert('Unsnoozed', 'Nudges can be delivered again (respecting cooldown).');
                }}
              />
              <Button
                title="Dismiss all"
                variant="ghost"
                onPress={() => {
                  Alert.alert('Dismiss all?', 'This hides all delivered nudges for today.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Dismiss',
                      style: 'destructive',
                      onPress: async () => {
                        await dismissAllNudges(new Date());
                        await refresh();
                      },
                    },
                  ]);
                }}
              />
              <Button title="Refresh" variant="ghost" onPress={refresh} />
            </View>
          </Card>

          {nudges.length === 0 ? (
            <Card variant="default" padding="md">
              <Text style={styles.muted}>
                Your coach will post here (max 3/day). Open Autopilot Plan to generate “Next up”.
              </Text>
              <View style={{ marginTop: spacing.sm }}>
                <Button title="Open Autopilot Plan" onPress={() => router.push('/(modals)/autopilot-plan')} />
              </View>
            </Card>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {nudges.map((n) => {
                const icon = iconFor(n.kind);
                return (
                  <TouchableOpacity
                    key={n.id}
                    activeOpacity={0.85}
                    onPress={() => onOpenNudge(n)}
                    style={styles.nudgeRow}
                  >
                    <View style={styles.icon}>
                      <Ionicons name={icon.name} size={18} color={icon.color} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.nudgeTitle}>{n.title}</Text>
                      <Text style={styles.nudgeMsg}>{n.message}</Text>
                      <Text style={styles.time}>{formatRelativeTime(new Date(n.createdAt))}</Text>
                    </View>

                    <TouchableOpacity
                      onPress={async () => {
                        await dismissNudge(new Date(), n.id);
                        await refresh();
                      }}
                      style={styles.dismissBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.dismissText}>Dismiss</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
  content: { gap: spacing.lg },

  subtitle: { color: colors.text.secondary, fontSize: typography.sizes.sm },

  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.sm },

  muted: { color: colors.text.tertiary, fontSize: typography.sizes.sm, lineHeight: 18 },

  nudgeRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  nudgeTitle: { color: colors.text.primary, fontWeight: typography.weights.semibold },
  nudgeMsg: { color: colors.text.secondary, fontSize: typography.sizes.sm, marginTop: 4, lineHeight: 18 },
  time: { color: colors.text.tertiary, fontSize: typography.sizes.xs, marginTop: 8 },

  dismissBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  dismissText: { color: colors.text.tertiary, fontSize: typography.sizes.sm },
});